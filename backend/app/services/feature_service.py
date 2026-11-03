"""
Feature service — transforms a raw API request into the model's feature vector.
"""

import numpy as np

from app.ml.preprocessing import preprocess_features
from app.schemas.credit_schema import CreditAssessmentRequest


def request_to_features(request: CreditAssessmentRequest) -> np.ndarray:
    """Convert a CreditAssessmentRequest into a numpy feature array.

    The returned array order matches ``FEATURE_NAMES`` defined in
    ``app.ml.preprocessing``.
    """
    raw = {
        "annual_income": request.annual_income,
        "monthly_debt": request.monthly_debt,
        "employment_length_years": request.employment_length_years,
        "home_ownership": request.home_ownership.value,
        "loan_amount": request.loan_amount,
        "loan_purpose": request.loan_purpose.value,
        "credit_history_length_years": request.credit_history_length_years,
        "num_open_accounts": request.num_open_accounts,
        "num_delinquencies": request.num_delinquencies,
        "debt_to_income_ratio": request.debt_to_income_ratio,
    }
    return preprocess_features(raw)
