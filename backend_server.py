#!/usr/bin/env python3
"""
Backend server startup script using Uvicorn for FastAPI
Uses port 8001 to avoid conflict with frontend on port 5000
"""
import uvicorn
import sys
import os
import pathlib

# Add the backend directory to the Python path
backend_path = pathlib.Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

# Import the main FastAPI app from backend
try:
    from app.main import app
    print("✅ Successfully imported FastAPI app from backend")
except ImportError as e:
    print(f"❌ Failed to import backend app: {e}")
    # Fallback: create a minimal app
    from fastapi import FastAPI
    app = FastAPI(title="Blayz API Fallback", description="Meta Advertising Analytics Platform")
    
    @app.get("/")
    async def root():
        return {"message": "Blayz API is running (fallback mode)", "status": "healthy"}

if __name__ == "__main__":
    print("🚀 Starting Blayz Backend Server...")
    print("📍 Server URL: http://localhost:8001")
    print("📚 API Docs: http://localhost:8001/docs")
    
    # Use Uvicorn (ASGI server) instead of Gunicorn (WSGI server) for FastAPI
    uvicorn.run(
        "backend_server:app",
        host="0.0.0.0",
        port=8001,  # Use port 8001 to avoid conflict with frontend on 5000
        reload=True,
        log_level="info"
    )