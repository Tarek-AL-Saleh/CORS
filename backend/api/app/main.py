from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine, Base
# Import routers that we will create shortly
from app.api.routers import data_management, predictions, scheduler, graph, dashboard

# Create tables
from app.db import models
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CORS Capstone API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
def health_check():
    return {"status": "ok"}

# Include routers
app.include_router(data_management.router, prefix="/data", tags=["Data"])
app.include_router(predictions.router, prefix="/predict", tags=["Predictions"])
app.include_router(scheduler.router, prefix="/scheduler", tags=["Scheduler"])
app.include_router(graph.router, prefix="/graph", tags=["Graph"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
