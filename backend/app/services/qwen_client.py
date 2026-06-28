"""
HireFlow AI — Qwen Cloud API Client.

Wraps the OpenAI-compatible Qwen API with mock mode, retries,
and automatic token counting logged to your terminal.
"""

import json
import logging
import random
from typing import Any, List, Optional

from openai import AsyncOpenAI

from app.config import get_settings
from app.utils.exceptions import QwenAPIError
from app.utils.token_counter import token_counter

logger = logging.getLogger(__name__)

# Fixed embedding dimension for mock mode (matches text-embedding-v3)
MOCK_EMBEDDING_DIM = 1024


def _mock_embedding(text: str) -> List[float]:
    """
    Generate a deterministic fake embedding vector for mock mode.

    Input: text string to hash into a vector
    Output: list of floats length MOCK_EMBEDDING_DIM
    """
    seed = sum(ord(c) for c in text[:500])
    rng = random.Random(seed)
    return [rng.uniform(-1, 1) for _ in range(MOCK_EMBEDDING_DIM)]


def _mock_chat_response(prompt: str) -> str:
    """
    Return canned JSON/text based on prompt keywords for mock mode.

    Input: the user prompt string
    Output: mock response string (often JSON)
    """
    prompt_lower = prompt.lower()

    if "job description" in prompt_lower or "parse" in prompt_lower and "jd" in prompt_lower:
        return json.dumps({
            "title": "Senior Python Developer",
            "required_skills": ["Python", "FastAPI", "MongoDB"],
            "preferred_skills": ["Docker", "AWS"],
            "min_experience_years": 3.0,
            "education": "Bachelor's in Computer Science",
            "responsibilities": ["Build APIs", "Write tests", "Deploy services"],
            "location": "Remote",
            "employment_type": "Full-time",
        })

    if "resume" in prompt_lower and "extract" in prompt_lower or "structure" in prompt_lower:
        return json.dumps({
            "name": "Jane Doe",
            "email": "jane.doe@example.com",
            "phone": "+1-555-0100",
            "skills": ["Python", "FastAPI", "React", "MongoDB"],
            "experience_years": 4.0,
            "education": ["BS Computer Science"],
            "work_history": [{"company": "Tech Corp", "role": "Backend Developer", "years": 4}],
            "summary": "Experienced backend developer with Python and API expertise.",
        })

    if "score" in prompt_lower or "evaluate" in prompt_lower:
        return json.dumps({
            "qwen_qualitative": 82.0,
            "semantic_similarity": 0.78,
            "skills_match_pct": 85.0,
            "experience_fit": 90.0,
            "final_score": 82.0,
            "reasoning": "Strong Python and FastAPI match. Experience exceeds minimum requirement.",
        })

    if "report" in prompt_lower or "evaluation" in prompt_lower:
        return (
            "# Candidate Evaluation Report\n\n"
            "## Summary\nJane Doe is a strong fit for the Senior Python Developer role.\n\n"
            "## Strengths\n- 4 years Python experience\n- FastAPI and MongoDB skills\n\n"
            "## Recommendation\nShortlist for interview."
        )

    if "plan" in prompt_lower:
        return (
            "Execution plan:\n"
            "1. Parse job description into structured requirements\n"
            "2. Process each resume: extract text, structure data, embed, score\n"
            "3. Shortlist top candidates, send emails, schedule interviews\n"
            "4. Flag borderline candidates for human review"
        )

    return json.dumps({"result": "mock_response", "note": "MOCK_QWEN=true active"})


class QwenClient:
    """
    Async client for Qwen Cloud API (OpenAI-compatible).

    Input: settings from get_settings()
    Output: chat and embedding methods with token tracking
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.settings = settings
        self.model = settings.qwen_model
        self.embedding_model = settings.qwen_embedding_model
        self.mock = settings.mock_qwen
        self._client: Optional[AsyncOpenAI] = None

        if not self.mock and settings.qwen_api_key:
            self._client = AsyncOpenAI(
                api_key=settings.qwen_api_key,
                base_url=settings.qwen_api_base,
            )

    async def chat_completion(
        self,
        prompt: str,
        system: str = "You are a helpful HR recruitment assistant. Respond in valid JSON when asked.",
        temperature: float = 0.3,
        max_tokens: int = 2000,
    ) -> tuple[str, int]:
        """
        Send a chat completion request to Qwen (or return mock response).

        Input:
            prompt: user message text
            system: system instruction for the model
            temperature: randomness (0.0-1.0)
            max_tokens: max tokens in the response
        Output:
            tuple of (response_text, tokens_used_this_call)
        """
        if self.mock or not self._client:
            logger.info("[QWEN MOCK] chat_completion — no API call made")
            response_text = _mock_chat_response(prompt)
            token_counter.record(prompt=len(prompt) // 4, completion=len(response_text) // 4, model="mock")
            return response_text, len(prompt) // 4 + len(response_text) // 4

        try:
            response = await self._client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = response.choices[0].message.content or ""
            usage = response.usage
            prompt_tokens = usage.prompt_tokens if usage else 0
            completion_tokens = usage.completion_tokens if usage else 0
            total = prompt_tokens + completion_tokens
            token_counter.record(prompt=prompt_tokens, completion=completion_tokens, model=self.model)
            return content, total
        except Exception as exc:
            raise QwenAPIError(f"Qwen chat completion failed: {exc}") from exc

    async def get_embeddings(self, texts: List[str]) -> tuple[List[List[float]], int]:
        """
        Generate embedding vectors for one or more text strings.

        Input:
            texts: list of strings to embed
        Output:
            tuple of (list of embedding vectors, estimated tokens used)
        """
        if self.mock or not self._client:
            logger.info("[QWEN MOCK] get_embeddings for %d texts — no API call made", len(texts))
            vectors = [_mock_embedding(t) for t in texts]
            est_tokens = sum(len(t) // 4 for t in texts)
            token_counter.record(prompt=est_tokens, completion=0, model="mock-embedding")
            return vectors, est_tokens

        try:
            response = await self._client.embeddings.create(
                model=self.embedding_model,
                input=texts,
            )
            vectors = [item.embedding for item in response.data]
            usage = response.usage
            total_tokens = usage.total_tokens if usage else sum(len(t) // 4 for t in texts)
            token_counter.record(prompt=total_tokens, completion=0, model=self.embedding_model)
            return vectors, total_tokens
        except Exception as exc:
            raise QwenAPIError(f"Qwen embedding failed: {exc}") from exc


# Module-level singleton
_qwen_client: Optional[QwenClient] = None


def get_qwen_client() -> QwenClient:
    """
    Return shared QwenClient instance.

    Input: none
    Output: QwenClient singleton
    """
    global _qwen_client
    if _qwen_client is None:
        _qwen_client = QwenClient()
    return _qwen_client
