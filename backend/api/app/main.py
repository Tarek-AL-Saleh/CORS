from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.db.database import engine
from app.api.routers import auth, data_management, predictions, scheduler, graph, dashboard, users, logs
from app.db import models

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    from app.db.database import SessionLocal
    from app.core.security import get_password_hash
    
    import os
    # Emergency Reset Logic
    if os.getenv("FORCE_DB_RESET") == "true":
        print("!!! FORCE_DB_RESET detected. Wiping all tables...")
        models.Base.metadata.drop_all(bind=engine)
        print("Database wiped.")


    # Ensure tables are created
    models.Base.metadata.create_all(bind=engine)
    
    # Manual migration for existing tables
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE prediction_runs ADD COLUMN IF NOT EXISTS campus VARCHAR;"))
            conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS aliases TEXT;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;"))
            conn.commit()
    except Exception as e:
        print(f"Schema migration warning: {e}")
    
    db = SessionLocal()
    try:
        # 0. Automatic Structural Migrations (Cross-listing unification)
        from app.services.migration_service import run_course_unification
        run_course_unification(db)

        # 1. Bootstrapping Admin User
        admin_user = os.getenv("ADMIN_USERNAME", "admin")
        admin_pass = os.getenv("ADMIN_PASSWORD", "admin")
        admin_email = os.getenv("ADMIN_EMAIL", "tarek.alsaleh@lau.edu")

        user = db.query(models.User).filter(models.User.username == admin_user).first()
        if not user:
            new_admin = models.User(
                username=admin_user,
                password_hash=get_password_hash(admin_pass),
                email=admin_email,
                is_active=True,
                is_admin=True
            )
            db.add(new_admin)
            db.commit()
        else:
            if not getattr(user, 'is_admin', False):
                user.is_admin = True
                db.commit()

        # 2. Auto-training if models are missing (for Ephemeral Filesystems like Render)
        from app.services.ml_pipeline import MLPipeline, MODEL_DIR
        import os
        model_beirut = MODEL_DIR / "ensemble_model_beirut.pkl"
        model_byblos = MODEL_DIR / "ensemble_model_byblos.pkl"
        if not os.path.exists(model_beirut) or not os.path.exists(model_byblos):
            print("Model files missing (Post-Deployment). Auto-training starting...")
            pipeline = MLPipeline(db)
            pipeline.train_and_save()
            print("Startup Auto-training complete.")

    except Exception as e:
        print(f"Startup bootstrapping error: {e}")
    finally:
        db.close()
    yield

app = FastAPI(title="CORS Capstone API", version="1.0.0", lifespan=lifespan)

import os

# We read FRONTEND_URL if provided, else we allow vercel apps broadly via regex.
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        frontend_url,
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
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
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(logs.router, prefix="/logs", tags=["Logs"])
