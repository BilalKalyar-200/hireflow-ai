"""
HireFlow AI — Embedding Service Tool.

Generates vector embeddings for resume and JD text via Qwen Embeddings API.
"""

import logging
from typing import List

from app.services.qwen_client import get_qwen_client

logger = logging.getLogger(__name__)


async def generate_embeddings(texts: List[str]) -> tuple[List[List[float]], int]:
    """
    Generate embedding vectors for a list of text strings.

    Input:
        texts: list of strings to embed (e.g. resume text, JD text)
    Output:
        tuple of (list of embedding vectors, total tokens used)
    """
    if not texts:
        return [], 0

    client = get_qwen_client()
    truncated = [t[:8000] for t in texts]
    vectors, tokens = await client.get_embeddings(truncated)
    return vectors, tokens


async def generate_single_embedding(text: str) -> tuple[List[float], int]:
    """
    Generate one embedding vector for a single text string.

    Input:
        text: string to embed
    Output:
        tuple of (embedding vector list, tokens used)
    """
    vectors, tokens = await generate_embeddings([text])
    return vectors[0] if vectors else [], tokens
