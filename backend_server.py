#!/usr/bin/env python3

import sys
import os
import pathlib

# Add the backend directory to the Python path
backend_path = pathlib.Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

# Now import the FastAPI app
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create FastAPI app
app = FastAPI(title="Blayz Automation API", description="AI-powered Meta ads automation system")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
try:
    from app.routers import automation
    app.include_router(automation.router, prefix="/api")
except ImportError as e:
    print(f"Warning: Could not import automation router: {e}")

@app.get("/")
async def root():
    return {"message": "Blayz Automation API is running", "status": "healthy", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend_server:app", host="0.0.0.0", port=8000, reload=True)