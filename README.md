# Human Rights Intelligence Archive (HRIA) 🌍

A world-class RAG (Retrieval-Augmented Generation) system for human rights archive intelligence. This system synthesizes 25 years of human rights documentation from Amnesty International and Human Rights Watch (2000-2025) into a high-performance, searchable archive.

## 🚀 Key Features

- **Hybrid Search**: Combines semantic vector retrieval (Pinecone) with keyword-based retrieval (BM25) for maximum recall.
- **Cross-Encoder Reranking**: Utilizes `ms-marco-MiniLM-L6` to rerank top results for superior relevance.
- **Narrative Intelligence**: Sophisticated historian-analyst persona prompts generate world-class reports instead of simple chat responses.
- **Temporal Awareness**: Automatically extracts year ranges from queries (e.g., "Gabon in 2002") and applies precise metadata filters.
- **Entity & Theme Extraction**: Uses `spaCy` for Named Entity Recognition (NER) and regex-based theme detection for richer source context.
- **High Performance**: Parallel processing embedding pipeline utilizing `all-MiniLM-L6-v2`.

## 📂 Project Structure

```text
├── main.py              # FastAPI Backend (Hybrid Search & RAG Flow)
├── rag_utils.py         # Search Utilities (BM25, RRF, Reranker, Temporal)
├── prompts.py           # Institutional Historian Persona Templates
├── embed_chunks_fast.py # High-speed Parallel Embedding Pipeline
├── frontend/            # Next.js + React + Vite Frontend
├── requirements.txt     # Python Dependencies
├── .env.example         # Environment template
└── PRD.md               # Product Requirements Document
```

## 🛠️ Tech Stack

- **Backend**: Python, FastAPI, Pinecone (Vector DB), Groq (LLM Inference)
- **Embeddings**: HuggingFace `all-MiniLM-L6-v2`
- **Reranker**: Sentence-Transformers `cross-encoder/ms-marco-MiniLM-L-6-v2`
- **Frontend**: React, Vite, TailwindCSS (for sleek institutional UI)

## ⚡ Quick Start

### 1. Backend Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Download Spacy model
python -m spacy download en_core_web_sm

# Configure Environment
cp .env.example .env
# Fill in PINECONE_API_KEY, GROQ_API_KEY, etc.

# Run Embedding Pipeline (if data is raw)
python embed_chunks_fast.py

# Start API Server
python main.py
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 📖 API Documentation

- `POST /api/query`: Primary RAG endpoint.
  - Body: `{"query": "string", "top_k": 5}`
  - Returns: `{"answer": "string", "sources": [...], "count": int}`
- `GET /api/stats`: Pinecone index statistics.
- `GET /health`: System health check.

## 🛡️ License

Human Rights Intelligence Archive - Institutional Internal Use.
