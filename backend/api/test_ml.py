from app.db.database import SessionLocal
from app.services.ml_pipeline import MLPipeline
import traceback

db = SessionLocal()
pipeline = MLPipeline(db)
try:
    # print("Starting dataset initialization...")
    # res_init = pipeline.prepare_training_dataset()
    # print("Init Result:", res_init)
    
    print("Starting model training...")
    res_train = pipeline.train_and_save()
    print("Train Result:", res_train)
except Exception as e:
    print("ERROR DURING ML PROCESS:")
    traceback.print_exc()
finally:
    db.close()
