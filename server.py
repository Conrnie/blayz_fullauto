#!/usr/bin/env python3

import sys
import os
import pathlib

# Add the backend directory to the Python path
backend_path = pathlib.Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

if __name__ == "__main__":
    import uvicorn
    from app.main import app
    
    # Run on port 8000 to avoid conflicts with frontend on port 5000
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)