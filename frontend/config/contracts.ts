// Contract addresses — auto-configured for active deployment
export const contracts = {
  credToken: (process.env.NEXT_PUBLIC_CRED_TOKEN_ADDRESS || "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c") as `0x${string}`,
  loanManager: (process.env.NEXT_PUBLIC_LOAN_MANAGER_ADDRESS || "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1") as `0x${string}`,
  loanEscrow: (process.env.NEXT_PUBLIC_LOAN_ESCROW_ADDRESS || "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44") as `0x${string}`,
  loanGovernance: (process.env.NEXT_PUBLIC_LOAN_GOVERNANCE_ADDRESS || "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d") as `0x${string}`,
  collateralOracle: (process.env.NEXT_PUBLIC_COLLATERAL_ORACLE_ADDRESS || "0x4A679253410272dd5232B3Ff7cF5dbB88f295319") as `0x${string}`,
  borrowerReputation: (process.env.NEXT_PUBLIC_BORROWER_REPUTATION_ADDRESS || "0x59b670e9fA9D0A427751Af201D676719a970857b") as `0x${string}`,
  creditPassportRegistry: (process.env.NEXT_PUBLIC_CREDIT_PASSPORT_REGISTRY_ADDRESS || "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F") as `0x${string}`,
} as const;

export const chainConfig = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || "31337"),
  networkName: process.env.NEXT_PUBLIC_NETWORK_NAME || "Anvil Local (Sepolia Fork)",
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  explorerUrl: "https://sepolia.etherscan.io",
} as const;
