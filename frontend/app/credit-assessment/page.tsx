"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { BrainCircuit, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { chainConfig } from "@/config/contracts";
import { CreditAssessmentResponse } from "@/types";

export default function CreditAssessmentPage() {
  const { address } = useAccount();

  const [formData, setFormData] = useState({
    annual_income: "75000",
    monthly_debt: "800",
    employment_length_years: "4",
    home_ownership: "RENT",
    loan_amount: "2500",
    loan_purpose: "PERSONAL",
    credit_history_length_years: "6",
    num_open_accounts: "4",
    num_delinquencies: "0",
    debt_to_income_ratio: "0.15",
    consent: true,
  });

  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<CreditAssessmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const targetWallet = address || "0x0000000000000000000000000000000000000001";

    const payload = {
      annual_income: parseFloat(formData.annual_income),
      monthly_debt: parseFloat(formData.monthly_debt),
      employment_length_years: parseFloat(formData.employment_length_years),
      home_ownership: formData.home_ownership,
      loan_amount: parseFloat(formData.loan_amount),
      loan_purpose: formData.loan_purpose,
      credit_history_length_years: parseFloat(formData.credit_history_length_years),
      num_open_accounts: parseInt(formData.num_open_accounts),
      num_delinquencies: parseInt(formData.num_delinquencies),
      debt_to_income_ratio: parseFloat(formData.debt_to_income_ratio),
      wallet_address: targetWallet,
      consent: formData.consent,
    };

    try {
      const res = await fetch(`${chainConfig.apiUrl}/api/credit/assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Credit assessment request failed.");
      }

      const data = await res.json();
      setAssessment(data);
    } catch (err: any) {
      setError(err.message || "Failed to connect to AI credit scoring backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-primary" />
          AI Credit Risk Underwriting
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Off-chain machine learning evaluation using GradientBoosting calibrated default estimation.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="p-6 rounded-xl border bg-card space-y-4">
          <h2 className="text-base font-semibold">Borrower Financial Profile</h2>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Annual Income ($)</label>
                <input
                  type="number"
                  value={formData.annual_income}
                  onChange={(e) => setFormData({ ...formData, annual_income: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-background font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Monthly Debt ($)</label>
                <input
                  type="number"
                  value={formData.monthly_debt}
                  onChange={(e) => setFormData({ ...formData, monthly_debt: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-background font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Requested Loan ($)</label>
                <input
                  type="number"
                  value={formData.loan_amount}
                  onChange={(e) => setFormData({ ...formData, loan_amount: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-background font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Home Ownership</label>
                <select
                  value={formData.home_ownership}
                  onChange={(e) => setFormData({ ...formData, home_ownership: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-background"
                >
                  <option value="RENT">Rent</option>
                  <option value="OWN">Own</option>
                  <option value="MORTGAGE">Mortgage</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Employment (Years)</label>
                <input
                  type="number"
                  value={formData.employment_length_years}
                  onChange={(e) => setFormData({ ...formData, employment_length_years: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-background font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Credit History (Years)</label>
                <input
                  type="number"
                  value={formData.credit_history_length_years}
                  onChange={(e) => setFormData({ ...formData, credit_history_length_years: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-background font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Open Accounts</label>
                <input
                  type="number"
                  value={formData.num_open_accounts}
                  onChange={(e) => setFormData({ ...formData, num_open_accounts: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-background font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Past Delinquencies</label>
                <input
                  type="number"
                  value={formData.num_delinquencies}
                  onChange={(e) => setFormData({ ...formData, num_delinquencies: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-background font-mono"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.consent}
                  onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                  className="mt-0.5 rounded border-gray-600 text-primary"
                  required
                />
                <span className="text-muted-foreground leading-tight">
                  I consent to off-chain automated credit analysis for educational research purposes.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? "Analyzing Financial Vectors..." : "Run AI Assessment"}
            </button>
          </form>
        </div>

        {/* Results Card */}
        <div className="p-6 rounded-xl border bg-card/60 flex flex-col justify-between space-y-4">
          <h2 className="text-base font-semibold flex items-center justify-between">
            <span>Assessment Output</span>
            {assessment && (
              <span className="text-xs font-mono text-muted-foreground">
                Model: {assessment.model_version}
              </span>
            )}
          </h2>

          {error && (
            <div className="p-4 rounded-lg bg-red-950/20 border border-red-800 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {assessment ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-lg border bg-muted/30 flex items-center justify-between">
                <div>
                  <div className="text-muted-foreground">Assessed Risk Score</div>
                  <div className="text-2xl font-bold font-mono">
                    {(assessment.risk_score * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Risk Category</div>
                  <div className={`text-sm font-bold px-2 py-0.5 rounded inline-block ${
                    assessment.risk_category === "LOW" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800" :
                    assessment.risk_category === "MEDIUM" ? "bg-yellow-950/40 text-yellow-400 border border-yellow-800" :
                    "bg-red-950/40 text-red-400 border border-red-800"
                  }`}>
                    {assessment.risk_category} RISK
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground font-medium">Model Recommendation</div>
                <p className="p-3 rounded-lg border bg-muted/20 text-foreground leading-relaxed">
                  {assessment.eligibility}
                </p>
              </div>

              {assessment.contributing_factors.length > 0 && (
                <div className="space-y-1">
                  <div className="text-muted-foreground font-medium">Top Feature Importances</div>
                  <div className="space-y-1 font-mono">
                    {assessment.contributing_factors.map((f, i) => (
                      <div key={i} className="flex justify-between p-2 rounded bg-muted/20 text-[11px]">
                        <span>{f.feature_name}</span>
                        <span className={f.direction === "positive" ? "text-red-400" : "text-emerald-400"}>
                          {(f.importance_value * 100).toFixed(1)}% ({f.direction})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg border bg-muted/20 font-mono text-[11px] truncate">
                <span className="text-muted-foreground font-sans">Assessment ID: </span>
                {assessment.assessment_id}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-xs">Submit the form to compute your ML risk profile and eligibility.</p>
            </div>
          )}

          <div className="text-[11px] text-muted-foreground/70 border-t pt-3">
            Academic prototype disclaimer: Scoring does not constitute formal financial advice or credit guarantee.
          </div>
        </div>
      </div>
    </div>
  );
}
