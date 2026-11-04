"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { contracts } from "@/config/contracts";
import { LoanGovernanceABI } from "@/abi/contracts";

export type UserRole = "borrower" | "lender" | "admin";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isAdmin: boolean;
  isApprover: boolean;
  isCheckingRole: boolean;
  adminError: string | null;
  clearAdminError: () => void;
}

const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

const RoleContext = createContext<RoleContextType>({
  role: "borrower",
  setRole: () => {},
  isAdmin: false,
  isApprover: false,
  isCheckingRole: false,
  adminError: null,
  clearAdminError: () => {},
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const [role, setRoleState] = useState<UserRole>("borrower");
  const [adminError, setAdminError] = useState<string | null>(null);

  // Read APPROVER_ROLE bytes32 from LoanGovernance
  const { data: approverRoleHash } = useReadContract({
    address: contracts.loanGovernance,
    abi: LoanGovernanceABI,
    functionName: "APPROVER_ROLE",
  });

  // Check if connected address has DEFAULT_ADMIN_ROLE
  const { data: hasAdminRole, isLoading: loadingAdmin } = useReadContract({
    address: contracts.loanGovernance,
    abi: LoanGovernanceABI,
    functionName: "hasRole",
    args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
  });

  // Check if connected address has APPROVER_ROLE
  const { data: hasApproverRole, isLoading: loadingApprover } = useReadContract({
    address: contracts.loanGovernance,
    abi: LoanGovernanceABI,
    functionName: "hasRole",
    args: address && approverRoleHash ? [approverRoleHash, address] : undefined,
  });

  const isAdmin = Boolean(hasAdminRole);
  const isApprover = Boolean(hasApproverRole) || isAdmin;
  const isCheckingRole = loadingAdmin || loadingApprover;

  // Load saved role from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("credchain_user_role") as UserRole | null;
      if (saved && (saved === "borrower" || saved === "lender" || saved === "admin")) {
        setRoleState(saved);
      }
    }
  }, []);

  // When switching wallet, if on admin view but wallet is not admin, revert to borrower
  useEffect(() => {
    if (isConnected && !isCheckingRole && role === "admin" && !isAdmin && !isApprover) {
      setRoleState("borrower");
      setAdminError(
        `Wallet ${address?.slice(0, 6)}...${address?.slice(-4)} does not have governance/admin permissions on-chain. Switched to Borrower mode.`
      );
    }
  }, [address, isConnected, isAdmin, isApprover, isCheckingRole, role]);

  const setRole = (newRole: UserRole) => {
    setAdminError(null);
    if (newRole === "admin") {
      if (!isConnected) {
        setAdminError("Please connect an authorized governance wallet to access Admin tools.");
        return;
      }
      if (!isAdmin && !isApprover) {
        setAdminError(
          `Access Denied: Wallet ${address?.slice(0, 6)}...${address?.slice(-4)} lacks DEFAULT_ADMIN_ROLE or APPROVER_ROLE on the LoanGovernance contract.`
        );
        return;
      }
    }

    setRoleState(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("credchain_user_role", newRole);
    }
  };

  const clearAdminError = () => setAdminError(null);

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        isAdmin,
        isApprover,
        isCheckingRole,
        adminError,
        clearAdminError,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
