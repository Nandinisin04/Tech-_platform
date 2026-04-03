from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.pipeline import run_technology_pipeline
from scripts.run_global_patents import run_global_patent_pipeline
from scripts.run_global_trends import run_global_trends_pipeline
from scripts.run_global_investments import run_global_investments_pipeline
from scripts.run_india_publications import run_india_publications_pipeline
from scripts.run_india_patents import run_india_patents_pipeline

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
    


@router.post("/internal/run-global-investments")
def run_global_investments():
    result = run_global_investments_pipeline()
    return {"investments": result}

@router.post("/internal/run-global-patents")
def run_global_patents():
    result = run_global_patent_pipeline()
    return {"patents": result}


@router.post("/internal/run-global-trends")
def run_global_trends():
    result = run_global_trends_pipeline()
    return {"trends": result}

@router.post("/internal/run-india-publications")
def run_india_publications():
    result = run_india_publications_pipeline()
    return {"publications": result}


@router.post("/internal/run-india-patents")
def run_india_patents():
    result = run_india_patents_pipeline()
    return {"patents": result}