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
  predicted_default_probability?: number;
  raw_risk_score?: number | null;
  verification_adjustment?: number | null;
  verification_score_adjustment?: number | null;
  risk_category: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  contributing_factors: FeatureImportance[];
  eligibility: string;
  model_version: string;
  assessment_id: string;
  timestamp: string;
  disclaimer: string;
  verification_status?: VerificationStatusType | string;
  declared_income?: number;
  declared_gross_monthly_income?: number;
  extracted_income?: number | null;
  extracted_gross_monthly_income?: number | null;
  extracted_net_monthly_income?: number | null;
  income_discrepancy_percentage?: number | null;
  reconciliation_variance?: number | null;
  verification_notes?: string | null;
  requires_manual_review?: boolean;
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

export type VerificationStatusType = "UNVERIFIED" | "EVIDENCE_CHECKED" | "SOURCE_VERIFIED" | "MANUAL_REVIEW";

export interface VerificationDocumentItem {
  id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  document_type: string;
  upload_timestamp: string;
  status: string;
  extracted_income: number | null;
  extracted_gross_income?: number | null;
  extracted_net_income?: number | null;
  basic_salary?: number | null;
  allowances?: number | null;
  total_deductions?: number | null;
  extraction_confidence: number | null;
}

export interface VerificationStatusResponse {
  wallet_address: string;
  status: VerificationStatusType;
  declared_annual_income: number;
  declared_monthly_income: number;
  declared_monthly_debt: number;
  declared_employment_years: number;
  extracted_monthly_income: number;
  extracted_gross_monthly_income?: number;
  extracted_net_monthly_income?: number | null;
  basic_salary?: number | null;
  allowances?: number | null;
  total_deductions?: number | null;
  discrepancy_percentage: number;
  tolerance_percentage: number;
  record_hash: string | null;
  verifier_notes: string | null;
  verifier_address: string | null;
  source_verifier_name: string | null;
  on_chain_tx_hash: string | null;
  documents: VerificationDocumentItem[];
  updated_at: string;
  can_proceed_standard_lending: boolean;
  lending_route: string;
}

export interface DiscrepancyReport {
  declared_annual_income: number;
  declared_monthly_income: number;
  extracted_monthly_income: number;
  extracted_gross_monthly_income?: number;
  extracted_net_monthly_income?: number | null;
  basic_salary?: number | null;
  allowances?: number | null;
  total_deductions?: number | null;
  discrepancy_percentage: number;
  tolerance_percentage: number;
  is_within_tolerance: boolean;
  status: VerificationStatusType;
  explanation: string;
  detected_credits: number[];
  requires_manual_review: boolean;
  record_hash: string | null;
}

export interface AdminVerificationItem {
  wallet_address: string;
  status: VerificationStatusType;
  declared_annual_income: number;
  declared_monthly_income: number;
  extracted_monthly_income: number;
  discrepancy_percentage: number;
  requires_manual_review: boolean;
  documents_count: number;
  record_hash: string | null;
  updated_at: string;
  verifier_notes: string | null;
}
