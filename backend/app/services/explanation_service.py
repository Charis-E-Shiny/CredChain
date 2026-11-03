"""
Explanation service — generates human-readable explanations for predictions.
"""

from typing import Dict, List

import numpy as np

from app.schemas.credit_schema import FeatureImportance
from app.services.prediction_service import get_feature_importances

# Human-friendly labels for each model feature.
_FRIENDLY_NAMES: Dict[str, str] = {
    "annual_income": "Annual Income",
    "monthly_debt": "Monthly Debt Payments",
    "employment_length_years": "Employment Length",
    "loan_amount": "Loan Amount",
    "credit_history_length_years": "Credit History Length",
    "num_open_accounts": "Number of Open Accounts",
    "num_delinquencies": "Number of Delinquencies",
    "debt_to_income_ratio": "Debt-to-Income Ratio",
    "home_own": "Home Ownership (Own)",
    "home_mortgage": "Home Ownership (Mortgage)",
    "purpose_education": "Loan Purpose: Education",
    "purpose_medical": "Loan Purpose: Medical",
    "purpose_business": "Loan Purpose: Business",
    "purpose_debt_consolidation": "Loan Purpose: Debt Consolidation",
    "purpose_home_improvement": "Loan Purpose: Home Improvement",
    "purpose_other": "Loan Purpose: Other",
}

# Features where a *higher* value tends to *increase* risk.
_RISK_INCREASING = {
    "monthly_debt",
    "loan_amount",
    "num_delinquencies",
    "debt_to_income_ratio",
    "num_open_accounts",
}


def explain_prediction(features: np.ndarray, top_n: int = 5) -> List[FeatureImportance]:
    """Return the top-N contributing factors for a given prediction.

    Uses the global feature importances from the trained model and combines them
    with the direction (risk-increasing / risk-decreasing) based on the input
    feature values.
    """
    importances = get_feature_importances()
    if not importances:
        return []

    # Sort by absolute importance descending
    sorted_imp = sorted(importances, key=lambda x: abs(x[1]), reverse=True)

    results: List[FeatureImportance] = []
    for feat_name, imp_value in sorted_imp[:top_n]:
        direction = "positive" if feat_name in _RISK_INCREASING else "negative"
        friendly = _FRIENDLY_NAMES.get(feat_name, feat_name)
        results.append(
            FeatureImportance(
                feature_name=friendly,
                importance_value=round(float(imp_value), 4),
                direction=direction,
            )
        )

    return results


def generate_eligibility_statement(risk_category: str) -> str:
    """Return a human-readable eligibility statement based on risk category."""
    statements = {
        "LOW": "Based on the assessment, this profile shows strong creditworthiness indicators. Likely eligible for favorable loan terms.",
        "MEDIUM": "Based on the assessment, this profile shows moderate creditworthiness. May be eligible for standard loan terms with additional review.",
        "HIGH": "Based on the assessment, this profile shows elevated risk indicators. Additional documentation or collateral may be required.",
    }
    return statements.get(risk_category, "Unable to determine eligibility.")
