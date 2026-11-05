"use client";

import { useRole } from "@/context/RoleContext";
import { useAccount } from "wagmi";
import { ShieldAlert, Lock, RotateCcw } from "lucide-react";
import Link from "next/link";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { isAdmin, isApprover, isCheckingRole, isDemoMode, role } = useRole();

  // In demo mode, grant full instant admin access with zero authentication barriers
  if (isDemoMode) {
    return <>{children}</>;
  }

  // If real wallet connected and has admin or approver role
  if (isConnected && (isAdmin || isApprover)) {
    return <>{children}</>;
  }

  if (isCheckingRole) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <RotateCcw className="h-6 w-6 animate-spin text-[#183B32]" />
        <div className="text-xs text-[#777B73]">Verifying admin role permissions...</div>
      </div>
    );
  }

  // Not logged in or not admin
  return (
    <div
      className="max-w-xl mx-auto my-12 p-8 rounded-2xl border text-center space-y-4 shadow-sm"
      style={{ borderColor: "#E5E1D7", backgroundColor: "#fff" }}
    >
      <div
        className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto"
        style={{ backgroundColor: "rgba(183,123,38,0.1)", color: "#B77B26" }}
      >
        <Lock className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-bold" style={{ color: "#252C29" }}>
        Admin Access
      </h2>
      <p className="text-xs leading-relaxed max-w-md mx-auto" style={{ color: "#777B73" }}>
        Sign in with the Demo Admin account for instant access, or connect an authorized governance wallet.
      </p>
      <div className="pt-2 flex justify-center gap-3">
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-xl font-semibold text-xs shadow-sm transition-all"
          style={{ backgroundColor: "#183B32", color: "#D6A85F" }}
        >
          Sign In as Demo Admin
        </Link>
        <Link
          href="/borrower"
          className="px-4 py-2.5 rounded-xl border text-xs font-semibold"
          style={{ borderColor: "#E5E1D7", backgroundColor: "#F4F1E8", color: "#252C29" }}
        >
          &larr; Return to Borrower Hub
        </Link>
      </div>
    </div>
  );
}
