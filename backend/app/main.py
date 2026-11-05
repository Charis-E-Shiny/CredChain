"""
CredChain Backend Application Entry Point.
FastAPI application providing credit assessment, loan indexing, and analytics.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.analytics import router as analytics_router
from app.api.credit import router as credit_router
from app.api.loans import router as loans_router
from app.api.passport import router as passport_router
from app.api.users import router as users_router
from app.api.verification import router as verification_router
from app.database.connection import Base, create_schema, engine
from app.services.prediction_service import is_model_loaded, load_model

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("credchain")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database tables
    logger.info("Initializing database schema...")
    create_schema()

    # Startup: Load ML model artifacts
    logger.info("Attempting to load trained credit model...")
    success = load_model()
    if success:
        logger.info("ML credit model loaded and ready.")
    else:
        logger.warning("ML model not loaded — fallback risk calculation active until trained.")

    yield

    # Shutdown
    logger.info("CredChain backend shutting down...")


app = FastAPI(
    title="CredChain — AI Decentralized Credit Scoring API",
    description="Educational FinTech prototype combining off-chain ML credit risk assessment with on-chain Ethereum lending contracts.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers under /api
app.include_router(credit_router, prefix="/api")
app.include_router(loans_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(passport_router, prefix="/api")
app.include_router(verification_router, prefix="/api")


@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint returning system status and model readiness."""
    return {
        "status": "healthy",
        "service": "CredChain AI Credit Scoring",
        "model_loaded": is_model_loaded(),
        "disclaimer": "Academic prototype. Testnet environment only.",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
