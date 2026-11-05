"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { contracts } from "@/config/contracts";
import { LoanGovernanceABI } from "@/abi/contracts";

export type UserRole = "borrower" | "lender" | "admin";

export interface DemoUser {
  name: string;
  role: UserRole;
  avatarInitials: string;
}

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isAdmin: boolean;
  isApprover: boolean;
  isCheckingRole: boolean;
  adminError: string | null;
  clearAdminError: () => void;
  // Demo mode
  isDemoMode: boolean;
  demoUser: DemoUser | null;
  demoLogin: (role: UserRole, name?: string) => void;
  demoLogout: () => void;
  isLoggedIn: boolean;
}

const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

const DEMO_USERS: Record<UserRole, DemoUser> = {
  borrower: { name: "Demo Borrower", role: "borrower", avatarInitials: "DB" },
  lender:   { name: "Demo Lender",   role: "lender",   avatarInitials: "DL" },
  admin:    { name: "Demo Admin",    role: "admin",    avatarInitials: "DA" },
};

const RoleContext = createContext<RoleContextType>({
  role: "borrower",
  setRole: () => {},
  isAdmin: false,
  isApprover: false,
  isCheckingRole: false,
  adminError: null,
  clearAdminError: () => {},
  isDemoMode: false,
  demoUser: null,
  demoLogin: () => {},
  demoLogout: () => {},
  isLoggedIn: false,
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const [role, setRoleState] = useState<UserRole>("borrower");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoUser, setDemoUser] = useState<DemoUser | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Read smart-contract role permissions if wallet is connected and NOT in demo mode
  const { data: approverRoleHash } = useReadContract({
    address: contracts.loanGovernance,
    abi: LoanGovernanceABI,
    functionName: "APPROVER_ROLE",
  });

  const { data: hasAdminRole, isLoading: loadingAdmin } = useReadContract({
    address: contracts.loanGovernance,
    abi: LoanGovernanceABI,
    functionName: "hasRole",
    args: address ? [DEFAULT_ADMIN_ROLE, address] : undefined,
  });

  const { data: hasApproverRole, isLoading: loadingApprover } = useReadContract({
    address: contracts.loanGovernance,
    abi: LoanGovernanceABI,
    functionName: "hasRole",
    args: address && approverRoleHash ? [approverRoleHash, address] : undefined,
  });

  const onChainIsAdmin = Boolean(hasAdminRole);
  const onChainIsApprover = Boolean(hasApproverRole) || onChainIsAdmin;
  const isCheckingRole = !isDemoMode && isConnected && (loadingAdmin || loadingApprover);

  // In demo mode, admin has full permissions immediately
  const isAdmin = isDemoMode ? (role === "admin") : onChainIsAdmin;
  const isApprover = isDemoMode ? (role === "admin") : onChainIsApprover;
  const isLoggedIn = Boolean(isDemoMode || (isConnected && address));

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedDemo = localStorage.getItem("credchain_demo_user");
    const savedRole = localStorage.getItem("credchain_user_role") as UserRole | null;

    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo) as DemoUser;
        setDemoUser(parsed);
        setIsDemoMode(true);
        setRoleState(parsed.role);
        setIsInitialized(true);
        return;
      } catch {}
    }

    if (savedRole && ["borrower", "lender", "admin"].includes(savedRole)) {
      setRoleState(savedRole);
    }
    setIsInitialized(true);
  }, []);

  const setRole = (newRole: UserRole) => {
    setAdminError(null);
    setRoleState(newRole);

    if (isDemoMode) {
      const updated = {
        name: DEMO_USERS[newRole].name,
        role: newRole,
        avatarInitials: DEMO_USERS[newRole].avatarInitials,
      };
      setDemoUser(updated);
      localStorage.setItem("credchain_demo_user", JSON.stringify(updated));
    }

    localStorage.setItem("credchain_user_role", newRole);
  };

  const demoLogin = (targetRole: UserRole, name?: string) => {
    const user: DemoUser = {
      name: name || DEMO_USERS[targetRole].name,
      role: targetRole,
      avatarInitials: name ? name.slice(0, 2).toUpperCase() : DEMO_USERS[targetRole].avatarInitials,
    };
    setDemoUser(user);
    setIsDemoMode(true);
    setRoleState(targetRole);
    setAdminError(null);
    localStorage.setItem("credchain_demo_user", JSON.stringify(user));
    localStorage.setItem("credchain_user_role", targetRole);
  };

  const demoLogout = () => {
    setDemoUser(null);
    setIsDemoMode(false);
    setRoleState("borrower");
    localStorage.removeItem("credchain_demo_user");
    localStorage.removeItem("credchain_user_role");
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
        isDemoMode,
        demoUser,
        demoLogin,
        demoLogout,
        isLoggedIn,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
