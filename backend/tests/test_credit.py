"""
Pytest test suite for CredChain FastAPI endpoints and ML credit risk assessment.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.connection import Base, engine
from app.services.prediction_service import load_model

# Ensure tables exist and model is loaded for test session
Base.metadata.create_all(bind=engine)
load_model()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True


def test_assess_valid_low_risk(client):
    payload = {
        "annual_income": 120000.0,
        "monthly_debt": 1000.0,
        "employment_length_years": 8.0,
        "home_ownership": "MORTGAGE",
        "loan_amount": 3000.0,
        "loan_purpose": "PERSONAL",
        "credit_history_length_years": 10.0,
        "num_open_accounts": 4,
        "num_delinquencies": 0,
        "debt_to_income_ratio": 0.10,
        "wallet_address": "0x1111111111111111111111111111111111111111",
        "consent": True,
    }
    response = client.post("/api/credit/assess", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert "risk_category" in data
    assert "confidence" in data
    assert "contributing_factors" in data
    assert len(data["contributing_factors"]) > 0
    assert data["risk_category"] in ["LOW", "MEDIUM", "HIGH"]
    assert data["disclaimer"] != ""


def test_assess_consent_required(client):
    payload = {
        "annual_income": 50000.0,
        "monthly_debt": 1500.0,
        "employment_length_years": 2.0,
        "home_ownership": "RENT",
        "loan_amount": 5000.0,
        "loan_purpose": "PERSONAL",
        "credit_history_length_years": 3.0,
        "num_open_accounts": 3,
        "num_delinquencies": 0,
        "debt_to_income_ratio": 0.36,
        "wallet_address": "0x2222222222222222222222222222222222222222",
        "consent": False,
    }
    response = client.post("/api/credit/assess", json=payload)
    assert response.status_code == 422


def test_assess_invalid_input(client):
    payload = {
        "annual_income": -5000.0,
        "monthly_debt": 500.0,
        "employment_length_years": 1.0,
        "home_ownership": "RENT",
        "loan_amount": 1000.0,
        "loan_purpose": "PERSONAL",
        "credit_history_length_years": 1.0,
        "num_open_accounts": 1,
        "num_delinquencies": 0,
        "debt_to_income_ratio": 0.2,
        "wallet_address": "0x3333333333333333333333333333333333333333",
        "consent": True,
    }
    response = client.post("/api/credit/assess", json=payload)
    assert response.status_code == 422


def test_credit_history_endpoint(client):
    wallet = "0x1111111111111111111111111111111111111111"
    response = client.get(f"/api/credit/history/{wallet}")
    assert response.status_code == 200
    data = response.json()
    assert data["wallet_address"] == wallet.lower()
    assert data["total"] >= 1


def test_analytics_overview(client):
    response = client.get("/api/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_assessments" in data
    assert "average_risk_score" in data
    assert "risk_distribution" in data


def test_borrower_profile(client):
    wallet = "0x1111111111111111111111111111111111111111"
    response = client.get(f"/api/borrowers/{wallet}/profile")
    assert response.status_code == 200
    data = response.json()
    assert data["wallet_address"] == wallet.lower()
    assert data["total_assessments"] >= 1
