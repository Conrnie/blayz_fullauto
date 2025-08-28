#!/usr/bin/env python3

import sys
import os
import pathlib

# Add the backend directory to the Python path
backend_path = pathlib.Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

# Now import the FastAPI app - this will work after the path is set
try:
    from app.main import app
except ImportError:
    # Fallback: create a minimal app
    from fastapi import FastAPI
    app = FastAPI(title="Blayz API", description="Meta Advertising Analytics Platform")
    
    @app.get("/")
    async def root():
        return {"message": "Blayz API is running", "status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)