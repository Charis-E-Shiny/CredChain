"use client";

import { useEffect, useState } from "react";
import { parseEther } from "viem";
import { useCredChain } from "@/hooks/useCredChain";
import { contracts, chainConfig } from "@/config/contracts";
import { formatTokenAmount } from "@/lib/utils";
import {
  FilePlus2,
  CheckCircle2,
  AlertCircle,
  Coins,
  ShieldCheck,
  BrainCircuit,
  RotateCcw,
  Info,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface PastAssessment {
  assessment_id: string;
  risk_score: number;
  risk_category: string;
  confidence: number;
  created_at: string;
  verification_status?: string | null;
  assessment_hash?: string | null;
}

export default function ApplyLoanPage() {
  const { address, isConnected, isDemoMode, credBalance, oraclePrice, requestLoan, approveToken, requestFaucet, isWritePending } = useCredChain();

  const [amount, setAmount] = useState("1000");
  const [collateral, setCollateral] = useState("200");
  const [durationDays, setDurationDays] = useState("30");
  const [interestRateBps, setInterestRateBps] = useState("500"); // 5%

  const [recentAssessment, setRecentAssessment] = useState<PastAssessment | null>(null);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "approving" | "requesting" | "done">("form");
  const [mintingCred, setMintingCred] = useState(false);

  const handleMintCollateral = async () => {
    setMintingCred(true);
    setError(null);
    try {
      await requestFaucet("1000");
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Failed to mint CRED tokens in MetaMask.");
    } finally {
      setMintingCred(false);
    }
  };

  // Fetch real assessment and verification status for connected wallet
  useEffect(() => {
    if (!address) return;
    setLoadingAssessment(true);
    fetch(`${chainConfig.apiUrl}/api/credit/history/${address}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { assessments?: PastAssessment[] } | null) => {
        setRecentAssessment(data?.assessments?.[0] ?? null);
      })
      .catch((e) => console.error("Error loading assessment:", e))
      .finally(() => setLoadingAssessment(false));

    fetch(`${chainConfig.apiUrl}/api/verification/status/${address}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.status) {
          setVerificationStatus(data.status);
        }
      })
      .catch((e) => console.error("Error loading verification status:", e));
  }, [address]);

  // Suggested collateral based on loan amount (20% minimum baseline or 150% LTV)
  const suggestedCollateral = (parseFloat(amount || "0") * 0.2).toFixed(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!isConnected && !isDemoMode) || !address) {
      setError("Please connect your wallet or sign in as Demo Borrower to apply for a loan.");
      return;
    }

    const loanVal = parseFloat(amount);
    const colVal = parseFloat(collateral);

    if (loanVal <= 0 || colVal <= 0) {
      setError("Loan and collateral amounts must be greater than zero.");
      return;
    }

    const colWei = parseEther(collateral);
    if (credBalance && credBalance < colWei) {
      setError(
        `Insufficient CRED balance for collateral. You need ${collateral} CRED, but have ${formatTokenAmount(credBalance)} CRED.`
      );
      return;
    }

    // The on-chain riskAssessmentHash must commit to a real, hashed assessment.
    if (!recentAssessment?.assessment_hash) {
      setError("Run a credit assessment before applying. The loan request must commit to an assessment hash.");
      return;
    }

    setError(null);

    try {
      setStep("approving");
      const loanWei = parseEther(amount);
      const durSecs = BigInt(parseInt(durationDays) * 86400);
      const rateBps = BigInt(interestRateBps);

      // Commit to the latest assessment's bytes32 hash. The backend hashes the inputs,
      // score, verification standing, and verification record, so this value can be
      // re-verified later against the stored assessment.
      const riskHash = recentAssessment.assessment_hash as `0x${string}`;

      // Step 1: Approve escrow for collateral tokens
      await approveToken(contracts.loanEscrow, colWei);

      // Step 2: Submit on-chain loan request to LoanManager
      setStep("requesting");
      const hash = await requestLoan(loanWei, colWei, durSecs, rateBps, riskHash);
      setTxHash(hash);
      setStep("done");
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || "Transaction reverted.");
      setStep("form");
    }
  };

  const ethPriceUSD = oraclePrice
    ? (Number(oraclePrice) / 1e8).toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "$2,500.00";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
          <FilePlus2 className="h-3.5 w-3.5" />
          Loan Origination
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Apply for Micro-Loan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lock collateral tokens in escrow and submit your loan request to the on-chain governance queue.
        </p>
      </div>

      {/* AI Assessment Status Card */}
      <div className="p-4 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <BrainCircuit className="h-4 w-4 text-sky-400" />
            Consented AI Risk Assessment
          </span>
          {recentAssessment ? (
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-bold">
              VERIFIED: {recentAssessment.risk_category} RISK
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-semibold">
              UNASSESSED
            </span>
          )}
        </div>

        {recentAssessment ? (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Referencing Assessment ID: <span className="font-mono text-foreground font-semibold">{recentAssessment.assessment_id.slice(0, 18)}...</span>
            </p>
            <p>
              Committed hash: <span className="font-mono text-foreground">{(recentAssessment.assessment_hash ?? "").slice(0, 18)}...</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Risk Score: {recentAssessment.risk_score.toFixed(3)} | Confidence: {(recentAssessment.confidence * 100).toFixed(1)}% | Completed: {new Date(recentAssessment.created_at).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground flex items-center justify-between gap-2 pt-1">
            <span>No AI assessment found for this wallet. Run an assessment before applying; the loan commits to its hash.</span>
            <Link href="/credit-assessment" className="text-primary font-semibold hover:underline shrink-0">
              Run Assessment &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* Financial Verification Status Card */}
      <div className="p-4 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#183B32]" />
            Financial Reliability Verification
          </span>
          {verificationStatus === "SOURCE_VERIFIED" && (
            <span className="px-2 py-0.5 rounded bg-[#34765A]/15 border border-[#34765A]/30 text-[#34765A] font-mono text-[11px] font-bold">
              SOURCE VERIFIED
            </span>
          )}
          {verificationStatus === "EVIDENCE_CHECKED" && (
            <span className="px-2 py-0.5 rounded bg-[#315B4C]/15 border border-[#315B4C]/30 text-[#315B4C] font-mono text-[11px] font-bold">
              EVIDENCE CHECKED
            </span>
          )}
          {verificationStatus === "MANUAL_REVIEW" && (
            <span className="px-2 py-0.5 rounded bg-[#B94B45]/15 border border-[#B94B45]/30 text-[#B94B45] font-mono text-[11px] font-bold">
              MANUAL REVIEW
            </span>
          )}
          {(!verificationStatus || verificationStatus === "UNVERIFIED") && (
            <span className="px-2 py-0.5 rounded bg-[#B77B26]/15 border border-[#B77B26]/30 text-[#B77B26] font-mono text-[11px] font-bold">
              UNVERIFIED
            </span>
          )}
        </div>

        <div className="text-xs text-muted-foreground flex items-center justify-between gap-2 pt-1">
          {verificationStatus === "SOURCE_VERIFIED" || verificationStatus === "EVIDENCE_CHECKED" ? (
            <span>Document evidence reconciled on-chain. Eligible for expedited governance approval.</span>
          ) : (
            <span>Unverified declarations may require higher collateral or lender review.</span>
          )}
          <Link href="/credit-assessment" className="text-primary font-semibold hover:underline shrink-0">
            {verificationStatus === "SOURCE_VERIFIED" || verificationStatus === "EVIDENCE_CHECKED" ? "View Evidence →" : "Verify Income →"}
          </Link>
        </div>
      </div>

      {/* Oracle Collateral Reference */}
      <div className="p-4 rounded-xl border bg-muted/20 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <span className="text-muted-foreground">Chainlink Oracle Benchmark:</span>
          <span className="font-mono font-bold text-foreground">ETH/USD {ethPriceUSD}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">Collateral Escrow: 100% On-Chain</span>
      </div>

      {step === "done" ? (
        <div className="p-8 rounded-2xl border bg-card/60 backdrop-blur shadow-sm text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">Loan Application Submitted!</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Your collateral of {collateral} CRED has been deposited into <span className="font-mono text-foreground">LoanEscrow.sol</span>. Your loan request is now in the governance approval queue.
          </p>
          <div className="p-3 rounded-xl bg-muted/30 font-mono text-xs break-all text-muted-foreground">
            Transaction: {txHash}
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/borrower"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90"
            >
              Borrower Dashboard
            </Link>
            <button
              onClick={() => {
                setStep("form");
                setTxHash(null);
              }}
              className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-muted"
            >
              Apply for Another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Loan Principal (CRED)
            </label>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-muted/30 border rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          {/* Collateral */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold uppercase tracking-wider text-muted-foreground">
                Collateral Deposit (CRED)
              </label>
              <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                <span>Available:</span>
                <span className="font-mono text-foreground font-semibold">{formatTokenAmount(credBalance)} CRED</span>
                <button
                  type="button"
                  onClick={handleMintCollateral}
                  disabled={mintingCred}
                  className="font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <RotateCcw className={`h-3 w-3 ${mintingCred ? "animate-spin" : ""}`} />
                  {mintingCred ? "Minting..." : "+ Mint CRED"}
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={collateral}
                onChange={(e) => setCollateral(e.target.value)}
                className="w-full bg-muted/30 border rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
              <button
                type="button"
                onClick={() => setCollateral(suggestedCollateral)}
                className="absolute right-2.5 top-2 px-2 py-0.5 rounded text-[11px] font-bold bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
              >
                Suggested ({suggestedCollateral})
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Locked in <span className="font-mono text-foreground">LoanEscrow.sol</span> and released upon full loan repayment.
            </p>
          </div>

          {/* Duration & Interest */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tenor / Duration
              </label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full bg-muted/30 border rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="7">7 Days (Short-term)</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days (Standard)</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Offered Interest (APR)
              </label>
              <select
                value={interestRateBps}
                onChange={(e) => setInterestRateBps(e.target.value)}
                className="w-full bg-muted/30 border rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="300">3.0% APR</option>
                <option value="500">5.0% APR (Competitive)</option>
                <option value="800">8.0% APR</option>
                <option value="1000">10.0% APR</option>
              </select>
            </div>
          </div>

          {/* Synthetic Data Disclaimer */}
          <div className="p-3.5 rounded-xl border bg-muted/20 text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-sky-400" />
            <span>
              <b>Academic FinTech Prototype Notice:</b> Loan approvals and risk assessments are evaluated by off-chain models trained on synthetic credit datasets. Do not use real financial capital.
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isWritePending || step !== "form"}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-primary/20"
          >
            {step === "approving" ? (
              <>
                <RotateCcw className="h-4 w-4 animate-spin" />
                Step 1/2: Approving Collateral Escrow...
              </>
            ) : step === "requesting" ? (
              <>
                <RotateCcw className="h-4 w-4 animate-spin" />
                Step 2/2: Registering Loan on Blockchain...
              </>
            ) : (
              <>
                <FilePlus2 className="h-4 w-4" />
                Authorize & Submit Loan Request
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
