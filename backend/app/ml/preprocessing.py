"""
Data preprocessing pipeline for the credit scoring model.

Handles feature engineering, numerical scaling, and categorical encoding.
"""

from typing import Dict, List, Tuple

import numpy as np

# Ordered list of feature names the model expects after preprocessing.
FEATURE_NAMES: List[str] = [
    "annual_income",
    "monthly_debt",
    "employment_length_years",
    "loan_amount",
    "credit_history_length_years",
    "num_open_accounts",
    "num_delinquencies",
    "debt_to_income_ratio",
    # One-hot encoded home ownership (baseline = RENT)
    "home_own",
    "home_mortgage",
    # One-hot encoded loan purpose (baseline = PERSONAL)
    "purpose_education",
    "purpose_medical",
    "purpose_business",
    "purpose_debt_consolidation",
    "purpose_home_improvement",
    "purpose_other",
]


def encode_home_ownership(value: str) -> Tuple[int, int]:
    """One-hot encode home ownership with RENT as baseline.

    Returns (home_own, home_mortgage).
    """
    value = value.upper()
    if value == "OWN":
        return (1, 0)
    elif value == "MORTGAGE":
        return (0, 1)
    else:  # RENT or unknown
        return (0, 0)


def encode_loan_purpose(value: str) -> Tuple[int, int, int, int, int, int]:
    """One-hot encode loan purpose with PERSONAL as baseline.

    Returns tuple in order:
        (education, medical, business, debt_consolidation, home_improvement, other)
    """
    mapping = {
        "EDUCATION": 0,
        "MEDICAL": 1,
        "BUSINESS": 2,
        "DEBT_CONSOLIDATION": 3,
        "HOME_IMPROVEMENT": 4,
        "OTHER": 5,
    }
    result = [0, 0, 0, 0, 0, 0]
    idx = mapping.get(value.upper())
    if idx is not None:
        result[idx] = 1
    return tuple(result)


def preprocess_features(raw: Dict) -> np.ndarray:
    """Convert a raw feature dictionary into a 1-D numpy array matching FEATURE_NAMES.

    Parameters
    ----------
    raw : dict
        Must contain keys matching CreditAssessmentRequest fields.

    Returns
    -------
    np.ndarray of shape (len(FEATURE_NAMES),)
    """
    numerical = [
        float(raw["annual_income"]),
        float(raw["monthly_debt"]),
        float(raw["employment_length_years"]),
        float(raw["loan_amount"]),
        float(raw["credit_history_length_years"]),
        int(raw["num_open_accounts"]),
        int(raw["num_delinquencies"]),
        float(raw["debt_to_income_ratio"]),
    ]

    home = list(encode_home_ownership(raw.get("home_ownership", "RENT")))
    purpose = list(encode_loan_purpose(raw.get("loan_purpose", "PERSONAL")))

    features = numerical + home + purpose
    return np.array(features, dtype=np.float64)
