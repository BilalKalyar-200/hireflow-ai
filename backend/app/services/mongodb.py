"""
HireFlow AI — MongoDB Service.

Manages async Motor connection to MongoDB Atlas and provides
CRUD helpers for jobs, candidates, audit logs, and pipeline runs.
Falls back to in-memory storage when MONGODB_URI is not set (local dev).
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.config import get_settings
from app.utils.exceptions import DatabaseError

logger = logging.getLogger(__name__)

# In-memory fallback when MongoDB is not configured
_memory_store: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
    "jobs": {},
    "candidates": {},
    "audit_logs": {},
    "pipeline_runs": {},
    "feedback": {},
    "scoring_weights": {},
}


class MongoDBService:
    """
    Async MongoDB access layer with in-memory fallback.

    Input: settings from get_settings()
    Output: CRUD methods for all collections
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self._client: Any = None
        self._db: Any = None
        self._use_memory = not self.settings.is_mongodb_configured()

    async def connect(self) -> None:
        """
        Connect to MongoDB Atlas or enable in-memory mode.

        Input: none
        Output: none (sets self._client and self._db or uses memory)
        """
        if self._use_memory:
            logger.warning("MONGODB_URI not set — using in-memory storage (data lost on restart)")
            return

        try:
            from motor.motor_asyncio import AsyncIOMotorClient

            self._client = AsyncIOMotorClient(self.settings.mongodb_uri)
            self._db = self._client[self.settings.mongodb_db_name]
            await self._client.admin.command("ping")
            logger.info("Connected to MongoDB: %s", self.settings.mongodb_db_name)
        except Exception as exc:
            logger.error("MongoDB connection failed, falling back to memory: %s", exc)
            self._use_memory = True

    async def disconnect(self) -> None:
        """
        Close MongoDB connection.

        Input: none
        Output: none
        """
        if self._client:
            self._client.close()

    def _collection(self, name: str) -> Any:
        """
        Get a MongoDB collection by name.

        Input: collection name string
        Output: Motor collection object
        """
        return self._db[name]

    async def insert_one(self, collection: str, document: Dict[str, Any]) -> str:
        """
        Insert one document and return its id.

        Input: collection name and document dict (must include 'id' or auto-generated)
        Output: document id string
        """
        doc_id = document.get("id") or str(uuid4())
        document["id"] = doc_id

        if self._use_memory:
            if collection not in _memory_store:
                _memory_store[collection] = {}
            _memory_store[collection][doc_id] = document
            return doc_id

        try:
            await self._collection(collection).insert_one(document)
            return doc_id
        except Exception as exc:
            raise DatabaseError("insert_one", str(exc)) from exc

    async def find_one(self, collection: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Find one document matching query.

        Input: collection name and query dict
        Output: document dict or None
        """
        if self._use_memory:
            store = _memory_store.get(collection, {})
            if "id" in query:
                return store.get(query["id"])
            for doc in store.values():
                if all(doc.get(k) == v for k, v in query.items()):
                    return doc
            return None

        try:
            doc = await self._collection(collection).find_one(query)
            if doc and "_id" in doc:
                doc.pop("_id", None)
            return doc
        except Exception as exc:
            raise DatabaseError("find_one", str(exc)) from exc

    async def find_many(
        self,
        collection: str,
        query: Dict[str, Any],
        limit: int = 100,
        sort_field: str = "created_at",
        sort_dir: int = -1,
    ) -> List[Dict[str, Any]]:
        """
        Find multiple documents matching query.

        Input: collection, query, optional limit and sort
        Output: list of document dicts
        """
        if self._use_memory:
            store = _memory_store.get(collection, {})
            results = []
            for doc in store.values():
                if all(doc.get(k) == v for k, v in query.items()):
                    results.append(doc)
            results.sort(key=lambda d: d.get(sort_field, ""), reverse=sort_dir == -1)
            return results[:limit]

        try:
            cursor = self._collection(collection).find(query).sort(sort_field, sort_dir).limit(limit)
            docs = await cursor.to_list(length=limit)
            for doc in docs:
                doc.pop("_id", None)
            return docs
        except Exception as exc:
            raise DatabaseError("find_many", str(exc)) from exc

    async def update_one(self, collection: str, doc_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update one document by id.

        Input: collection name, document id, fields to update
        Output: True if document was found and updated
        """
        updates["updated_at"] = datetime.utcnow()

        if self._use_memory:
            store = _memory_store.get(collection, {})
            if doc_id not in store:
                return False
            store[doc_id].update(updates)
            return True

        try:
            result = await self._collection(collection).update_one(
                {"id": doc_id},
                {"$set": updates},
            )
            return result.modified_count > 0 or result.matched_count > 0
        except Exception as exc:
            raise DatabaseError("update_one", str(exc)) from exc

    async def get_scoring_weights(self) -> Dict[str, float]:
        """
        Load scoring weight configuration (defaults if not set).

        Input: none
        Output: dict with weight keys for score formula
        """
        doc = await self.find_one("scoring_weights", {"id": "default"})
        if doc:
            return {
                "qwen_qualitative": doc.get("qwen_qualitative", 0.40),
                "semantic_similarity": doc.get("semantic_similarity", 0.35),
                "skills_match": doc.get("skills_match", 0.15),
                "experience_fit": doc.get("experience_fit", 0.10),
            }
        return {
            "qwen_qualitative": 0.40,
            "semantic_similarity": 0.35,
            "skills_match": 0.15,
            "experience_fit": 0.10,
        }


_db_service: Optional[MongoDBService] = None


def get_db() -> MongoDBService:
    """
    Return shared MongoDBService instance.

    Input: none
    Output: MongoDBService singleton
    """
    global _db_service
    if _db_service is None:
        _db_service = MongoDBService()
    return _db_service
