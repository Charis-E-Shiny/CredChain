"use client";

import { Suspense, useEffect, useState } from "react";
import { parseEther } from "viem";
import { useCredChain } from "@/hooks/useCredChain";
import { formatTokenAmount, shortenAddress } from "@/lib/utils";
import { Receipt, CheckCircle2, AlertCircle, ArrowRight, RotateCcw, Wallet, ShieldCheck } from "lucide-react";
import { contracts } from "@/config/contracts";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function RepaymentContent() {
  const {
    address,
    isConnected,
    isDemoMode,
    credBalance,
    borrowerLoans,
    loadingLoans,
    getLoanOutstanding,
    repayLoan,
    approveToken,
    isWritePending,
  } = useCredChain();

  const searchParams = useSearchParams();
  const paramLoanId = searchParams?.get("loanId");

  // Only active loans can be repaid
  const activeLoans = borrowerLoans.filter((l) => l.status === 2);

  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [outstandingWei, setOutstandingWei] = useState<bigint>(BigInt(0));
  const [amount, setAmount] = useState<string>("");
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-select loan if specified in query or default to first active loan
  useEffect(() => {
    if (activeLoans.length > 0) {
      if (paramLoanId && activeLoans.some((l) => l.id.toString() === paramLoanId)) {
        setSelectedLoanId(paramLoanId);
      } else if (!selectedLoanId || !activeLoans.some((l) => l.id.toString() === selectedLoanId)) {
        setSelectedLoanId(activeLoans[0].id.toString());
      }
    } else {
      setSelectedLoanId("");
      setOutstandingWei(BigInt(0));
      setAmount("");
    }
  }, [activeLoans, paramLoanId]);

  // Fetch outstanding balance whenever selected loan changes
  useEffect(() => {
    if (selectedLoanId) {
      setLoadingBalance(true);
      getLoanOutstanding(BigInt(selectedLoanId))
        .then((bal) => {
          setOutstandingWei(bal);
          setAmount(formatTokenAmount(bal));
        })
        .finally(() => setLoadingBalance(false));
    }
  }, [selectedLoanId]);

  const selectedLoan = activeLoans.find((l) => l.id.toString() === selectedLoanId);

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!isConnected && !isDemoMode) || !selectedLoanId) {
      setError("Please connect your wallet or use Demo Mode and select an active loan.");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid repayment amount.");
      return;
    }

    setError(null);
    setStatusMsg(null);

    try {
      const repayWei = parseEther(amount);
      const lId = BigInt(selectedLoanId);

      // Check balance
      if (credBalance && credBalance < repayWei) {
        throw new Error(
          `Insufficient CRED balance. You have ${formatTokenAmount(credBalance)} CRED, but repayment requires ${amount} CRED.`
        );
      }

      // Step 1: Approve LoanEscrow to receive repayment tokens
      setStatusMsg("Step 1/2: Approving token transfer to LoanEscrow...");
      await approveToken(contracts.loanEscrow, repayWei);

      // Step 2: Call LoanManager repayLoan
      setStatusMsg("Step 2/2: Confirming repayment transaction on-chain...");
      const hash = await repayLoan(lId, repayWei);
      setStatusMsg(`Repayment confirmed! Loan #${selectedLoanId} updated on-chain. Tx: ${hash}`);
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || "Repayment transaction failed.");
      setStatusMsg(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
          <Receipt className="h-3.5 w-3.5" />
          Debt Settlement Portal
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Loan Repayment</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Settle your active micro-loans in CRED tokens to unlock collateral and boost your on-chain reputation score.
        </p>
      </div>

      {/* Main Card */}
      <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-5">
        {!isConnected ? (
          <div className="p-8 text-center space-y-3">
            <Wallet className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="text-sm font-semibold">Wallet Not Connected</div>
            <p className="text-xs text-muted-foreground">
              Connect your borrower wallet to inspect active loans and make on-chain repayments.
            </p>
          </div>
        ) : loadingLoans ? (
          <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <RotateCcw className="h-4 w-4 animate-spin" />
            Loading active loans from blockchain...
          </div>
        ) : activeLoans.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed bg-card/40 space-y-3">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
            <div className="text-sm font-semibold">No Active Loans Requiring Repayment</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Your wallet currently has zero active loans in debt. Either all past loans have been repaid in full, or you have not yet activated a loan.
            </p>
            <div className="pt-2">
              <Link
                href="/apply-loan"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold inline-block hover:opacity-90"
              >
                Apply for a New Loan
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRepay} className="space-y-5">
            {/* Loan Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select Active Loan to Settle
              </label>
              <select
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="w-full bg-muted/30 border rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {activeLoans.map((l) => (
                  <option key={l.id.toString()} value={l.id.toString()}>
                    Loan #{l.id.toString()} — Principal: {formatTokenAmount(l.principal)} CRED | APR:{" "}
                    {(l.interestRateBps / 100).toFixed(1)}% | Term:{" "}
                    {new Date(Number(l.repaymentDeadline) * 1000).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Loan Info Banner */}
            {selectedLoan && (
              <div className="p-4 rounded-xl border bg-muted/20 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Principal Borrowed</div>
                  <div className="font-mono font-bold">{formatTokenAmount(selectedLoan.principal)} CRED</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Locked Collateral</div>
                  <div className="font-mono font-bold text-sky-400">
                    {formatTokenAmount(selectedLoan.collateralAmount)} CRED
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Repayment Deadline</div>
                  <div className="font-mono font-bold">
                    {new Date(Number(selectedLoan.repaymentDeadline) * 1000).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Already Repaid</div>
                  <div className="font-mono font-bold text-emerald-400">
                    {formatTokenAmount(selectedLoan.repaid)} CRED
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground">Remaining Total Due (Principal + Interest)</div>
                  <div className="font-mono font-extrabold text-base text-amber-400">
                    {loadingBalance ? "Calculating..." : `${formatTokenAmount(outstandingWei)} CRED`}
                  </div>
                </div>
              </div>
            )}

            {/* Repayment Amount Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold uppercase tracking-wider text-muted-foreground">
                  Repayment Amount (CRED)
                </label>
                <div className="text-muted-foreground">
                  Available: <span className="font-mono text-foreground font-semibold">{formatTokenAmount(credBalance)} CRED</span>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter repayment amount"
                  className="w-full bg-muted/30 border rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setAmount(formatTokenAmount(outstandingWei))}
                  className="absolute right-2.5 top-2 px-2 py-0.5 rounded text-[11px] font-bold bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                >
                  Pay in Full
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Partial repayments reduce your outstanding debt. When total debt reaches zero, collateral is automatically unlocked and your reputation increases.
              </p>
            </div>

            {/* Status & Error Messages */}
            {statusMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{statusMsg}</span>
              </div>
            )}
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isWritePending || !selectedLoanId}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isWritePending ? (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin" />
                  Processing Repayment...
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4" />
                  Confirm On-Chain Repayment
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function RepaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <RotateCcw className="h-4 w-4 animate-spin text-primary" />
          Loading repayment console...
        </div>
      }
    >
      <RepaymentContent />
    </Suspense>
  );
}
