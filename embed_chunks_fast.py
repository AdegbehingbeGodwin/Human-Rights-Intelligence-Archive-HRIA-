"""
Fast Chunk Embedding Script for HRIA RAG System
Uses all-MiniLM-L6-v2 (5x faster than bge-large) with parallel processing
Expected time: ~15-30 minutes for 85k chunks (vs 4+ hours with original)
"""

import os
import glob
import time
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
from pinecone import Pinecone, ServerlessSpec
from langchain_huggingface import HuggingFaceEmbeddings
import torch
import rag_utils

# Load environment variables
load_dotenv()

# Configuration - Fast settings
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384  # Smaller = faster
PINECONE_INDEX_NAME = "hria-fast"  # New index for 384-dim vectors
BATCH_SIZE = 500  # 10x larger than original
UPLOAD_WORKERS = 4  # Parallel upload threads


def get_device():
    """Auto-detect GPU or use CPU"""
    if torch.cuda.is_available():
        print("GPU detected! Using CUDA for faster embeddings")
        return 'cuda'
    else:
        print("Using CPU for embeddings")
        return 'cpu'


def get_embeddings():
    """Initialize the fast embedding model"""
    device = get_device()
    embedding = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL_NAME,
        model_kwargs={'device': device, 'trust_remote_code': True},
        encode_kwargs={'normalize_embeddings': True, 'batch_size': 64}
    )
    return embedding


def parse_chunk_file(file_path):
    """Parse a chunk file and extract metadata and content"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        parts = content.split('=' * 50)
        
        if len(parts) < 2:
            return None, None
        
        metadata_section = parts[0].strip()
        text_content = parts[1].strip()
        
        metadata = {}
        for line in metadata_section.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                metadata[key.strip().lower()] = value.strip()
        
        return text_content, metadata
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return None, None


def load_all_chunks(chunks_dir):
    """Load all chunk files with progress tracking"""
    chunk_files = glob.glob(os.path.join(chunks_dir, "chunk_*.txt"))
    chunk_files.sort()
    
    total = len(chunk_files)
    print(f" Found {total:,} chunk files")
    
    chunks = []
    metadata_list = []
    
    for i, file_path in enumerate(chunk_files):
        text, metadata = parse_chunk_file(file_path)
        
        if text and metadata:
            chunks.append(text)
            metadata_list.append(metadata)
        
        if (i + 1) % 10000 == 0:
            print(f"   Loaded {i + 1:,}/{total:,} chunks...")
    
    print(f"Successfully loaded {len(chunks):,} chunks")
    return chunks, metadata_list


def create_pinecone_index(pc, index_name, dimension):
    """Create Pinecone index if it doesn't exist"""
    existing_indexes = [idx.name for idx in pc.list_indexes()]
    
    if index_name in existing_indexes:
        print(f" Index '{index_name}' already exists")
        # Delete and recreate if dimension mismatch
        desc = pc.describe_index(index_name)
        if desc.dimension != dimension:
            print(f" Dimension mismatch. Deleting old index...")
            pc.delete_index(index_name)
            existing_indexes.remove(index_name)
    
    if index_name not in existing_indexes:
        print(f" Creating new index '{index_name}' with dimension {dimension}...")
        pc.create_index(
            name=index_name,
            dimension=dimension,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
        # Wait for index to be ready
        while not pc.describe_index(index_name).status['ready']:
            print("   Waiting for index to be ready...")
            time.sleep(2)
    
    return pc.Index(index_name)


def upload_batch(index, batch_data, batch_num, total_batches):
    """Upload a single batch to Pinecone with simple retry"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            index.upsert(vectors=batch_data)
            return batch_num, True, None
        except Exception as e:
            if attempt == max_retries - 1:
                return batch_num, False, str(e)
            time.sleep(2 * (attempt + 1))  # Exponential backoff
    return batch_num, False, "Unknown error"


def main():
    """Main function with optimized embedding pipeline"""
    
    chunks_dir = os.path.join("data", "chunks")
    
    if not os.path.exists(chunks_dir):
        print(f" Error: Chunks directory not found at {chunks_dir}")
        return
    
    print("=" * 60)
    print("FAST EMBEDDING PIPELINE")
    print(f"   Model: {EMBEDDING_MODEL_NAME}")
    print(f"   Dimension: {EMBEDDING_DIMENSION}")
    print(f"   Batch size: {BATCH_SIZE}")
    print("=" * 60)
    
    # Step 1: Load chunks
    start_time = time.time()
    print("\n Step 1: Loading chunks...")
    chunks, metadata_list = load_all_chunks(chunks_dir)
    
    if not chunks:
        print(" No chunks found!")
        return
    
    load_time = time.time() - start_time
    print(f"   Load time: {load_time:.1f}s")
    
    # Step 2: Initialize embedding model
    print("\n Step 2: Initializing embedding model...")
    embed_start = time.time()
    embedding_model = get_embeddings()
    print(f"   Model loaded in {time.time() - embed_start:.1f}s")
    
    # Step 3: Generate or Load embeddings
    cache_file = "data/embeddings_cache.pkl"
    os.makedirs("data", exist_ok=True)
    
    if os.path.exists(cache_file):
        import pickle
        print(f"\n📂 Loading cached embeddings from {cache_file}...")
        with open(cache_file, 'rb') as f:
            all_embeddings = pickle.load(f)
        print(f"   Loaded {len(all_embeddings):,} embeddings from cache")
        
        # Verify count matches
        if len(all_embeddings) != len(chunks):
            print(f"   ⚠️ Cache size mismatch ({len(all_embeddings)} vs {len(chunks)}). Regnerating...")
            all_embeddings = None
    else:
        all_embeddings = None

    if all_embeddings is None:
        print(f"\n🔢 Step 3: Generating embeddings for {len(chunks):,} chunks...")
        print(f"   Processing in batches of {BATCH_SIZE}...")
        
        all_embeddings = []
        total_batches = (len(chunks) + BATCH_SIZE - 1) // BATCH_SIZE
        
        for i in range(0, len(chunks), BATCH_SIZE):
            batch_num = i // BATCH_SIZE + 1
            batch_chunks = chunks[i:i + BATCH_SIZE]
            
            batch_embeddings = embedding_model.embed_documents(batch_chunks)
            all_embeddings.extend(batch_embeddings)
            
            if batch_num % 10 == 0 or batch_num == total_batches:
                elapsed = time.time() - embed_start
                rate = len(all_embeddings) / elapsed
                remaining = (len(chunks) - len(all_embeddings)) / rate if rate > 0 else 0
                print(f"   Batch {batch_num}/{total_batches} | {len(all_embeddings):,} embedded | {rate:.0f}/s | ETA: {remaining/60:.1f}min")
        
        # Save to cache
        import pickle
        print(f"\n💾 Saving embeddings to cache...")
        with open(cache_file, 'wb') as f:
            pickle.dump(all_embeddings, f)
    
    embed_time = time.time() - embed_start
    print(f"   Generated {len(all_embeddings):,} embeddings in {embed_time/60:.1f} minutes")
    
    # Step 4: Upload to Pinecone
    print(f"\n Step 4: Uploading to Pinecone index '{PINECONE_INDEX_NAME}'...")
    
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index = create_pinecone_index(pc, PINECONE_INDEX_NAME, EMBEDDING_DIMENSION)
    
    upload_start = time.time()
    
    # Prepare batches for upload
    upload_batches = []
    for i in range(0, len(all_embeddings), BATCH_SIZE):
        batch_chunks = chunks[i:min(i + BATCH_SIZE, len(all_embeddings))]
        batch_metas = metadata_list[i:min(i + BATCH_SIZE, len(all_embeddings))]
        batch_embeddings = all_embeddings[i:min(i + BATCH_SIZE, len(all_embeddings))]
        
        # Batch process entities with nlp.pipe
        docs = []
        if rag_utils.nlp:
            docs = list(rag_utils.nlp.pipe([text[:2000] for text in batch_chunks]))
        
        batch = []
        for j in range(len(batch_chunks)):
            chunk_idx = i + j
            meta = {
                "text": batch_chunks[j][:1000],
                "chunk_id": f"chunk-{chunk_idx}",
                **{k: (int(v) if k == 'year' and str(v).isdigit() else str(v)[:100]) for k, v in batch_metas[j].items()}
            }
            
            # Extract entities from the pre-processed doc
            if docs:
                doc = docs[j]
                meta["countries"] = list(set([ent.text for ent in doc.ents if ent.label_ == "GPE"]))
                meta["orgs"] = list(set([ent.text for ent in doc.ents if ent.label_ == "ORG"]))
                meta["people"] = list(set([ent.text for ent in doc.ents if ent.label_ == "PERSON"]))
            else:
                meta["countries"], meta["orgs"], meta["people"] = [], [], []
                
            # Theme detection (still fast regex)
            meta["themes"] = rag_utils.detect_themes(batch_chunks[j])
            
            batch.append((f"chunk-{chunk_idx}", batch_embeddings[j], meta))
            
        upload_batches.append((batch, i // BATCH_SIZE + 1))
        
        if (i // BATCH_SIZE + 1) % 10 == 0:
            print(f"   Prepared {i + len(batch_chunks):,} chunks for upload...")
    
    # Parallel upload
    successful = 0
    failed = 0
    
    with ThreadPoolExecutor(max_workers=UPLOAD_WORKERS) as executor:
        futures = {
            executor.submit(upload_batch, index, batch, batch_num, len(upload_batches)): batch_num
            for batch, batch_num in upload_batches
        }
        
        for future in as_completed(futures):
            batch_num, success, error = future.result()
            if success:
                successful += 1
            else:
                failed += 1
                print(f"    Batch {batch_num} failed: {error}")
            
            if successful % 20 == 0:
                print(f"   Uploaded {successful}/{len(upload_batches)} batches...")
    
    upload_time = time.time() - upload_start
    
    total_time = time.time() - start_time
    print("\n" + "=" * 60)
    print("EMBEDDING COMPLETE!")
    print("=" * 60)
    print(f"   Total chunks: {len(chunks):,}")
    print(f"   Successful batches: {successful}")
    print(f"   Failed batches: {failed}")
    print(f"   Pinecone index: {PINECONE_INDEX_NAME}")
    print(f"\n   Timing:")
    print(f"      Load: {load_time:.1f}s")
    print(f"      Embed: {embed_time/60:.1f} min")
    print(f"      Upload: {upload_time/60:.1f} min")
    print(f"      TOTAL: {total_time/60:.1f} min")
    print("\nYour RAG system is ready to query!")


if __name__ == "__main__":
    main()
