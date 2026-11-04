"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminGate } from "@/components/auth/AdminGate";
import { useAccount, useWriteContract } from "wagmi";
import { contracts } from "@/config/contracts";
import { LoanManagerABI } from "@/abi/contracts";
import { SlidersHorizontal, ArrowLeft, PauseCircle, PlayCircle, AlertTriangle, ShieldCheck } from "lucide-react";

export default function ProtocolControlsPage() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handlePause = async () => {
    try {
      setFeedback(null);
      const hash = await writeContractAsync({
        address: contracts.loanManager,
        abi: LoanManagerABI,
        functionName: "pause",
      });
      setFeedback(`Protocol paused successfully. Tx: ${hash}`);
    } catch (e: any) {
      setFeedback(`Error: ${e?.shortMessage || e?.message || "Failed to pause"}`);
    }
  };

  const handleUnpause = async () => {
    try {
      setFeedback(null);
      const hash = await writeContractAsync({
        address: contracts.loanManager,
        abi: LoanManagerABI,
        functionName: "unpause",
      });
      setFeedback(`Protocol unpaused successfully. Tx: ${hash}`);
    } catch (e: any) {
      setFeedback(`Error: ${e?.shortMessage || e?.message || "Failed to unpause"}`);
    }
  };

  return (
    <AdminGate>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="border-b pb-5">
          <Link href="/admin" className="text-xs text-primary hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Overview
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="h-6 w-6 text-destructive" />
            Protocol Emergency Controls
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Emergency pause & unpause circuit breakers for LoanManager and LoanEscrow contracts.
          </p>
        </div>

        {feedback && (
          <div className="p-3.5 rounded-xl bg-card border font-mono text-xs">
            {feedback}
          </div>
        )}

        <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Emergency Circuit Breakers
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Pausing the LoanManager halts all new loan requests, disbursements, and token operations.
            Only accounts with <span className="font-mono text-foreground font-semibold">PAUSER_ROLE</span> can toggle these controls.
          </p>

          <div className="flex items-center gap-4 pt-3">
            <button
              onClick={handlePause}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-bold text-xs hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              <PauseCircle className="h-4 w-4" />
              Pause LoanManager
            </button>

            <button
              onClick={handleUnpause}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              Unpause LoanManager
            </button>
          </div>
        </div>
      </div>
    </AdminGate>
  );
}
