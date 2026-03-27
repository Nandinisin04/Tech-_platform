from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.pipeline import run_technology_pipeline

router = APIRouter()

class GenerateRequest(BaseModel):
    technology: str

@router.post("/generate")
def generate_technology(data: GenerateRequest):
    try:
        result = run_technology_pipeline(data.technology)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))