from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.db.database import engine
from app.api.routers import auth, data_management, predictions, scheduler, graph, dashboard
from app.db import models

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    from app.db.database import SessionLocal
    from app.core.security import get_password_hash
    
    # Ensure tables are created
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == "admin").first()
        if not user:
            new_admin = models.User(
                username="admin",
                password_hash=get_password_hash("admin"),
                email="tarek.alsaleh@lau.edu",
                is_active=True
            )
            db.add(new_admin)
            db.commit()
    except Exception as e:
        print(f"Startup bootstrapping error: {e}")
    finally:
        db.close()
    yield

app = FastAPI(title="CORS Capstone API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(data_management.router, prefix="/data", tags=["Data"])
app.include_router(predictions.router, prefix="/predict", tags=["Predictions"])
app.include_router(scheduler.router, prefix="/scheduler", tags=["Scheduler"])
app.include_router(graph.router, prefix="/graph", tags=["Graph"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
