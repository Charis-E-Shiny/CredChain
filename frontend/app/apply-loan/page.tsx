"use client";

import { useState } from "react";
import { parseEther, keccak256, toHex } from "viem";
import { useCredChain } from "@/hooks/useCredChain";
import { contracts } from "@/config/contracts";
import { FilePlus2, CheckCircle2, AlertCircle, Coins, ShieldCheck } from "lucide-react";

export default function ApplyLoanPage() {
  const { isConnected, requestLoan, approveToken, isWritePending } = useCredChain();

  const [amount, setAmount] = useState("1000");
  const [collateral, setCollateral] = useState("200");
  const [durationDays, setDurationDays] = useState("30");
  const [interestRateBps, setInterestRateBps] = useState("500"); // 5%
  const [riskAssessmentRef, setRiskAssessmentRef] = useState("AI-CREDIT-ASSESSMENT-V1");

  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "approving" | "requesting" | "done">("form");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError("Please connect your MetaMask wallet to apply for a loan.");
      return;
    }

    setError(null);

    try {
      setStep("approving");
      const colWei = parseEther(collateral);
      const loanWei = parseEther(amount);
      const durSecs = BigInt(parseInt(durationDays) * 86400);
      const rateBps = BigInt(interestRateBps);
      const riskHash = keccak256(toHex(riskAssessmentRef));

      // Approve escrow for collateral
      await approveToken(contracts.loanEscrow, colWei);

      // Submit on-chain loan request
      setStep("requesting");
      const hash = await requestLoan(loanWei, colWei, durSecs, rateBps, riskHash);
      setTxHash(hash);
      setStep("done");
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || "Transaction reverted.");
      setStep("form");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FilePlus2 className="h-6 w-6 text-primary" />
          Apply for Micro-Loan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lock collateral test tokens into non-custodial escrow and submit a loan request on Ethereum.
        </p>
      </div>

      <div className="p-6 rounded-xl border bg-card space-y-5">
        {step === "done" ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400" />
            <h2 className="text-lg font-bold">Loan Request Submitted On-Chain!</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Your application is now in <span className="font-semibold text-yellow-400">REQUESTED</span> state.
              Authorized approvers in the governance module will verify your ML risk assessment and approve disbursement.
            </p>
            {txHash && (
              <div className="p-3 rounded-lg border bg-muted/30 font-mono text-xs break-all">
                Tx: {txHash}
              </div>
            )}
            <button
              onClick={() => {
                setStep("form");
                setTxHash(null);
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Submit Another Application
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-lg bg-red-950/20 border border-red-800 text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-muted-foreground font-medium">Loan Principal (CRED Tokens)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
                required
              />
              <p className="text-[11px] text-muted-foreground">Standard micro-lending max: 5,000 CRED without multi-sig review.</p>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground font-medium">Collateral Deposit (CRED Tokens)</label>
              <input
                type="number"
                value={collateral}
                onChange={(e) => setCollateral(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
                required
              />
              <p className="text-[11px] text-muted-foreground">Held securely in LoanEscrow.sol. Returned upon complete repayment.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Repayment Duration (Days)</label>
                <input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
                  min="1"
                  max="365"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Interest Rate (Basis Points)</label>
                <input
                  type="number"
                  value={interestRateBps}
                  onChange={(e) => setInterestRateBps(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background font-mono text-sm"
                  placeholder="500 = 5.0%"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground font-medium">AI Risk Assessment Identifier</label>
              <input
                type="text"
                value={riskAssessmentRef}
                onChange={(e) => setRiskAssessmentRef(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background font-mono"
                required
              />
              <p className="text-[11px] text-muted-foreground">Keccak256 hash stored on-chain for auditability.</p>
            </div>

            <button
              type="submit"
              disabled={isWritePending || !isConnected}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isWritePending
                ? "Submitting to Blockchain..."
                : isConnected
                ? "Lock Collateral & Submit Loan Request"
                : "Connect Wallet to Apply"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
