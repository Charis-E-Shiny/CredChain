"use client";

import { useRole } from "@/context/RoleContext";
import { useAccount } from "wagmi";
import { ShieldAlert, Lock, RotateCcw } from "lucide-react";
import Link from "next/link";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { isAdmin, isApprover, isCheckingRole } = useRole();

  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl border bg-card/60 backdrop-blur shadow-sm text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Admin Authentication Required</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This module contains smart-contract governance controls and requires connecting an authorized Ethereum wallet holding administrative privileges.
        </p>
      </div>
    );
  }

  if (isCheckingRole) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <RotateCcw className="h-6 w-6 animate-spin text-primary" />
        <div className="text-xs text-muted-foreground">Verifying smart-contract role permissions...</div>
      </div>
    );
  }

  if (!isAdmin && !isApprover) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl border border-destructive/30 bg-destructive/5 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive mx-auto">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-destructive">Unauthorized: Access Denied</h2>
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            Connected Wallet: <span className="font-mono text-foreground font-semibold">{address}</span>
          </p>
          <p>
            This portal is restricted to addresses assigned <span className="font-mono text-foreground">DEFAULT_ADMIN_ROLE</span> or <span className="font-mono text-foreground">APPROVER_ROLE</span> on the <span className="font-mono text-foreground">LoanGovernance.sol</span> smart contract.
          </p>
          <p className="p-3 rounded-xl bg-muted/40 font-mono text-[11px] text-foreground text-left">
            Local Anvil Admin Account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/borrower"
            className="px-4 py-2 rounded-xl bg-card border text-xs font-semibold hover:bg-muted inline-block"
          >
            &larr; Return to Borrower Portal
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
