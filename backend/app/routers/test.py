from fastapi import APIRouter

router = APIRouter(
    tags=["test"],
)
 
@router.get("/hello")
async def test_endpoint():
    return {"message": "Hello from test endpoint"} 