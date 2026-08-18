# =========================================================================
#  main.py — AI Diagnostic Knowledge Base FastAPI Application
# =========================================================================

import logging
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from db.connection import db_pool
from routes import fleet, baseline, drift, diagnosis, knowledge_base, health_report

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("AI_Diagnostic_KB")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} on port {settings.PORT}...")
    await db_pool.connect()
    yield
    await db_pool.disconnect()
    logger.info("Service shut down cleanly.")

app = FastAPI(
    title=settings.APP_NAME,
    description="Industrial Chiller & Cooling Tower AI Predictive Maintenance, Statistical Drift Detection & RAG Knowledge Base",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Sub-Routers
app.include_router(fleet.router)
app.include_router(baseline.router)
app.include_router(drift.router)
app.include_router(diagnosis.router)
app.include_router(knowledge_base.router)
app.include_router(health_report.router)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database_connected": db_pool.is_connected,
        "llm_provider": settings.LLM_PROVIDER,
        "embedding_provider": settings.EMBEDDING_PROVIDER,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/")
def root_index():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs_url": "/docs",
        "status": "operational"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main.py:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
