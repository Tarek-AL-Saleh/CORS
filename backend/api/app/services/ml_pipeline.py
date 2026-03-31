import os
import joblib
from pathlib import Path
from sqlalchemy.orm import Session
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
import sklearn
from xgboost import XGBClassifier

# --- MONKEYPATCH FOR SKLEARN 1.6.0 BUG ---
# sklearn 1.6.0 has a bug in BaseEstimator.__sklearn_tags__() where it calls
# super().__sklearn_tags__() unconditionally, but XGBoost's base class doesn't
# define that method. This patch wraps the call in a try-except so it falls
# back safely, fixing the error without changing any training logic.
from sklearn.base import BaseEstimator
from sklearn.utils._tags import Tags

_orig_base_estimator_tags = BaseEstimator.__sklearn_tags__

def _safe_base_estimator_tags(self):
    try:
        return _orig_base_estimator_tags(self)
    except AttributeError:
        return Tags()

BaseEstimator.__sklearn_tags__ = _safe_base_estimator_tags
# -----------------------------------------

from app.db import models
from app.services.ml_feature_transformer import FeatureTransformer

MODEL_DIR = Path(__file__).resolve().parents[3] / "ai-engine" / "models"
os.makedirs(MODEL_DIR, exist_ok=True)
MODEL_PATH = MODEL_DIR / "backend_model_v1.pkl"

class MLPipeline:
    def __init__(self, db: Session):
        self.db = db
        self.ft = FeatureTransformer(db)

    def prepare_training_dataset(self):
        """
        Ports logic from ai-engine/src/dataset_initializer.py and dataset_filtering.py.
        Generates 0-labeled (not offered) rows and calculates features for all contexts.
        """
        # 1. Clear existing training data
        self.db.query(models.TrainingRecord).delete()
        
        # 2. Identify all contexts from course_offerings
        all_offerings = self.db.query(models.CourseOffering).all()
        if not all_offerings:
            return {"status": "error", "message": "No historical offerings found."}
            
        contexts = sorted(list(set((o.year, o.semester, o.campus) for o in all_offerings)))
        all_courses = self.db.query(models.Course).all()
        
        # Filter prefixes (ai-engine logic)
        allowed_prefixes = ['CSC', 'MTH', 'BIF', 'STA']
        
        new_records = []
        for year, semester, campus in contexts:
            # Efficiency: get offered codes for this context
            offered_codes = set(
                o.course_code for o in all_offerings 
                if o.year == year and o.semester == semester and o.campus == campus and o.is_offered
            )
            
            for course in all_courses:
                if course.prefix.upper() not in allowed_prefixes:
                    continue
                
                try:
                    # Calculate features using FeatureTransformer
                    vec = self.ft.build_feature_vector(course.code, year, semester, campus)
                    
                    record = models.TrainingRecord(
                        year=year,
                        semester=semester,
                        campus=campus,
                        course_code=course.code,
                        course_prefix=course.prefix,
                        is_core=vec["is_core"],
                        is_math=vec["is_math"],
                        avg_fail_ratio_3y=vec["avg_fail_ratio_3y"],
                        recent_fail_count=vec["recent_fail_count"],
                        is_offered_last_year=vec["is_offered_last_year"],
                        latent_demand_count=vec["latent_demand_count"],
                        bottleneck_score=vec["bottleneck_score"],
                        plan_alignment_score=vec["plan_alignment_score"],
                        course_level=vec["course_level"],
                        gap_since_last_offered=vec["gap_since_last_offered"],
                        is_offered=1 if course.code in offered_codes else 0
                    )
                    new_records.append(record)
                except Exception as e:
                    continue # Skip problematic calculations
        
        # 3. Insert records
        for record in new_records:
            self.db.add(record)
        
        self.db.commit()
        
        return {
            "status": "success", 
            "records_created": len(new_records),
            "positive_samples": sum(1 for r in new_records if r.is_offered == 1)
        }

    def generate_training_data(self):
        # Now we just pull from the TrainingRecord table
        records = self.db.query(models.TrainingRecord).all()
        if not records:
            # If table is empty, try to prepare it automatically
            res = self.prepare_training_dataset()
            if res.get("status") == "error":
                raise ValueError("No data available to train.")
            records = self.db.query(models.TrainingRecord).all()
        
        X_train = []
        y_train = []
        
        for r in records:
            # We still need to one-hot encode semester/campus if not already in table
            # Or just use FeatureTransformer's logic to get the final list
            features = [
                float(r.year), float(r.is_core), float(r.is_math), 
                float(r.avg_fail_ratio_3y), float(r.recent_fail_count), 
                float(r.is_offered_last_year), float(r.latent_demand_count),
                float(r.bottleneck_score), float(r.plan_alignment_score),
                float(r.course_level), float(r.gap_since_last_offered),
                1.0 if r.semester == "Fall" else 0.0,
                1.0 if r.semester == "Spring" else 0.0,
                1.0 if r.semester == "Summer" else 0.0,
                1.0 if r.campus == "Beirut" else 0.0,
                1.0 if r.campus == "Byblos" else 0.0
            ]
            X_train.append(features)
            y_train.append(r.is_offered)

        return X_train, y_train

    def train_and_save(self):
        X, y = self.generate_training_data()
        
        # Build Models with hyperparameters from capstone_cors.ipynb
        rf = RandomForestClassifier(
            n_estimators=200, 
            max_depth=None, 
            min_samples_split=5, 
            random_state=42
        )
        
        xgb_model = XGBClassifier(
            n_estimators=100, 
            max_depth=10, 
            learning_rate=0.2, 
            random_state=42, 
            eval_metric='logloss'
        )
        
        # Ensemble configuration from notebook
        ensemble = VotingClassifier(
            estimators=[('rf', rf), ('xgb', xgb_model)],
            voting='soft'
        )

        ensemble.fit(X, y)
        joblib.dump(ensemble, MODEL_PATH)

        return {
            "status": "success",
            "model_path": str(MODEL_PATH),
            "samples_trained": len(y),
            "positive_cases": sum(y)
        }

    def predict(self, points: list):
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError("Model file not found. Please train first.")
        model = joblib.load(MODEL_PATH)
        preds = model.predict(points)
        probas = model.predict_proba(points)
        return preds, probas
