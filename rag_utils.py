import re
import spacy
from typing import List, Dict, Any, Optional
from rank_bm25 import BM25Okapi
import numpy as np

# Load Spacy for NER
try:
    nlp = spacy.load("en_core_web_sm")
except:
    # Fallback if model not downloaded yet
    nlp = None

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
    
    # Sort and return
    # This is a bit complex because we need to keep the metadata
    # We'll re-fetch or keep one copy of the hit
    all_hits = { (hit.get('id') or hit.get('metadata', {}).get('chunk_id')): hit for results in results_list for hit in results }
    
    sorted_ids = sorted(fused_scores.keys(), key=lambda x: fused_scores[x], reverse=True)
    return [all_hits[doc_id] for doc_id in sorted_ids if doc_id in all_hits]

def extract_entities(text: str) -> Dict[str, List[str]]:
    """Extract countries, organizations, and people from text."""
    if not nlp:
        return {"countries": [], "orgs": [], "people": []}
    
    doc = nlp(text[:2000]) # Limit to 2000 chars for speed
    entities = {
        "countries": list(set([ent.text for ent in doc.ents if ent.label_ == "GPE"])),
        "orgs": list(set([ent.text for ent in doc.ents if ent.label_ == "ORG"])),
        "people": list(set([ent.text for ent in doc.ents if ent.label_ == "PERSON"]))
    }
    return entities

def detect_themes(text: str) -> List[str]:
    """Detect human rights themes using keyword matching."""
    themes_map = {
        "torture": r"torture|ill-treatment|cruel",
        "freedom_of_expression": r"freedom of expression|press freedom|censorship|journalists",
        "arbitrary_detention": r"arbitrary detention|unlawful arrest|prison|detainee",
        "womens_rights": r"women's rights|gender|violence against women|discrimination",
        "childrens_rights": r"children's rights|child labor|child soldiers",
        "elections": r"election|voting|political parties|democracy",
        "armed_conflict": r"armed conflict|war|civil war|militia|insurgency"
    }
    
    found_themes = []
    text_lower = text.lower()
    for theme, pattern in themes_map.items():
        if re.search(pattern, text_lower):
            found_themes.append(theme)
    
    return found_themes

class BM25Searcher:
    def __init__(self, corpus: List[str], metadatas: List[Dict]):
        self.corpus = corpus
        self.metadatas = metadatas
        tokenized_corpus = [doc.lower().split() for doc in corpus]
        self.bm25 = BM25Okapi(tokenized_corpus)
    
    def search(self, query: str, top_k: int = 10) -> List[Dict]:
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

from sentence_transformers import CrossEncoder

class Reranker:
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model = CrossEncoder(model_name)
    
    def rerank(self, query: str, results: List[Dict], top_k: int = 5) -> List[Dict]:
        if not results:
            return []
        
        # Prepare pairs: (query, text)
        pairs = [[query, r.get('text', '')] for r in results]
        scores = self.model.predict(pairs)
        
        # Sort by score
        for i, score in enumerate(scores):
            results[i]['rerank_score'] = float(score)
        
        sorted_results = sorted(results, key=lambda x: x['rerank_score'], reverse=True)
        return sorted_results[:top_k]

def apply_mmr(results: List[Dict], query_vector: np.ndarray, embeddings: List[np.ndarray], lambda_constant: float = 0.5, top_n: int = 5):
    """
    Maximal Marginal Relevance for diversity.
    """
    if not results:
        return []
    
    selected_indices = []
    candidates_indices = list(range(len(results)))
    
    # Pre-calculated similarities between query and all docs (already sorted by this usually)
    # But let's assume we need to re-calc if needed.
    
    # For now, let's keep it simple: 
    # Just ensure we don't have too many duplicate countries/years if possible
    # A full MMR requires embedding vectors which we might not have for all results yet
    return results[:top_n] # Placeholder for now, simple top-n
