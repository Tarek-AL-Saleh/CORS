import os
import joblib
import json
import numpy as np
from pathlib import Path
from sqlalchemy.orm import Session
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import precision_recall_curve, auc
import sklearn
from xgboost import XGBClassifier

# --- MONKEYPATCH FOR SKLEARN 1.6.0 BUG ---
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
MODEL_DIR.mkdir(parents=True, exist_ok=True)
THRESHOLDS_PATH = MODEL_DIR / "thresholds.json"

class MLPipeline:
    def __init__(self, db: Session):
        self.db = db
        self.ft = FeatureTransformer(db)

    def prepare_training_dataset(self):
        """
        Generates 0-labeled (not offered) rows and calculates features for all contexts.
        """
        self.db.query(models.TrainingRecord).delete()
        
        all_offerings = self.db.query(models.CourseOffering).all()
        if not all_offerings:
            return {"status": "error", "message": "No historical offerings found."}
            
        contexts = sorted(list(set((o.year, o.semester, o.campus) for o in all_offerings)))
        all_courses = self.db.query(models.Course).all()
        
        allowed_prefixes = ['CSC', 'MTH', 'BIF', 'STA']
        new_records = []
        for year, semester, campus in contexts:
            offered_codes = set(
                o.course_code for o in all_offerings 
                if o.year == year and o.semester == semester and o.campus == campus and o.is_offered
            )
            
            for course in all_courses:
                if course.prefix.upper() not in allowed_prefixes:
                    continue
                
                try:
                    vec = self.ft.build_feature_vector(course.code, year, semester, campus, 0)
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
                    continue 
        
        for record in new_records:
            self.db.add(record)
        
        self.db.commit()
        return {
            "status": "success", 
            "records_created": len(new_records),
            "positive_samples": sum(1 for r in new_records if r.is_offered == 1)
        }

    def generate_training_data(self, target_campus: str):
        # We query all records for a specific campus!
        records = self.db.query(models.TrainingRecord).filter(models.TrainingRecord.campus == target_campus).all()
        if not records:
            raise ValueError(f"No data available to train for {target_campus}.")
        
        X_train = []
        y_train = []
        
        for r in records:
            features = [
                float(r.year), float(r.is_core), float(r.is_math), 
                float(r.avg_fail_ratio_3y), float(r.recent_fail_count), 
                float(r.is_offered_last_year), float(r.latent_demand_count),
                float(r.bottleneck_score), float(r.plan_alignment_score),
                float(r.course_level), float(r.gap_since_last_offered),
                1.0 if r.semester == "Fall" else 0.0,
                1.0 if r.semester == "Spring" else 0.0,
                1.0 if r.semester == "Summer" else 0.0
            ]
            X_train.append(features)
            y_train.append(r.is_offered)

        return np.array(X_train), np.array(y_train)

    def train_campus_model(self, campus: str):
        X, y = self.generate_training_data(campus)
        # Using optimal parameters from notebooks
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
        
        ensemble = VotingClassifier(
            estimators=[('rf', rf), ('xgb', xgb_model)],
            voting='soft'
        )
        ensemble.fit(X, y)

        # Generate predictions on train set to find optimal F-Beta threshold for this campus
        y_probs = ensemble.predict_proba(X)[:, 1]
        precisions, recalls, thresholds = precision_recall_curve(y, y_probs)
        
        # Avoid division by zero
        beta = 1.5
        fbeta_scores = ((1 + beta**2) * precisions * recalls) / ((beta**2 * precisions) + recalls + 1e-8)
        best_idx_fbeta = np.argmax(fbeta_scores)
        
        # Fallback if threshold is missing at edge case
        try:
            best_threshold = float(thresholds[best_idx_fbeta])
        except IndexError:
            best_threshold = 0.5 

        model_path = MODEL_DIR / f"ensemble_model_{campus.lower()}.pkl"
        joblib.dump(ensemble, model_path)

        return best_threshold

    def train_and_save(self):
        records = self.db.query(models.TrainingRecord).all()
        if not records:
            res = self.prepare_training_dataset()
            if res.get("status") == "error":
                raise ValueError("No data available to train.")

        # Train for both campuses and save threshold
        threshold_beirut = self.train_campus_model("Beirut")
        threshold_byblos = self.train_campus_model("Byblos")

        threshold_data = {
            "Beirut": threshold_beirut,
            "Byblos": threshold_byblos
        }

        with open(THRESHOLDS_PATH, "w") as f:
            json.dump(threshold_data, f, indent=4)

        total_records = self.db.query(models.TrainingRecord).count()

        return {
            "status": "success",
            "message": "Ensemble models for both Beirut and Byblos trained successfully.",
            "samples_trained": total_records,
            "thresholds": threshold_data
        }

    def predict(self, points: list, campus: str):
        model_path = MODEL_DIR / f"ensemble_model_{campus.lower()}.pkl"
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found for {campus}. Please train first.")
        
        model = joblib.load(model_path)
        probas = model.predict_proba(points)
        
        # Dynamically load the calculated F1.5 thresholds
        try:
            with open(THRESHOLDS_PATH, "r") as f:
                thresholds = json.load(f)
            threshold = thresholds.get(campus, 0.4) # default fallback
        except:
            threshold = 0.4

        preds = (probas[:, 1] >= threshold).astype(int)
        
        return preds, probas
