# Human Rights Intelligence Archive (HRIA)

## Product Requirements Document (PRD)

**Version:** 2.0

**Last Updated:** December 2025

**Status:** In Development

---

## 1. Executive Summary

Human Rights Intelligence Archive (HRIA) is a production-grade retrieval-augmented generation (RAG) system that consolidates and synthesizes 25 years of human rights data from two premier global organizations—Amnesty International and Human Rights Watch (2000-2025).

The system enables researchers, policymakers, advocates, and UN agencies to intelligently query consolidated human rights data to identify trends, understand regional evolution, and access actionable insights for decision-making.

### Key Value Proposition

- **Consolidates** 50+ documents into a single searchable interface
- **Enables temporal analysis** across 25 years of human rights conditions
- **Provides actionable insights** through natural language queries
- **Maintains data integrity** with source attribution and reference tracking
- **Scales efficiently** using local vector embeddings and file-based storage

---

## 2. Problem Statement

### Current State

Amnesty International and Human Rights Watch publish comprehensive annual reports documenting global human rights conditions across 100+ countries. With 50+ documents spanning 25 years, researchers and policymakers face a critical challenge:

**This data is locked in siloed PDFs** , making it nearly impossible to:

- Identify long-term human rights trends
- Understand how priorities have evolved over time
- Access specific insights without manually reading dozens of reports
- Synthesize information across organizational perspectives
- Track regional patterns and country-specific developments

### Target Users

1. **UN Agencies** (OHCHR, UNOPS) - Need consolidated human rights intelligence
2. **Policymakers** - Need evidence for decision-making
3. **Human Rights Advocates** - Need historical trends and patterns
4. **Researchers** - Need to analyze organizational perspectives
5. **Civil Society Organizations** - Need accessible human rights data

---

## 3. Solution Overview

### What HRIA Does

HRIA is a semantic search system that allows users to ask natural language questions about human rights data and receive consolidated, sourced answers from a comprehensive 25-year archive.

### How It Works

User Query
↓
Query Embedding (HuggingFace - local)
↓
Vector Search (Milvus Lite - file-based)
↓
Retrieve Relevant Chunks
↓
Synthesize Response (Groq)
↓
Display Consolidated Insight + Source Reference

### Core Technology Stack

- **Backend:** Python, FastAPI
- **Embeddings:** HuggingFace Transformers (`all-MiniLM-L6-v2`)
- **Vector Store:** Pinecone (Serverless)
- **Keyword Search:** BM25 (rank-bm25)
- **Reranking:** Cross-Encoder (`ms-marco-MiniLM-L-6-v2`)
- **LLM:** Groq (fast inference)
- **Frontend:** React + Vite (deployed on Vercel)

### No Docker Required

- All services run locally without containerization
- Milvus Lite stores vectors in local filesystem
- HuggingFace models cached locally
- Minimal infrastructure requirements

---

## 4. Features & Functionality

### 4.1 Core Features (Implemented)

#### 4.1.1 Advanced Retrieval Pipeline

- **Hybrid Search**: Fusing vector and keyword results using Reciprocal Rank Fusion (RRF).
- **Temporal Analysis**: Auto-extraction of years from queries for filtered retrieval.
- **Maximal Marginal Relevance (MMR)**: Ensuring diversity in retrieved evidence.
- **Semantic Reranking**: Final stage reranking for maximum precision.

#### 4.1.2 Historian Narrative Engine

- **Narrative input** : Users ask questions in plain English.
- **Structured Synthesis**: Answers structured with Executive Summary and Historical Context.
- **Source Attribution**: Precise citations for every claim.
- **Source references** : One-click access to source document and organization

**Example Queries:**

- "What are the main human rights concerns in 2024?"
- "How have women's rights evolved since 2000?"
- "What countries appear most frequently in human rights reports?"
- "Show me the progression of torture documentation"

#### 4.1.2 Result Display & Organization

- **Clean card-based interface** : Each result shows:
- Consolidated insight (truncated to 300 chars by default)
- Organization source badge (Amnesty or HRW)
- Year published
- "Read full insight" button (expands text)
- "View source reference" button (shows metadata)
- **Expandable sections** :
- Full text on demand
- Source reference details (organization, filename, year)
- No comparison/duplication between organizations

#### 4.1.3 Dataset Overview

- **Statistics dashboard** showing:
  - Total documents (50+)
  - Time period covered (2000-2025)
  - Number of organizations (2)
  - Countries covered (100+)

#### 4.1.4 Source Attribution

- Every result shows:
  - Which organization published it (Amnesty or HRW)
  - Document filename
  - Year of publication
  - Optional access to full reference details

### 4.2 Future Features (Phase 2+)

#### 4.2.1 Advanced Filtering

- Filter by specific country
- Filter by human rights theme (torture, women's rights, freedom of expression, etc.)
- Filter by region (Africa, Americas, Asia, Europe, Middle East, Oceania)

#### 4.2.2 Trend Visualization

- Timeline showing how issues evolved 2000-2025
- Regional heat maps showing coverage
- Theme frequency charts

#### 4.2.3 Batch Analysis

- Upload custom questions for analysis
- Generate reports on specific topics
- Export results as PDF/CSV

#### 4.2.4 User Accounts

- Save favorite queries
- Create custom collections
- Share search results

---

## 5. Data Architecture

### 5.1 Data Sources

| Source                | Documents         | Years        | Coverage           | Format   |
| --------------------- | ----------------- | ------------ | ------------------ | -------- |
| Amnesty International | 26 annual reports | 2000-2025    | 100+ countries     | PDF      |
| Human Rights Watch    | 26 world reports  | 2000-2025    | 100+ countries     | PDF      |
| **Total**             | **50+**           | **25 years** | **100+ countries** | **Text** |

### 5.2 Data Processing Pipeline

```
1. PDF and RTF Extraction
   └─ Extract text from 50+ PDFs
   └─ Clean and normalize formatting

2. Chunking
   └─ Split into 512-token chunks with 50-token overlap
   └─ Preserve semantic meaning

3. Metadata Extraction
   └─ Year (from filename)
   └─ Organization (amnesty or hrw)
   └─ Filename for reference

4. Embedding Generation
   └─ HuggingFace all-MiniLM-L6-v2 (384 dimensions)
   └─ Local processing (no API calls)

5. Storage
   └─ Milvus Lite (vector + metadata)
   └─ File-based (./milvus_data/)
   └─ ~5,000-10,000 total embeddings
```

### 5.3 Storage Details

- **Vectors:** Stored in Milvus Lite (file-based)
- **Metadata:** Stored with vectors (organization, year, filename)
- **Original chunks:** Stored as JSON for reference
- **Total disk space:** ~300-500 MB (vectors + data)
- **Memory usage:** ~500 MB during runtime

---

## 6. Technical Specifications

### 6.1 Backend API

#### 6.1.1 POST /api/query

**Description:** Execute a search query against human rights data

**Request Body:**

```json
{
  "query": "string (required)",
  "year_range": [int, int] (optional, default [2000, 2025]),
  "limit": int (optional, default 5, max 10)
}
```

**Response:**

```json
{
  "query": "string",
  "results": [
    {
      "text": "string (consolidated insight)",
      "organization": "amnesty | hrw",
      "year": int,
      "filename": "string"
    }
  ],
  "count": int
}
```

**Performance:**

- Query embedding: <50ms
- Vector search: <15ms
- Response synthesis: <100ms
- **Total latency: <200ms**

#### 6.1.2 GET /api/stats

**Description:** Get dataset overview statistics

**Response:**

```json
{
  "documents": 50,
  "years": "2000-2025",
  "organizations": ["Amnesty International", "Human Rights Watch"],
  "countries": "100+",
  "status": "ready"
}
```

#### 6.1.3 GET /health

**Description:** Health check endpoint

**Response:**

```json
{
  "status": "healthy"
}
```

### 6.2 Deployment Architecture

#### 6.2.1 Beam Cloud Serverless API

**Why Beam:**

- Ultra-fast inference (GPUs available)
- Auto-scaling for concurrent queries
- No server management
- Pay-per-use pricing
- Handles cold starts efficiently
- Perfect for RAG workloads

**Deployment Flow:**

```
Frontend (Vercel)
    ↓
Beam API Endpoint (Serverless)
    ├─ Query embedding generation
    ├─ Vector search (Milvus Lite in container)
    ├─ LLM inference (Groq API)
    └─ Response synthesis
```

**Beam Configuration:**

- Container image with all dependencies
- GPU support for embedding generation (optional)
- Environment variables for API keys
- Auto-scaling: 0 to 100+ concurrent requests

### 6.3 Frontend

#### 6.3.1 Query Interface

- **Input** : Text field for natural language questions
- **Filters** :
- Year range slider (2000-2025)
- No organization filter (consolidated view)
- **Output** : Ordered list of relevant results

#### 6.2.2 Result Display

- **Compact view** (default):
  - First 300 characters of text
  - Organization badge
  - Year label
  - "Read full insight" button
- **Expanded view** :
- Full text displayed
- "View source reference" option
- **Reference view** (optional):
  - Organization name
  - Document filename
  - Year published

#### 6.2.3 Dashboard Stats

- Documents indexed
- Years covered
- Number of organizations
- Countries covered

---

## 7. User Workflows

### 7.1 Workflow 1: Quick Fact Finding

1. User enters: "What are current torture practices documented?"
2. System searches across all 50 documents
3. Returns top 5 consolidated insights
4. User clicks "View source reference" to see where it came from
5. User copies insight for use in report

### 7.2 Workflow 2: Trend Analysis

1. User enters: "How have women's rights advocacy changed since 2000?"
2. System filters results to year range 2000-2025
3. Returns insights showing evolution over time
4. User reads through multiple results to understand trend
5. User can expand individual results for full context

### 7.3 Workflow 3: Country Research

1. User enters: "What are the main human rights issues in India?"
2. System searches all reports mentioning India
3. Returns consolidated results from both organizations
4. User reviews source references to understand organizational overlap
5. User exports findings for research

---

## 8. Success Metrics

### 8.1 Performance Metrics

- **Query latency:** < 200ms (backend) + < 1000ms (frontend display)
- **Uptime:** 99% availability
- **Search accuracy:** 90%+ relevant results for test queries
- **Dataset coverage:** 50+ documents, 25-year span

### 8.2 User Adoption Metrics

- Number of queries executed
- Average result expansion rate
- Source reference access rate
- Session duration
- Return visitor rate

### 8.3 Data Quality Metrics

- Retrieval accuracy (human evaluation)
- Source attribution correctness
- No missing or duplicated results

---

## 9. Deployment Plan

### 9.1 Local Development

- Run API: `python run.py api`
- Run tests: `pytest tests/`
- Process data: `python run.py setup`

### 9.2 Production Deployment

#### Frontend (Vercel)

```bash
git push
# → Auto-deployed to Vercel
# → Live at hria-app.vercel.app
```

#### Backend (Beam Serverless)

```bash
# Deploy API to Beam Cloud
beam deploy start_server.py

# Get endpoint URL
# → https://your-workspace-hria-api.beam.cloud/api/query
```

**Beam Benefits:**

- ✅ Zero infrastructure management
- ✅ Auto-scaling (handles 1-1000 concurrent requests)
- ✅ Fast cold starts (<2 seconds)
- ✅ GPU support available
- ✅ Built-in monitoring & logs
- ✅ Pay only for what you use

#### Beam Setup Steps:

1. Sign up at https://www.beam.cloud/
2. Get API token from dashboard
3. Configure `beam configure default --token YOUR_TOKEN`
4. Deploy: `beam deploy start_server.py`
5. Copy endpoint URL to frontend `.env`

#### Deployment Diagram:

```
┌─────────────────────┐
│   Users / Browser   │
└──────────┬──────────┘
           ↓
    ┌──────────────┐
    │   Vercel     │
    │  Next.js App │
    └──────┬───────┘
           ↓ (HTTPS)
    ┌──────────────────────┐
    │  Beam Serverless     │
    │  ┌────────────────┐  │
    │  │ FastAPI Server │  │
    │  ├────────────────┤  │
    │  │ Milvus Lite    │  │
    │  ├────────────────┤  │
    │  │ Embeddings     │  │
    │  ├────────────────┤  │
    │  │ Groq Client    │  │
    │  └────────────────┘  │
    │ (Auto-scales 0-100+) │
    └──────────────────────┘
           ↓
    ┌──────────────┐
    │ Groq API     │
    │ (Inference)  │
    └──────────────┘
```

### 9.3 Data Initialization

1. Download 50+ PDFs (Amnesty + HRW, 2000-2025)
2. Run data processor: `python run.py setup`
3. Initialize vector store automatically
4. API ready to accept queries

---

## 10. Project Structure

```
hria-rag/
├── data/
│   ├── raw_pdfs/ (50+ PDFs)
│   ├── processed/ (extracted chunks + metadata)
│   └── milvus_data/ (vector storage)
├── src/
│   ├── data_pipeline/ (extraction, chunking, processing)
│   ├── embeddings/ (HuggingFace embeddings)
│   ├── vector_store/ (Milvus client)
│   ├── rag/ (orchestration, memory, synthesis)
│   ├── api/ (FastAPI routes + schemas)
│   └── utils/ (helpers, logging)
├── ui/ (Next.js frontend - separate repo)
├── tests/ (pytest suite)
├── .env (configuration)
├── requirements.txt (dependencies)
└── run.py (startup script)
```

---

## 11. Timeline & Roadmap

### Phase 1: MVP (Current - 2-3 weeks)

- ✅ Data processing pipeline
- ✅ Vector store setup (Milvus)
- ✅ FastAPI backend with query endpoint
- ✅ Next.js frontend with search interface
- ✅ Source attribution & reference tracking
- ✅ Deployment to Vercel

### Phase 2: Enhancement (Weeks 4-6)

- Advanced filtering (country, theme, region)
- Trend visualization (timeline, charts)
- Batch query processing
- Export functionality (PDF, CSV)

### Phase 3: Production (Weeks 7+)

- User authentication
- Query history & saved searches
- Performance optimization
- Monitoring & analytics

---

## 12. Risk Assessment & Mitigation

### Risk 1: API Latency

- **Risk:** Query responses slow (>2 seconds)
- **Mitigation:** Binary quantization, caching, CDN for frontend

### Risk 2: Accuracy Issues

- **Risk:** Irrelevant or duplicate results
- **Mitigation:** Careful chunking strategy, test queries, human evaluation

### Risk 3: Data Quality

- **Risk:** Poor PDF extraction, missing metadata
- **Mitigation:** Manual validation, cleanup scripts, metadata extraction

### Risk 4: Scalability

- **Risk:** System slow with more documents
- **Mitigation:** Milvus Lite can handle 100k+ vectors, optimize embedding models

---

## 13. Success Criteria

✅ **Technical:**

- API responds in <200ms for 90% of queries
- Frontend deploys to Vercel without errors
- Data processing completes in <15 minutes
- All 50+ documents indexed and searchable

✅ **Functional:**

- Users can search natural language queries
- Results show consolidated insights
- Source references available on demand
- Stats dashboard displays accurate metrics

✅ **Portfolio:**

- Demonstrates RAG expertise for UNOPS role
- Shows data integration from multiple sources
- Proves responsible AI with source attribution
- Full-stack implementation (Python + Next.js)

---

## 14. Appendix: Example Queries

### Query 1: Current Issues

**Q:** "What are the main human rights violations documented in recent reports?"
**Expected Result:** Top 5 recent insights from Amnesty + HRW with source references

### Query 2: Temporal Trend

**Q:** "How has freedom of expression been documented from 2000 to 2024?"
**Expected Result:** Insights showing evolution of the issue with year labels

### Query 3: Regional Focus

**Q:** "What countries in Africa appear most frequently in human rights reports?"
**Expected Result:** Consolidated results about African countries with source attribution

### Query 4: Organizational Overlap

**Q:** "Which countries are mentioned in both Amnesty and HRW reports?"
**Expected Result:** Insights showing countries documented by both organizations (visible through source references)

---

**End of Document**
