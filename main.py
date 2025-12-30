"""
FastAPI Backend for HRIA RAG System (Enhanced)
Uses HF API for embeddings + Local BM25 for hybrid search.
"""

import os
import glob
import requests
from huggingface_hub import InferenceClient
from typing import Optional, List
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pinecone import Pinecone
from groq import Groq
import rag_utils
import prompts

# Load environment variables
load_dotenv()

# Configuration
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
HF_TOKEN = os.getenv("HUGGINGFACE_API_KEY")

PINECONE_INDEX_NAME = "hria-fast"
LLM_MODEL_NAME = "moonshotai/kimi-k2-instruct-0905"

# Initialize FastAPI
app = FastAPI(
    title="HRIA RAG API",
    description="Human Rights Intelligence Archive - Hybrid Semantic Search API",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Global instances
pinecone_index = None
groq_client = None
bm25_searcher = None
hf_client = None

def get_huggingface_embeddings(text: str) -> List[float]:
    """Fetch embeddings using the official HF InferenceClient."""
    global hf_client
    if not hf_client:
        if not HF_TOKEN:
             raise Exception("HUGGINGFACE_API_KEY is missing. Please add it to your environment variables.")
        hf_client = InferenceClient(token=HF_TOKEN)
    
    try:
        # Use feature_extraction task which returns the vector
        embedding = hf_client.feature_extraction(text, model=EMBEDDING_MODEL_NAME)
        # Convert from list of lists (batch) to single list if needed
        if isinstance(embedding, list) and len(embedding) > 0 and isinstance(embedding[0], list):
            return embedding[0]
        # Some versions return numpy arrays, convert to list
        if hasattr(embedding, "tolist"):
            embedding = embedding.tolist()
            if isinstance(embedding, list) and len(embedding) > 0 and isinstance(embedding[0], list):
                return embedding[0]
        return embedding
    except Exception as e:
        # Fallback to direct requests if InferenceClient fails, using the new router URL
        print(f"InferenceClient failed, trying direct request: {e}")
        URL = f"https://router.huggingface.co/hf-inference/models/{EMBEDDING_MODEL_NAME}"
        headers = {"Authorization": f"Bearer {HF_TOKEN}"}
        response = requests.post(URL, headers=headers, json={"inputs": text, "options": {"wait_for_model": True}})
        if response.status_code != 200:
            raise Exception(f"Hugging Face API Error: {response.text}")
        result = response.json()
        if isinstance(result, list) and len(result) > 0 and isinstance(result[0], list):
            return result[0]
        return result

class QueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5

class QueryResult(BaseModel):
    text: str
    score: float
    metadata: dict

class QueryResponse(BaseModel):
    query: str
    answer: str
    sources: List[QueryResult]
    count: int

@app.on_event("startup")
async def startup_event():
    global pinecone_index, groq_client, bm25_searcher
    
    print("Initializing HRIA RAG API...")
    
    # Pinecone & Groq
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    pinecone_index = pc.Index(PINECONE_INDEX_NAME)
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    # BM25 Initialization (Conditional for Vercel)
    chunks_dir = os.path.join("data", "chunks")
    if os.path.exists(chunks_dir):
        print("   Building BM25 index from local chunks...")
        chunk_files = glob.glob(os.path.join(chunks_dir, "chunk_*.txt"))
        # Optimized loading: Limit to first 5000 for Vercel memory if needed
        # But keeping full for now as requested
        corpus = []
        metadatas = []
        for i, file_path in enumerate(chunk_files[:10000]): # Safety limit for Vercel
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                parts = content.split('=' * 50)
                if len(parts) >= 2:
                    text = parts[1].strip()
                    meta = {}
                    for line in parts[0].strip().split('\n'):
                        if ':' in line:
                            k, v = line.split(':', 1)
                            meta[k.strip().lower()] = v.strip()
                    corpus.append(text)
                    metadatas.append(meta)
            except:
                continue
        bm25_searcher = rag_utils.BM25Searcher(corpus, metadatas)
    else:
        print("   Warning: data/chunks not found. BM25 disabled.")
        bm25_searcher = rag_utils.BM25Searcher([], [])

    print("API ready!")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    try:
        # Step 1: Detect temporal filter
        temporal_filter = rag_utils.extract_temporal_filter(request.query)
        pinecone_filter = temporal_filter if temporal_filter else None
        
        # Step 2: Dense Retrieval (HF API + Pinecone)
        query_embedding = get_huggingface_embeddings(request.query)
        vector_results = pinecone_index.query(
            vector=query_embedding,
            top_k=20,
            include_metadata=True,
            filter=pinecone_filter
        )
        
        dense_hits = []
        for match in vector_results.matches:
            dense_hits.append({
                "text": match.metadata.get("text", ""),
                "score": match.score,
                "metadata": {k: v for k, v in match.metadata.items() if k != "text"},
                "id": str(match.id)
            })
        
        # Step 3: Sparse Retrieval (Local BM25)
        bm25_results = bm25_searcher.search(request.query, top_k=20)
        
        # Step 4: Fusion
        fused_results = rag_utils.reciprocal_rank_fusion([dense_hits, bm25_results])
        
        # Step 5: Answer Generation
        context = prompts.format_context_with_citations(fused_results[:10])
        system_prompt = prompts.HISTORIAN_SYSTEM_PROMPT
        user_prompt = f"Context:\n{context}\n\nQuestion: {request.query}\n\nAnalysis:"

        chat_response = groq_client.chat.completions.create(
            model=LLM_MODEL_NAME,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.2,
            max_tokens=1000
        )
        answer = chat_response.choices[0].message.content
        
        final_sources = [
            QueryResult(text=r['text'], score=r.get('score', 0), metadata=r['metadata'])
            for r in fused_results[:request.top_k]
        ]
        
        return QueryResponse(query=request.query, answer=answer, sources=final_sources, count=len(final_sources))
        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
