// Contract addresses — update after deployment
export const contracts = {
  credToken: (process.env.NEXT_PUBLIC_CRED_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  loanManager: (process.env.NEXT_PUBLIC_LOAN_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  loanEscrow: (process.env.NEXT_PUBLIC_LOAN_ESCROW_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  loanGovernance: (process.env.NEXT_PUBLIC_LOAN_GOVERNANCE_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  collateralOracle: (process.env.NEXT_PUBLIC_COLLATERAL_ORACLE_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  borrowerReputation: (process.env.NEXT_PUBLIC_BORROWER_REPUTATION_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
} as const;

export const chainConfig = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111"),
  networkName: process.env.NEXT_PUBLIC_NETWORK_NAME || "Sepolia",
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  explorerUrl: "https://sepolia.etherscan.io",
} as const;
