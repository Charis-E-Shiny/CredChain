"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { contracts } from "@/config/contracts";
import {
  CredTokenABI,
  LoanManagerABI,
  LoanGovernanceABI,
  BorrowerReputationABI,
  CollateralOracleABI,
} from "@/abi/contracts";
import { parseEther } from "viem";

export interface LoanItem {
  id: bigint;
  borrower: `0x${string}`;
  lender: `0x${string}`;
  principal: bigint;
  repaid: bigint;
  collateralAmount: bigint;
  interestRateBps: number;
  applicationTime: bigint;
  approvalTime: bigint;
  activationTime: bigint;
  repaymentDeadline: bigint;
  duration: bigint;
  status: number;
  riskAssessmentHash: `0x${string}`;
  outstandingBalance?: bigint;
}

export function useCredChain() {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();

  const [allLoans, setAllLoans] = useState<LoanItem[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(false);

  // Read CredToken balance
  const { data: credBalance, refetch: refetchBalance } = useReadContract({
    address: contracts.credToken,
    abi: CredTokenABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read total loans
  const { data: totalLoans, refetch: refetchTotalLoans } = useReadContract({
    address: contracts.loanManager,
    abi: LoanManagerABI,
    functionName: "getTotalLoans",
  });

  // Read active loan count
  const { data: activeLoans, refetch: refetchActiveLoans } = useReadContract({
    address: contracts.loanManager,
    abi: LoanManagerABI,
    functionName: "getActiveLoanCount",
  });

  // Read borrower loans
  const { data: borrowerLoanIds, refetch: refetchBorrowerLoans } = useReadContract({
    address: contracts.loanManager,
    abi: LoanManagerABI,
    functionName: "getBorrowerLoans",
    args: address ? [address] : undefined,
  });

  // Read borrower reputation
  const { data: reputationScore, refetch: refetchReputationScore } = useReadContract({
    address: contracts.borrowerReputation,
    abi: BorrowerReputationABI,
    functionName: "getReputationScore",
    args: address ? [address] : undefined,
  });

  const { data: reputationRecord, refetch: refetchReputationRecord } = useReadContract({
    address: contracts.borrowerReputation,
    abi: BorrowerReputationABI,
    functionName: "getReputation",
    args: address ? [address] : undefined,
  });

  // Read latest oracle price
  const { data: oracleData, refetch: refetchOracle } = useReadContract({
    address: contracts.collateralOracle,
    abi: CollateralOracleABI,
    functionName: "getLatestPrice",
  });

  // Write contract hook
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  // Load all on-chain loans dynamically
  const fetchAllLoans = useCallback(async () => {
    if (!publicClient) return;
    setLoadingLoans(true);
    try {
      const count = await publicClient.readContract({
        address: contracts.loanManager,
        abi: LoanManagerABI,
        functionName: "getTotalLoans",
      });

      const total = Number(count);
      if (total === 0) {
        setAllLoans([]);
        return;
      }

      const loanPromises = Array.from({ length: total }, async (_, i) => {
        try {
          const l: any = await publicClient.readContract({
            address: contracts.loanManager,
            abi: LoanManagerABI,
            functionName: "getLoan",
            args: [BigInt(i)],
          });

          let outstanding = BigInt(0);
          if (l.status === 2 || l[12] === 2) {
            try {
              outstanding = await publicClient.readContract({
                address: contracts.loanManager,
                abi: LoanManagerABI,
                functionName: "getOutstandingBalance",
                args: [BigInt(i)],
              });
            } catch {
              outstanding = BigInt(0);
            }
          }

          return {
            id: BigInt(l.id ?? l[0]),
            borrower: (l.borrower ?? l[1]) as `0x${string}`,
            lender: (l.lender ?? l[2]) as `0x${string}`,
            principal: BigInt(l.principal ?? l[3]),
            repaid: BigInt(l.repaid ?? l[4]),
            collateralAmount: BigInt(l.collateralAmount ?? l[5]),
            interestRateBps: Number(l.interestRateBps ?? l[6]),
            applicationTime: BigInt(l.applicationTime ?? l[7]),
            approvalTime: BigInt(l.approvalTime ?? l[8]),
            activationTime: BigInt(l.activationTime ?? l[9]),
            repaymentDeadline: BigInt(l.repaymentDeadline ?? l[10]),
            duration: BigInt(l.duration ?? l[11]),
            status: Number(l.status ?? l[12]),
            riskAssessmentHash: (l.riskAssessmentHash ?? l[13]) as `0x${string}`,
            outstandingBalance: outstanding,
          } as LoanItem;
        } catch (e) {
          console.error(`Failed to load loan #${i}`, e);
          return null;
        }
      });

      const results = await Promise.all(loanPromises);
      const validLoans = results.filter((x): x is LoanItem => x !== null);
      setAllLoans(validLoans);
    } catch (err) {
      console.error("Error fetching all loans:", err);
    } finally {
      setLoadingLoans(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchAllLoans();
  }, [fetchAllLoans, totalLoans]);

  // Derived filtered loan collections
  const userAddrLower = address?.toLowerCase();

  const borrowerLoans = allLoans.filter(
    (l) => userAddrLower && l.borrower.toLowerCase() === userAddrLower
  );

  const lenderInvestments = allLoans.filter(
    (l) => userAddrLower && l.lender.toLowerCase() === userAddrLower
  );

  // Status 1: APPROVED (Awaiting funding by a lender)
  const marketplaceLoans = allLoans.filter((l) => l.status === 1);

  // Status 0: REQUESTED (Awaiting approval by governance/admin)
  const pendingApprovalLoans = allLoans.filter((l) => l.status === 0);

  // Faucet request
  const requestFaucet = async (amount: string = "1000") => {
    const hash = await writeContractAsync({
      address: contracts.credToken,
      abi: CredTokenABI,
      functionName: "faucet",
      args: [parseEther(amount)],
    });
    refetchBalance();
    return hash;
  };

  // Approve token
  const approveToken = async (spender: `0x${string}`, amount: bigint) => {
    return await writeContractAsync({
      address: contracts.credToken,
      abi: CredTokenABI,
      functionName: "approve",
      args: [spender, amount],
    });
  };

  // Request loan
  const requestLoan = async (
    amount: bigint,
    collateralAmount: bigint,
    durationSeconds: bigint,
    interestBps: bigint,
    riskHash: `0x${string}`
  ) => {
    const hash = await writeContractAsync({
      address: contracts.loanManager,
      abi: LoanManagerABI,
      functionName: "requestLoan",
      args: [amount, collateralAmount, durationSeconds, interestBps, riskHash],
    });
    refetchTotalLoans();
    refetchBorrowerLoans();
    fetchAllLoans();
    return hash;
  };

  // Activate loan (Lender funding)
  const activateLoan = async (loanId: bigint) => {
    const hash = await writeContractAsync({
      address: contracts.loanManager,
      abi: LoanManagerABI,
      functionName: "activateLoan",
      args: [loanId],
    });
    refetchActiveLoans();
    refetchBalance();
    fetchAllLoans();
    return hash;
  };

  // Repay loan (Borrower payment)
  const repayLoan = async (loanId: bigint, amount: bigint) => {
    const hash = await writeContractAsync({
      address: contracts.loanManager,
      abi: LoanManagerABI,
      functionName: "repayLoan",
      args: [loanId, amount],
    });
    refetchActiveLoans();
    refetchBalance();
    refetchReputationScore();
    refetchReputationRecord();
    fetchAllLoans();
    return hash;
  };

  // Governance submit approval
  const approveGovernance = async (loanId: bigint) => {
    const hash = await writeContractAsync({
      address: contracts.loanGovernance,
      abi: LoanGovernanceABI,
      functionName: "submitApproval",
      args: [loanId],
    });
    fetchAllLoans();
    return hash;
  };

  // Governance reject
  const rejectGovernance = async (loanId: bigint) => {
    const hash = await writeContractAsync({
      address: contracts.loanGovernance,
      abi: LoanGovernanceABI,
      functionName: "rejectLoan",
      args: [loanId],
    });
    fetchAllLoans();
    return hash;
  };

  // Direct LoanManager approval (for operator/admin)
  const approveLoanDirect = async (loanId: bigint) => {
    const hash = await writeContractAsync({
      address: contracts.loanManager,
      abi: LoanManagerABI,
      functionName: "approveLoan",
      args: [loanId],
    });
    fetchAllLoans();
    return hash;
  };

  // Fetch outstanding balance on any active loan
  const getLoanOutstanding = async (loanId: bigint): Promise<bigint> => {
    if (!publicClient) return BigInt(0);
    try {
      return await publicClient.readContract({
        address: contracts.loanManager,
        abi: LoanManagerABI,
        functionName: "getOutstandingBalance",
        args: [loanId],
      });
    } catch {
      return BigInt(0);
    }
  };

  return {
    address,
    isConnected,
    chain,
    credBalance: credBalance as bigint | undefined,
    totalLoans: totalLoans as bigint | undefined,
    activeLoans: activeLoans as bigint | undefined,
    borrowerLoanIds: (borrowerLoanIds || []) as bigint[],
    reputationScore: reputationScore ? Number(reputationScore) : 50,
    reputationRecord,
    oraclePrice: oracleData
      ? (Array.isArray(oracleData) ? oracleData[0] : (oracleData as any)?.price)
      : undefined,
    allLoans,
    loadingLoans,
    borrowerLoans,
    lenderInvestments,
    marketplaceLoans,
    pendingApprovalLoans,
    fetchAllLoans,
    getLoanOutstanding,
    requestFaucet,
    approveToken,
    requestLoan,
    activateLoan,
    repayLoan,
    approveGovernance,
    rejectGovernance,
    approveLoanDirect,
    refetchBalance,
    refetchBorrowerLoans,
    refetchTotalLoans,
    refetchActiveLoans,
    isWritePending,
  };
}
