export interface Loan {
  id: bigint;
  borrower: `0x${string}`;
  lender: `0x${string}`;
  principal: bigint;
  repaid: bigint;
  collateralAmount: bigint;
  interestRateBps: bigint;
  applicationTime: bigint;
  approvalTime: bigint;
  activationTime: bigint;
  repaymentDeadline: bigint;
  duration: bigint;
  status: number;
  riskAssessmentHash: `0x${string}`;
}

export interface ReputationRecord {
  totalLoans: bigint;
  repaidLoans: bigint;
  defaultedLoans: bigint;
  totalBorrowed: bigint;
  totalRepaid: bigint;
  lastActivityTimestamp: bigint;
}

export interface CreditAssessmentRequest {
  annual_income: number;
  monthly_debt: number;
  employment_length_years: number;
  home_ownership: "RENT" | "OWN" | "MORTGAGE";
  loan_amount: number;
  loan_purpose: string;
  credit_history_length_years: number;
  num_open_accounts: number;
  num_delinquencies: number;
  debt_to_income_ratio: number;
  wallet_address: string;
  consent: boolean;
}

export interface CreditAssessmentResponse {
  risk_score: number;
  risk_category: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  contributing_factors: FeatureImportance[];
  eligibility: string;
  model_version: string;
  assessment_id: string;
  timestamp: string;
  disclaimer: string;
}

export interface FeatureImportance {
  feature_name: string;
  importance_value: number;
  direction: string;
}

export interface EscrowDetails {
  collateral: bigint;
  loanFunds: bigint;
  repaymentBalance: bigint;
  collateralReleased: boolean;
  fundsDisbursed: boolean;
}

export interface AnalyticsOverview {
  total_assessments: number;
  average_risk_score: number;
  risk_distribution: Record<string, number>;
  total_loans_tracked: number;
}
