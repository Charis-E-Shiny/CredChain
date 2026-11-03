"""
ML training script for the CredChain credit scoring model.

Generates a SYNTHETIC credit dataset and trains a GradientBoosting classifier.
The synthetic data is designed with realistic distributions for educational purposes.

Usage:
    python -m app.ml.train
"""

import os
import pickle
from pathlib import Path

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from app.ml.preprocessing import FEATURE_NAMES, encode_home_ownership, encode_loan_purpose

ARTIFACTS_DIR = Path(__file__).parent / "artifacts"
MODEL_VERSION = "1.0.0"
RANDOM_SEED = 42
N_SAMPLES = 2000


def generate_synthetic_dataset(n: int = N_SAMPLES, seed: int = RANDOM_SEED):
    """Generate a synthetic credit dataset with realistic distributions.

    Feature distributions:
    - annual_income:  Normal(55000, 20000), clipped to [15000, 200000]
    - monthly_debt:   Proportional to income (~15-40 %) with Gaussian noise
    - employment_length_years: Uniform(0, 30)
    - home_ownership: Categorical — 40 % RENT, 30 % OWN, 30 % MORTGAGE
    - loan_amount:    Uniform(1000, 50000)
    - loan_purpose:   Categorical uniform across 7 categories
    - credit_history_length_years: employment_length * rand + noise, clipped [0, 40]
    - num_open_accounts: Poisson(5)
    - num_delinquencies: Poisson(0.5)
    - debt_to_income_ratio: (monthly_debt * 12) / annual_income

    Target (default):
        Generated via a logistic function of key features so the label is
        correlated with financial health indicators.

    Returns
    -------
    X : np.ndarray of shape (n, len(FEATURE_NAMES))
    y : np.ndarray of shape (n,) — binary labels (0 = no default, 1 = default)
    """
    rng = np.random.RandomState(seed)

    # --- Numerical features ---
    annual_income = np.clip(rng.normal(55000, 20000, n), 15000, 200000)
    monthly_debt = annual_income * rng.uniform(0.15, 0.40, n) / 12 + rng.normal(0, 200, n)
    monthly_debt = np.clip(monthly_debt, 0, None)
    employment_length = rng.uniform(0, 30, n)
    loan_amount = rng.uniform(1000, 50000, n)
    credit_history_length = np.clip(employment_length * rng.uniform(0.3, 1.0, n) + rng.normal(0, 2, n), 0, 40)
    num_open_accounts = rng.poisson(5, n)
    num_delinquencies = rng.poisson(0.5, n)
    debt_to_income_ratio = np.where(annual_income > 0, (monthly_debt * 12) / annual_income, 0)

    # --- Categorical features ---
    home_choices = rng.choice(["RENT", "OWN", "MORTGAGE"], n, p=[0.4, 0.3, 0.3])
    purpose_choices = rng.choice(
        ["PERSONAL", "EDUCATION", "MEDICAL", "BUSINESS", "DEBT_CONSOLIDATION", "HOME_IMPROVEMENT", "OTHER"],
        n,
    )

    # --- Encode categoricals ---
    home_encoded = np.array([encode_home_ownership(h) for h in home_choices])  # (n, 2)
    purpose_encoded = np.array([encode_loan_purpose(p) for p in purpose_choices])  # (n, 6)

    # --- Assemble feature matrix ---
    X = np.column_stack(
        [
            annual_income,
            monthly_debt,
            employment_length,
            loan_amount,
            credit_history_length,
            num_open_accounts,
            num_delinquencies,
            debt_to_income_ratio,
            home_encoded,
            purpose_encoded,
        ]
    )

    # --- Generate target using a logistic function of key features ---
    # Higher risk when: low income, high debt, many delinquencies,
    #                    short employment, large loan amount
    z = (
        -2.0
        + (-0.00003 * annual_income)  # higher income → lower risk
        + (0.002 * monthly_debt)  # higher debt → higher risk
        + (-0.05 * employment_length)  # longer employment → lower risk
        + (0.00002 * loan_amount)  # bigger loan → higher risk
        + (-0.04 * credit_history_length)  # longer history → lower risk
        + (0.3 * num_delinquencies)  # more delinquencies → higher risk
        + (1.0 * debt_to_income_ratio)  # higher DTI → higher risk
        + rng.normal(0, 0.5, n)  # noise
    )
    prob_default = 1.0 / (1.0 + np.exp(-z))
    y = (rng.rand(n) < prob_default).astype(int)

    return X, y


def train_model():
    """Train the GradientBoosting model and save artifacts."""
    print("=" * 60)
    print("CredChain ML Model Training")
    print("=" * 60)

    # --- Generate data ---
    print(f"\nGenerating synthetic dataset with {N_SAMPLES} samples …")
    X, y = generate_synthetic_dataset()
    print(f"  Feature matrix shape: {X.shape}")
    print(f"  Target distribution:  {dict(zip(*np.unique(y, return_counts=True)))}")

    # --- Split ---
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )
    print(f"  Train size: {len(X_train)}, Test size: {len(X_test)}")

    # --- Scale numerical features ---
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # --- Train ---
    print("\nTraining GradientBoostingClassifier …")
    model = GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.1,
        max_depth=4,
        min_samples_split=10,
        min_samples_leaf=5,
        subsample=0.8,
        random_state=RANDOM_SEED,
    )
    model.fit(X_train_scaled, y_train)

    # --- Evaluate ---
    y_pred = model.predict(X_test_scaled)
    y_prob = model.predict_proba(X_test_scaled)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_prob)

    print("\n--- Evaluation Metrics ---")
    print(f"  Accuracy:  {accuracy:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print(f"  F1 Score:  {f1:.4f}")
    print(f"  ROC-AUC:   {roc_auc:.4f}")

    print("\n--- Confusion Matrix ---")
    cm = confusion_matrix(y_test, y_pred)
    print(cm)

    print("\n--- Classification Report ---")
    print(classification_report(y_test, y_pred, target_names=["No Default", "Default"]))

    # --- Feature importances ---
    importances = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    print("--- Feature Importances ---")
    for idx in sorted_idx:
        print(f"  {FEATURE_NAMES[idx]:35s} {importances[idx]:.4f}")

    # --- Save artifacts ---
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    model_path = ARTIFACTS_DIR / "model.pkl"
    scaler_path = ARTIFACTS_DIR / "scaler.pkl"
    features_path = ARTIFACTS_DIR / "feature_names.pkl"
    meta_path = ARTIFACTS_DIR / "metadata.pkl"

    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)
    with open(features_path, "wb") as f:
        pickle.dump(FEATURE_NAMES, f)
    with open(meta_path, "wb") as f:
        pickle.dump({"version": MODEL_VERSION, "n_samples": N_SAMPLES, "roc_auc": roc_auc}, f)

    print(f"\nArtifacts saved to {ARTIFACTS_DIR.resolve()}")
    print("Done ✓")
    return model, scaler


if __name__ == "__main__":
    train_model()
