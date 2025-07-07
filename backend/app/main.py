import os
import pathlib
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.status import HTTP_401_UNAUTHORIZED
import logging

from app.routers import auth as auth_router, insights, trend_analysis, sync, data_status, test, company_profiles
# Temporarily commented out facebook import due to requests dependency issue
# from app.routers import facebook
from app.auth import validate_token
from app.database import init_db
from app.logging_config import setup_logging

# Load environment variables EARLY for CORS config
env_path = pathlib.Path(__file__).parents[2] / '.env'
load_dotenv(dotenv_path=env_path)

# Setup Logging
setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AdSet Analytics API",
    description="API for analyzing Facebook AdSet performance and detecting anomalies.",
    version="0.1.0"
)

# Configure CORS
origins = [
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
    # Add other allowed origins if needed
]
logger.info(f"Configuring CORS with origins: {origins}", extra={"event_type": "cors_config"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication middleware
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    allowed_origin = os.getenv("FRONTEND_URL", "http://localhost:3000") 
    error_headers = {"Access-Control-Allow-Origin": allowed_origin}

    if request.method == "OPTIONS":
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = allowed_origin
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    # Log all incoming request paths and their auth headers for debugging this specific issue
    logger.info(f"[MIDDLEWARE_DEBUG] Path: {request.url.path}, Auth Header: {request.headers.get('Authorization')}", extra={"event_type": "middleware_path_auth_header_debug"})

    if request.url.path in ["/health", "/docs", "/openapi.json", "/api/v1/test/hello", "/api/company-profiles/webhook-callback"] or request.url.path.startswith("/docs/") or request.url.path.startswith("/api/v1/public/"):
        return await call_next(request)
    
    auth_header = request.headers.get("Authorization")
    source_ip = request.client.host if request.client else None

    if not auth_header:
        logger.warning(
            f"Missing authentication token for path: {request.url.path}", 
            extra={
                "event_type": "auth_failure_missing_token", 
                "source_ip": source_ip,
                "path": str(request.url.path)
            }
        )
        return JSONResponse(
            status_code=HTTP_401_UNAUTHORIZED,
            content={"detail": "Missing authentication token"},
            headers=error_headers
        )
    
    try:
        token = auth_header.replace("Bearer ", "")
        user = validate_token(token, source_ip=source_ip)
        request.state.user = user 
        response = await call_next(request)
        return response
    except HTTPException as e:
        logger.warning(
            f"Authentication HTTPException for path {request.url.path}: {e.detail}", 
            extra={
                "event_type": "auth_http_exception", 
                "source_ip": source_ip, 
                "path": str(request.url.path),
                "error_detail": str(e.detail),
                "status_code": e.status_code
            }
        )
        return JSONResponse(
            status_code=e.status_code,
            content={"detail": e.detail},
            headers=error_headers
        )
    except Exception as e:
        logger.error(
            f"Unexpected error during authentication for path {request.url.path}: {str(e)}", 
            exc_info=True,
            extra={
                "event_type": "auth_unexpected_error", 
                "source_ip": source_ip, 
                "path": str(request.url.path)
            }
        )
        return JSONResponse(
            status_code=HTTP_401_UNAUTHORIZED,
            content={"detail": "An unexpected authentication error occurred"},
            headers=error_headers
        )

# Example of a health check endpoint (publicly accessible)
@app.get("/health")
async def health_check():
    logger.info("Health check endpoint accessed.", extra={"event_type": "health_check"})
    return {"status": "healthy"}

# Include your existing routers
app.include_router(auth_router.router, prefix="/api/auth", tags=["Authentication"])
# Temporarily commented out facebook router due to requests dependency issue
# app.include_router(facebook.router, prefix="/api/facebook", tags=["Facebook Integration"])
app.include_router(insights.router, prefix="/api/insights", tags=["Insights"])
app.include_router(trend_analysis.router, prefix="/api/trend-analysis", tags=["Trend Analysis"])
app.include_router(sync.router, prefix="/api/sync", tags=["Data Synchronization"])
app.include_router(data_status.router, prefix="/api/v1/data-status", tags=["Data Status Public"])
logger.info("Data Status router included with prefix /api/v1/data-status", extra={"event_type": "router_inclusion", "router": "data_status"})
app.include_router(test.router, prefix="/api/v1/test", tags=["Test"])
logger.info("Test router included with prefix /api/v1/test", extra={"event_type": "router_inclusion", "router": "test"})
app.include_router(company_profiles.router, prefix="/api/company-profiles", tags=["Company Profiles"])
logger.info("Company Profiles router included with prefix /api/company-profiles", extra={"event_type": "router_inclusion", "router": "company_profiles"})

@app.on_event("startup")
async def startup_event():
    await init_db()
    logger.info("FastAPI application startup complete.", extra={"event_type": "app_startup"})

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI application shutdown.", extra={"event_type": "app_shutdown"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
