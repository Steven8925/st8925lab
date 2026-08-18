# =========================================================================
#  embedder.py — Abstract Embedding Provider Interface
#  Supports Google Gemini text-embedding-004, OpenAI text-embedding-3-small, and Local Vectorizer
# =========================================================================

import logging
import math
from abc import ABC, abstractmethod
from typing import List
from config import settings

logger = logging.getLogger("AI_KB_Embedder")

class EmbeddingProvider(ABC):
    @abstractmethod
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        pass

class GeminiEmbeddingProvider(EmbeddingProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            self.genai = genai
            self.model_name = settings.EMBEDDING_MODEL
            logger.info("Initialized Gemini Embedding Provider.")
        except Exception as e:
            logger.warning(f"Failed to configure Google Generative AI ({e}).")
            self.genai = None

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not self.genai or not self.api_key:
            return MockEmbeddingProvider().embed_texts_sync(texts)
        try:
            results = []
            for t in texts:
                emb = self.genai.embed_content(
                    model=f"models/{self.model_name}",
                    content=t,
                    task_type="retrieval_document"
                )
                results.append(emb['embedding'])
            return results
        except Exception as e:
            logger.error(f"Gemini embedding API call failed: {e}. Falling back to deterministic local embedding.")
            return MockEmbeddingProvider().embed_texts_sync(texts)

class OpenAIEmbeddingProvider(EmbeddingProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        try:
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(api_key=api_key)
            logger.info("Initialized OpenAI Embedding Provider.")
        except Exception as e:
            logger.warning(f"Failed to initialize OpenAI client ({e}).")
            self.client = None

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not self.client or not self.api_key:
            return MockEmbeddingProvider().embed_texts_sync(texts)
        try:
            resp = await self.client.embeddings.create(
                input=texts,
                model="text-embedding-3-small"
            )
            return [data.embedding for data in resp.data]
        except Exception as e:
            logger.error(f"OpenAI embedding call failed: {e}. Fallback to local.")
            return MockEmbeddingProvider().embed_texts_sync(texts)

class MockEmbeddingProvider(EmbeddingProvider):
    """Deterministic TF-IDF style pseudo-embedding for instant, offline local demo."""
    def embed_texts_sync(self, texts: List[str]) -> List[List[float]]:
        dim = settings.EMBEDDING_DIM
        embeddings = []
        for text in texts:
            vec = [0.0] * dim
            for idx, char in enumerate(text):
                pos = (ord(char) * 31 + idx * 7) % dim
                vec[pos] += 1.0
            norm = math.sqrt(sum(x * x for x in vec))
            if norm > 0:
                vec = [x / norm for x in vec]
            embeddings.append(vec)
        return embeddings

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return self.embed_texts_sync(texts)

def get_embedding_provider() -> EmbeddingProvider:
    provider_name = settings.EMBEDDING_PROVIDER.lower()
    if provider_name == "gemini" and settings.GEMINI_API_KEY:
        return GeminiEmbeddingProvider(settings.GEMINI_API_KEY)
    elif provider_name == "openai" and settings.OPENAI_API_KEY:
        return OpenAIEmbeddingProvider(settings.OPENAI_API_KEY)
    else:
        return MockEmbeddingProvider()
