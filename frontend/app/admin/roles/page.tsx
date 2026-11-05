"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminGate } from "@/components/auth/AdminGate";
import { useCredChain } from "@/hooks/useCredChain";
import { contracts } from "@/config/contracts";
import { LoanGovernanceABI, LoanManagerABI } from "@/abi/contracts";
import { Users, ArrowLeft, ShieldCheck, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";

export default function UserRoleManagementPage() {
  const { executeWrite, isWritePending } = useCredChain();

  const [targetAccount, setTargetAccount] = useState("");
  const [selectedRole, setSelectedRole] = useState("APPROVER_ROLE");
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const APPROVER_ROLE = "0x58045952136e053a65c697858d4a97479ab48a0dd362ee85c18471e4663ef6ec";
  const LENDER_ROLE = "0x4c656e646572526f6c6500000000000000000000000000000000000000000000";

  const handleGrantRole = async () => {
    if (!targetAccount.startsWith("0x") || targetAccount.length !== 42) {
      setErrorMsg("Please enter a valid 42-character Ethereum address.");
      return;
    }

    setErrorMsg(null);
    setActionStatus(null);
    try {
      const roleBytes = selectedRole === "APPROVER_ROLE" ? APPROVER_ROLE : LENDER_ROLE;
      const hash = await executeWrite("admin", {
        address: contracts.loanGovernance,
        abi: LoanGovernanceABI,
        functionName: "grantRole",
        args: [roleBytes as `0x${string}`, targetAccount as `0x${string}`],
      });
      setActionStatus(`Role ${selectedRole} granted to ${targetAccount}. Tx: ${hash}`);
    } catch (err: any) {
      setErrorMsg(err?.shortMessage || err?.message || "Grant role failed.");
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
            <Users className="h-6 w-6 text-amber-400" />
            User & Role Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage OpenZeppelin AccessControl role assignments on the LoanGovernance and LoanManager smart contracts.
          </p>
        </div>

        {actionStatus && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-mono">{actionStatus}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-6 rounded-2xl border bg-card/60 backdrop-blur shadow-sm space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Grant Governance Role
          </h2>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Target Wallet Address
              </label>
              <input
                type="text"
                value={targetAccount}
                onChange={(e) => setTargetAccount(e.target.value.trim())}
                placeholder="0x..."
                className="w-full bg-muted/30 border rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Role to Assign
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-muted/30 border rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="APPROVER_ROLE">APPROVER_ROLE (Can approve loans in governance)</option>
                <option value="LENDER_ROLE">LENDER_ROLE (Authorized liquidity provider)</option>
              </select>
            </div>

            <button
              onClick={handleGrantRole}
              disabled={isWritePending || !targetAccount}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
            >
              {isWritePending ? (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin" />
                  Granting Role On-Chain...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Execute Grant Role
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AdminGate>
  );
}
