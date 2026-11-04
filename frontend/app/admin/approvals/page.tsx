"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminGate } from "@/components/auth/AdminGate";
import { useCredChain } from "@/hooks/useCredChain";
import { formatTokenAmount, shortenAddress } from "@/lib/utils";
import { FileCheck2, ArrowLeft, CheckCircle2, XCircle, AlertCircle, RotateCcw } from "lucide-react";

export default function LoanApprovalQueuePage() {
  const { pendingApprovalLoans, loadingLoans, approveGovernance, rejectGovernance, isWritePending } = useCredChain();

  const [actingId, setActingId] = useState<string | null>(null);
  const [txMsg, setTxMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApprove = async (loanId: bigint) => {
    setActingId(loanId.toString());
    setTxMsg(null);
    setErrorMsg(null);
    try {
      const hash = await approveGovernance(loanId);
      setTxMsg(`Loan #${loanId.toString()} approval submitted on-chain. Tx: ${hash}`);
    } catch (err: any) {
      setErrorMsg(err?.shortMessage || err?.message || "Approval transaction failed.");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (loanId: bigint) => {
    setActingId(loanId.toString());
    setTxMsg(null);
    setErrorMsg(null);
    try {
      const hash = await rejectGovernance(loanId);
      setTxMsg(`Loan #${loanId.toString()} rejected. Collateral unlocked for borrower. Tx: ${hash}`);
    } catch (err: any) {
      setErrorMsg(err?.shortMessage || err?.message || "Rejection transaction failed.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <AdminGate>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
          <div>
            <Link href="/admin" className="text-xs text-primary hover:underline flex items-center gap-1 mb-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Overview
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <FileCheck2 className="h-6 w-6 text-primary" />
              Loan Approval Queue
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review requested micro-loans and execute on-chain governance approvals or rejections.
            </p>
          </div>

          <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
            {pendingApprovalLoans.length} Pending Approval
          </span>
        </div>

        {txMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-mono">{txMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4">
          {loadingLoans ? (
            <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <RotateCcw className="h-4 w-4 animate-spin text-primary" />
              Checking on-chain loan queue...
            </div>
          ) : pendingApprovalLoans.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed bg-card/30 space-y-2">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400" />
              <div className="text-sm font-semibold">Approval Queue is Clear</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                There are no pending loan requests requiring governance review. New requests from borrowers will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-3">Loan ID</th>
                    <th className="py-3 px-3">Borrower</th>
                    <th className="py-3 px-3">Requested Principal</th>
                    <th className="py-3 px-3">Locked Collateral</th>
                    <th className="py-3 px-3">Yield (APR)</th>
                    <th className="py-3 px-3">Tenor</th>
                    <th className="py-3 px-3">Risk Hash</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingApprovalLoans.map((loan) => (
                    <tr key={loan.id.toString()} className="hover:bg-muted/20">
                      <td className="py-3 px-3 font-mono font-bold text-primary">#{loan.id.toString()}</td>
                      <td className="py-3 px-3 font-mono">{shortenAddress(loan.borrower)}</td>
                      <td className="py-3 px-3 font-semibold">{formatTokenAmount(loan.principal)} CRED</td>
                      <td className="py-3 px-3 font-mono text-sky-400 font-medium">
                        {formatTokenAmount(loan.collateralAmount)} CRED
                      </td>
                      <td className="py-3 px-3 text-emerald-400 font-bold">
                        {(loan.interestRateBps / 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-3">{Math.round(Number(loan.duration) / 86400)} Days</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground truncate max-w-[120px]" title={loan.riskAssessmentHash}>
                        {loan.riskAssessmentHash.slice(0, 10)}...
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(loan.id)}
                            disabled={isWritePending || actingId === loan.id.toString()}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                          >
                            {actingId === loan.id.toString() ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleReject(loan.id)}
                            disabled={isWritePending || actingId === loan.id.toString()}
                            className="px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 font-semibold disabled:opacity-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminGate>
  );
}
