"""
Prediction service — loads the trained model and produces risk scores.
"""

import logging
import pickle
from pathlib import Path
from typing import Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "ml" / "artifacts"

_model = None
_scaler = None
_feature_names = None
_metadata = None


class ModelNotLoadedError(Exception):
    """Raised when prediction is attempted before the model is loaded."""


def load_model() -> bool:
    """Load model artifacts from disk.  Returns True on success."""
    global _model, _scaler, _feature_names, _metadata

    model_path = ARTIFACTS_DIR / "model.pkl"
    scaler_path = ARTIFACTS_DIR / "scaler.pkl"
    features_path = ARTIFACTS_DIR / "feature_names.pkl"
    meta_path = ARTIFACTS_DIR / "metadata.pkl"

    try:
        with open(model_path, "rb") as f:
            _model = pickle.load(f)
        with open(scaler_path, "rb") as f:
            _scaler = pickle.load(f)
        with open(features_path, "rb") as f:
            _feature_names = pickle.load(f)
        with open(meta_path, "rb") as f:
            _metadata = pickle.load(f)
        logger.info("ML model loaded successfully (version %s)", _metadata.get("version"))
        return True
    except FileNotFoundError as exc:
        logger.warning("Model artifacts not found at %s — run train.py first. (%s)", ARTIFACTS_DIR, exc)
        return False
    except Exception as exc:
        logger.error("Failed to load model artifacts: %s", exc)
        return False


def is_model_loaded() -> bool:
    return _model is not None


def get_model_version() -> str:
    if _metadata is None:
        return "unknown"
    return _metadata.get("version", "unknown")


def predict_risk(features: np.ndarray) -> Tuple[float, str, float]:
    """Predict default probability and risk category.

    Parameters
    ----------
    features : np.ndarray of shape (n_features,)

    Returns
    -------
    risk_score : float  — probability of default (0-1)
    risk_category : str — LOW / MEDIUM / HIGH
    confidence : float  — model confidence (max class probability)
    """
    if _model is None or _scaler is None:
        raise ModelNotLoadedError("Model is not loaded. Run train.py and restart the server.")

    features_scaled = _scaler.transform(features.reshape(1, -1))
    proba = _model.predict_proba(features_scaled)[0]

    risk_score = float(proba[1])  # probability of default
    confidence = float(max(proba))

    if risk_score < 0.3:
        risk_category = "LOW"
    elif risk_score < 0.6:
        risk_category = "MEDIUM"
    else:
        risk_category = "HIGH"

    return risk_score, risk_category, confidence


def get_feature_importances():
    """Return the model's feature importances paired with feature names."""
    if _model is None or _feature_names is None:
        return []
    importances = _model.feature_importances_
    return list(zip(_feature_names, importances))
