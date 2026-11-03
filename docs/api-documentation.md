# CredChain — REST API Documentation

The backend service is built using **FastAPI** (Python 3.12) with **SQLAlchemy** ORM and **Pydantic** schema validation.

Base URL: `http://localhost:8000/api`

---

## Endpoints Summary

### 1. Health Check
`GET /api/health`
- **Description**: Verifies service status and ML model availability.
- **Response**:
```json
{
  "status": "healthy",
  "service": "CredChain AI Credit Scoring",
  "model_loaded": true,
  "disclaimer": "Academic prototype. Testnet environment only."
}
```

---

### 2. Credit Risk Assessment
`POST /api/credit/assess`
- **Description**: Evaluates consented borrower financial attributes using the trained GradientBoosting classifier.
- **Request Body**:
```json
{
  "annual_income": 75000.0,
  "monthly_debt": 800.0,
  "employment_length_years": 4.0,
  "home_ownership": "RENT",
  "loan_amount": 2500.0,
  "loan_purpose": "PERSONAL",
  "credit_history_length_years": 6.0,
  "num_open_accounts": 4,
  "num_delinquencies": 0,
  "debt_to_income_ratio": 0.15,
  "wallet_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "consent": true
}
```

- **Response Body**:
```json
{
  "risk_score": 0.184,
  "risk_category": "LOW",
  "confidence": 0.816,
  "contributing_factors": [
    {
      "feature_name": "monthly_debt",
      "importance_value": 0.2084,
      "direction": "positive"
    },
    {
      "feature_name": "employment_length_years",
      "importance_value": 0.1877,
      "direction": "negative"
    }
  ],
  "eligibility": "Eligible for standard and prime micro-lending tiers with preferred rates.",
  "model_version": "v1.0.0-gb",
  "assessment_id": "4b684cb3-0ea1-427f-94ad-737704b20755",
  "timestamp": "2026-11-03T08:30:00Z",
  "disclaimer": "Educational prototype only. Not for real financial decisions."
}
```

---

### 3. Credit Assessment History
`GET /api/credit/history/{wallet_address}`
- **Description**: Retrieves historical assessment records for a specific wallet address.

---

### 4. Loan Indexing
`GET /api/loans`
- **Query Parameters**: `page` (default 1), `page_size` (default 10), `wallet` (optional).
- **Description**: Lists paginated on-chain loan references cached in the local database.

---

### 5. Borrower Profile
`GET /api/borrowers/{wallet_address}/profile`
- **Description**: Returns public borrower profile, total assessments performed, and historical risk categories.

---

### 6. Analytics Overview
`GET /api/analytics/overview`
- **Description**: Global platform analytics including risk band distributions (LOW, MEDIUM, HIGH) and total assessments conducted.
