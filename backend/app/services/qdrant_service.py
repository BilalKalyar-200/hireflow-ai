"""
HireFlow AI — Qdrant Vector DB Service.

Manages Qdrant connection, collection setup, vector upsert, and
similarity search. Falls back to local cosine similarity when Qdrant is not configured.
"""

import logging
import math
from typing import Any, Dict, List, Optional, Tuple

from app.config import get_settings
from app.utils.exceptions import HireFlowError

logger = logging.getLogger(__name__)

# Local fallback vectors when Qdrant is not configured
_local_vectors: Dict[str, Dict[str, List[float]]] = {
    "resumes": {},
    "jds": {},
}


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """
    Compute cosine similarity between two vectors.

    Input: two equal-length float lists
    Output: similarity score between 0.0 and 1.0
    """
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


class QdrantService:
    """
    Qdrant vector database client with local fallback.

    Input: settings from get_settings()
    Output: upsert and search methods for resume/JD embeddings
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self._client: Any = None
        self._use_local = not self.settings.is_qdrant_configured()
        self.resume_collection = self.settings.qdrant_collection_resumes
        self.jd_collection = self.settings.qdrant_collection_jds

    async def connect(self) -> None:
        """
        Connect to Qdrant or enable local vector fallback.

        Input: none
        Output: none
        """
        if self._use_local:
            logger.warning("QDRANT_URL not set — using local in-memory vectors")
            return

        try:
            from qdrant_client import AsyncQdrantClient
            from qdrant_client.models import Distance, VectorParams

            self._client = AsyncQdrantClient(
                url=self.settings.qdrant_url,
                api_key=self.settings.qdrant_api_key or None,
            )
            dim = 1024
            for coll_name in [self.resume_collection, self.jd_collection]:
                collections = await self._client.get_collections()
                names = [c.name for c in collections.collections]
                if coll_name not in names:
                    await self._client.create_collection(
                        collection_name=coll_name,
                        vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
                    )
            logger.info("Connected to Qdrant")
        except Exception as exc:
            logger.error("Qdrant connection failed, using local fallback: %s", exc)
            self._use_local = True

    async def upsert_vector(
        self,
        collection_type: str,
        point_id: str,
        vector: List[float],
        payload: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Store one embedding vector.

        Input:
            collection_type: "resumes" or "jds"
            point_id: unique id for this vector
            vector: embedding float list
            payload: optional metadata dict
        Output: none (vector stored)
        """
        coll_name = self.resume_collection if collection_type == "resumes" else self.jd_collection

        if self._use_local:
            bucket = "resumes" if collection_type == "resumes" else "jds"
            _local_vectors[bucket][point_id] = vector
            return

        try:
            from qdrant_client.models import PointStruct

            await self._client.upsert(
                collection_name=coll_name,
                points=[PointStruct(id=point_id, vector=vector, payload=payload or {})],
            )
        except Exception as exc:
            raise HireFlowError(f"Qdrant upsert failed: {exc}") from exc

    async def search_similarity(
        self,
        collection_type: str,
        query_vector: List[float],
        limit: int = 1,
    ) -> Tuple[float, Optional[str]]:
        """
        Find most similar vector and return similarity score.

        Input:
            collection_type: "resumes" or "jds"
            query_vector: embedding to search with
            limit: max results (we use top 1 for JD match)
        Output:
            tuple of (similarity_score 0-1, matched_point_id or None)
        """
        bucket = "resumes" if collection_type == "resumes" else "jds"
        coll_name = self.resume_collection if collection_type == "resumes" else self.jd_collection

        if self._use_local:
            best_score = 0.0
            best_id: Optional[str] = None
            for pid, vec in _local_vectors[bucket].items():
                score = _cosine_similarity(query_vector, vec)
                if score > best_score:
                    best_score = score
                    best_id = pid
            return best_score, best_id

        try:
            results = await self._client.search(
                collection_name=coll_name,
                query_vector=query_vector,
                limit=limit,
            )
            if not results:
                return 0.0, None
            top = results[0]
            return float(top.score), str(top.id)
        except Exception as exc:
            raise HireFlowError(f"Qdrant search failed: {exc}") from exc

    async def compute_pair_similarity(
        self,
        vector_a: List[float],
        vector_b: List[float],
    ) -> float:
        """
        Compute similarity between two vectors directly (resume vs JD).

        Input: two embedding vectors
        Output: cosine similarity score 0.0 to 1.0
        """
        return _cosine_similarity(vector_a, vector_b)


_qdrant_service: Optional[QdrantService] = None


def get_qdrant() -> QdrantService:
    """
    Return shared QdrantService instance.

    Input: none
    Output: QdrantService singleton
    """
    global _qdrant_service
    if _qdrant_service is None:
        _qdrant_service = QdrantService()
    return _qdrant_service
