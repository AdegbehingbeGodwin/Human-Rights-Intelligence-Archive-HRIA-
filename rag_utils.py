import re
from typing import List, Dict, Any, Optional
from rank_bm25 import BM25Okapi
import numpy as np

def extract_temporal_filter(query: str) -> Optional[Dict[str, Any]]:
    """
    Extract year or year range from query.
    Example: "in 2002" -> {"year": 2002}
    Example: "from 2000 to 2005" -> {"year": {"$gte": 2000, "$lte": 2005}}
    """
    # Simple year match (4 digits)
    year_match = re.search(r'\b(20\d{2}|19\d{2})\b', query)
    
    # Year range match
    range_match = re.search(r'\b(20\d{2})\s*(?:to|and|-)\s*(20\d{2})\b', query)
    
    if range_match:
        start_year = int(range_match.group(1))
        end_year = int(range_match.group(2))
        return {"year": {"$gte": start_year, "$lte": end_year}}
    elif year_match:
        return {"year": int(year_match.group(1))}
    
    return None

def reciprocal_rank_fusion(results_list: List[List[Dict[str, Any]]], k: int = 60) -> List[Dict[str, Any]]:
    """
    Combine multiple ranked lists using Reciprocal Rank Fusion.
    """
    fused_scores = {}
    for results in results_list:
        for rank, hit in enumerate(results):
            doc_id = hit.get('id') or hit.get('metadata', {}).get('chunk_id')
            if not doc_id:
                continue
            if doc_id not in fused_scores:
                fused_scores[doc_id] = 0
            fused_scores[doc_id] += 1 / (rank + k)
    
    all_hits = { (hit.get('id') or hit.get('metadata', {}).get('chunk_id')): hit for results in results_list for hit in results }
    
    sorted_ids = sorted(fused_scores.keys(), key=lambda x: fused_scores[x], reverse=True)
    return [all_hits[doc_id] for doc_id in sorted_ids if doc_id in all_hits]

class BM25Searcher:
    def __init__(self, corpus: List[str], metadatas: List[Dict]):
        self.corpus = corpus
        self.metadatas = metadatas
        if corpus:
            tokenized_corpus = [doc.lower().split() for doc in corpus]
            self.bm25 = BM25Okapi(tokenized_corpus)
        else:
            self.bm25 = None
    
    def search(self, query: str, top_k: int = 10) -> List[Dict]:
        if not self.bm25:
            return []
        tokenized_query = query.lower().split()
        scores = self.bm25.get_scores(tokenized_query)
        top_n = np.argsort(scores)[-top_k:][::-1]
        
        results = []
        for i in top_n:
            if scores[i] > 0:
                results.append({
                    "text": self.corpus[i],
                    "metadata": self.metadatas[i],
                    "score": float(scores[i]),
                    "id": self.metadatas[i].get('chunk_id', f"bm25-{i}")
                })
        return results

class Reranker:
    """Pass-through reranker (Disabled local model cross-encoder for Vercel)"""
    def __init__(self, model_name: str = ""):
        pass
    def rerank(self, query: str, results: List[Dict], top_k: int = 5) -> List[Dict]:
        # Return results sorted by their existing scores (fused or retrieval)
        return results[:top_k]
