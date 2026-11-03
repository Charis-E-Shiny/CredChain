"""
Model evaluation utilities for the CredChain credit scoring model.
"""

from typing import Dict, Tuple

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


def evaluate_model(model, X_test: np.ndarray, y_test: np.ndarray) -> Dict:
    """Run full evaluation suite on a fitted model.

    Returns a dict of scalar metrics.
    """
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, y_prob)),
    }
    return metrics


def get_confusion_matrix(model, X_test: np.ndarray, y_test: np.ndarray) -> np.ndarray:
    """Return the confusion matrix."""
    y_pred = model.predict(X_test)
    return confusion_matrix(y_test, y_pred)


def get_classification_report(model, X_test: np.ndarray, y_test: np.ndarray) -> str:
    """Return a formatted classification report string."""
    y_pred = model.predict(X_test)
    return classification_report(y_test, y_pred, target_names=["No Default", "Default"])


def compute_risk_distribution(probabilities: np.ndarray) -> Dict[str, int]:
    """Categorize an array of predicted probabilities into risk buckets."""
    return {
        "LOW": int(np.sum(probabilities < 0.3)),
        "MEDIUM": int(np.sum((probabilities >= 0.3) & (probabilities < 0.6))),
        "HIGH": int(np.sum(probabilities >= 0.6)),
    }
