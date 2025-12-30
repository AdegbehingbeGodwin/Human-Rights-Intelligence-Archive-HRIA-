"""
FastAPI Backend for HRIA RAG System
Provides semantic search over human rights documents using Pinecone + Groq
"""

import os
from typing import Optional, List
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pinecone import Pinecone
from langchain_huggingface import HuggingFaceEmbeddings
from groq import Groq
import rag_utils
import prompts
import glob

# Load environment variables
load_dotenv()

# Configuration
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
PINECONE_INDEX_NAME = "hria-fast"
LLM_MODEL_NAME = "moonshotai/kimi-k2-instruct-0905"

# Initialize FastAPI
app = FastAPI(
    title="HRIA RAG API",
    description="Human Rights Intelligence Archive - Semantic Search API",
    version="1.0.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances (initialized on startup)
embedding_model = None
pinecone_index = None
groq_client = None
bm25_searcher = None
reranker = None


class QueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    year_range: Optional[List[int]] = None


class QueryResult(BaseModel):
    text: str
    score: float
    metadata: dict


class QueryResponse(BaseModel):
    query: str
    answer: str
    sources: List[QueryResult]
    count: int


class StatsResponse(BaseModel):
    documents: int
    index_name: str
    status: str


@app.on_event("startup")
async def startup_event():
    """Initialize models and connections on startup"""
    global embedding_model, pinecone_index, groq_client, bm25_searcher, reranker
    
    print("Initializing HRIA RAG API...")
    
    # Initialize embedding model
    print("   Loading embedding model...")
    embedding_model = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL_NAME,
        model_kwargs={'device': 'cpu', 'trust_remote_code': True},
        encode_kwargs={'normalize_embeddings': True}
    )
    
    # Initialize Pinecone
    print("   Connecting to Pinecone...")
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    pinecone_index = pc.Index(PINECONE_INDEX_NAME)
    
    # Initialize Groq
    print("   Connecting to Groq...")
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    # Initialize Reranker
    print("   Loading reranker model...")
    reranker = rag_utils.Reranker()
    
    # Initialize BM25 searcher
    print("   Building BM25 index...")
    chunks_dir = os.path.join("data", "chunks")
    chunk_files = glob.glob(os.path.join(chunks_dir, "chunk_*.txt"))
    # For speed, we'll only load content from a subset or all if manageable
    # Since we have 85k chunks, let's load all but only the text parts
    corpus = []
    metadatas = []
    for i, file_path in enumerate(chunk_files):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            parts = content.split('=' * 50)
            if len(parts) >= 2:
                text = parts[1].strip()
                # Extract metadata from part 0
                meta = {}
                for line in parts[0].strip().split('\n'):
                    if ':' in line:
                        k, v = line.split(':', 1)
                        meta[k.strip().lower()] = v.strip()
                
                # Ensure year is integer for filtering consistency
                if 'year' in meta and meta['year'].isdigit():
                    meta['year'] = int(meta['year'])
                    
                corpus.append(text)
                metadatas.append(meta)
        except:
            continue
        if (i+1) % 10000 == 0:
            print(f"      Loaded {i+1}/{len(chunk_files)} for BM25...")
            
    bm25_searcher = rag_utils.BM25Searcher(corpus, metadatas)
    
    print("API ready!")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/api/stats", response_model=StatsResponse)
async def get_stats():
    """Get dataset statistics"""
    try:
        stats = pinecone_index.describe_index_stats()
        return StatsResponse(
            documents=stats.total_vector_count,
            index_name=PINECONE_INDEX_NAME,
            status="ready"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    """Execute a world-class RAG query with hybrid search and reranking"""
    try:
        # Step 1: Detect temporal filter from query
        temporal_filter = rag_utils.extract_temporal_filter(request.query)
        pinecone_filter = temporal_filter if temporal_filter else None
        
        # Step 2: Dense retrieval (Pinecone)
        query_embedding = embedding_model.embed_query(request.query)
        vector_results = pinecone_index.query(
            vector=query_embedding,
            top_k=20,
            include_metadata=True,
            filter=pinecone_filter
        )
        
        # Step 3: Sparse retrieval (BM25)
        bm25_results = bm25_searcher.search(request.query, top_k=20)
        
        # Filter BM25 results by year if needed (manual filtering for BM25)
        if temporal_filter:
            year_val = temporal_filter.get('year')
            if isinstance(year_val, int):
                bm25_results = [r for r in bm25_results if r['metadata'].get('year') == year_val]
            elif isinstance(year_val, dict): # Range
                gte = year_val.get('$gte', 0)
                lte = year_val.get('$lte', 3000)
                bm25_results = [r for r in bm25_results if gte <= r['metadata'].get('year', 0) <= lte]
        
        # Step 4: Hybrid Fusion (RRF)
        # Convert search results to common format
        dense_hits = []
        for match in vector_results.matches:
            dense_hits.append({
                "text": match.metadata.get("text", ""),
                "score": match.score,
                "metadata": {k: v for k, v in match.metadata.items() if k != "text"},
                "id": str(match.id)
            })
        
        fused_results = rag_utils.reciprocal_rank_fusion([dense_hits, bm25_results])
        
        # Step 5: Cross-Encoder Reranking
        reranked_results = reranker.rerank(request.query, fused_results, top_k=request.top_k)
        
        # Step 6: Format Context and Generate Narrative Answer
        context = prompts.format_context_with_citations(reranked_results)
        
        system_prompt = prompts.HISTORIAN_SYSTEM_PROMPT
        user_prompt = f"""Based on these human rights archive documents:

{context}

Question: {request.query}

Provide a synthesized, narrative analysis:"""

        chat_response = groq_client.chat.completions.create(
            model=LLM_MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            max_tokens=1500
        )
        
        answer = chat_response.choices[0].message.content
        
        # Prepare final sources for response
        final_sources = []
        for r in reranked_results:
            final_sources.append(QueryResult(
                text=r['text'],
                score=r.get('rerank_score') or r.get('score', 0),
                metadata=r['metadata']
            ))
        
        return QueryResponse(
            query=request.query,
            answer=answer,
            sources=final_sources,
            count=len(final_sources)
        )
        
    except Exception as e:
        print(f"Error in query_rag: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
