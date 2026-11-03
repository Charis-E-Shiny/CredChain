"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { contracts } from "@/config/contracts";
import {
  CredTokenABI,
  LoanManagerABI,
  LoanEscrowABI,
  LoanGovernanceABI,
  BorrowerReputationABI,
  CollateralOracleABI,
} from "@/abi/contracts";
import { parseEther } from "viem";

export function useCredChain() {
  const { address, isConnected, chain } = useAccount();

  // Read CredToken balance
  const { data: credBalance, refetch: refetchBalance } = useReadContract({
    address: contracts.credToken,
    abi: CredTokenABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read total loans
  const { data: totalLoans } = useReadContract({
    address: contracts.loanManager,
    abi: LoanManagerABI,
    functionName: "getTotalLoans",
  });

  // Read active loan count
  const { data: activeLoans } = useReadContract({
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
  const { data: reputationScore } = useReadContract({
    address: contracts.borrowerReputation,
    abi: BorrowerReputationABI,
    functionName: "getReputationScore",
    args: address ? [address] : undefined,
  });

  const { data: reputationRecord } = useReadContract({
    address: contracts.borrowerReputation,
    abi: BorrowerReputationABI,
    functionName: "getReputation",
    args: address ? [address] : undefined,
  });

  // Read latest oracle price
  const { data: oracleData } = useReadContract({
    address: contracts.collateralOracle,
    abi: CollateralOracleABI,
    functionName: "getLatestPrice",
  });

  // Write contract hook
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  // Faucet request
  const requestFaucet = async (amount: string = "1000") => {
    return await writeContractAsync({
      address: contracts.credToken,
      abi: CredTokenABI,
      functionName: "faucet",
      args: [parseEther(amount)],
    });
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
    return await writeContractAsync({
      address: contracts.loanManager,
      abi: LoanManagerABI,
      functionName: "requestLoan",
      args: [amount, collateralAmount, durationSeconds, interestBps, riskHash],
    });
  };

  // Activate loan
  const activateLoan = async (loanId: bigint) => {
    return await writeContractAsync({
      address: contracts.loanManager,
      abi: LoanManagerABI,
      functionName: "activateLoan",
      args: [loanId],
    });
  };

  // Repay loan
  const repayLoan = async (loanId: bigint, amount: bigint) => {
    return await writeContractAsync({
      address: contracts.loanManager,
      abi: LoanManagerABI,
      functionName: "repayLoan",
      args: [loanId, amount],
    });
  };

  // Governance approve
  const approveGovernance = async (loanId: bigint) => {
    return await writeContractAsync({
      address: contracts.loanGovernance,
      abi: LoanGovernanceABI,
      functionName: "submitApproval",
      args: [loanId],
    });
  };

  // Governance reject
  const rejectGovernance = async (loanId: bigint) => {
    return await writeContractAsync({
      address: contracts.loanGovernance,
      abi: LoanGovernanceABI,
      functionName: "rejectLoan",
      args: [loanId],
    });
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
    oraclePrice: oracleData ? (oracleData as [bigint, bigint])[0] : undefined,
    requestFaucet,
    approveToken,
    requestLoan,
    activateLoan,
    repayLoan,
    approveGovernance,
    rejectGovernance,
    refetchBalance,
    refetchBorrowerLoans,
    isWritePending,
  };
}
