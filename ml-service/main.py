from fastapi import FastAPI
from routes.generate import router as generate_router

app = FastAPI(title="Tech Intel ML Service")

app.include_router(generate_router)

@app.get("/")
def root():
    return {"message": "Tech Intel ML Service is running"}