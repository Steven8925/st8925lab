# =========================================================================
#  config.py — Configuration Management for AI Diagnostic KB
# =========================================================================

import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

try:
    from dotenv import load_dotenv
    # Search for .env from current working dir up to st8925lab workspace root
    for candidate in [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent / ".env",
        Path(__file__).resolve().parents[2] / ".env",
        Path(__file__).resolve().parents[3] / ".env",
    ]:
        if candidate.is_file():
            load_dotenv(candidate, override=False)
            break
except ImportError:
    pass

class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Diagnostic Knowledge Base"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    PORT: int = int(os.getenv("PORT", 5000))
    HOST: str = "0.0.0.0"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://wayne_user:Wayne_Secure_Timescale_2026!@localhost:5432/wayne_iot"
    )

    # LLM Provider Configuration
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "nvidia") # "nvidia" | "gemini" | "openai" | "ollama" | "mock"
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    # 2026-09-24 裁示 C：模型依用途分離，NVIDIA_MODEL 已停用。診斷推論屬
    # 對話側，故讀 NVIDIA_CHAT_MODEL；抽取側用 NVIDIA_EXTRACTION_MODEL。
    NVIDIA_MODEL: str = os.getenv("NVIDIA_CHAT_MODEL", "nvidia/nemotron-3-super-120b-a12b")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    # Embedding Provider Configuration
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "gemini") # "gemini" | "openai" | "mock"
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-004")
    EMBEDDING_DIM: int = int(os.getenv("EMBEDDING_DIM", 768))

    # CORS
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "https://st8925lab.com,https://www.st8925lab.com,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    )

    # Notification & Alerting webhook
    NOTIFICATION_API_BASE_URL: str = os.getenv("NOTIFICATION_API_BASE_URL", "https://st8925lab-alarm-api.onrender.com")

    @property
    def cors_origin_list(self) -> List[str]:
        return [orig.strip() for orig in self.CORS_ORIGINS.split(",") if orig.strip()]

settings = Settings()
