// Contract addresses — auto-configured for active deployment
export const contracts = {
  credToken: (process.env.NEXT_PUBLIC_CRED_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`,
  loanManager: (process.env.NEXT_PUBLIC_LOAN_MANAGER_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9") as `0x${string}`,
  loanEscrow: (process.env.NEXT_PUBLIC_LOAN_ESCROW_ADDRESS || "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9") as `0x${string}`,
  loanGovernance: (process.env.NEXT_PUBLIC_LOAN_GOVERNANCE_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512") as `0x${string}`,
  collateralOracle: (process.env.NEXT_PUBLIC_COLLATERAL_ORACLE_ADDRESS || "0x0165878A594ca255338adfa4d48449f69242Eb8F") as `0x${string}`,
  borrowerReputation: (process.env.NEXT_PUBLIC_BORROWER_REPUTATION_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0") as `0x${string}`,
  creditPassportRegistry: (process.env.NEXT_PUBLIC_CREDIT_PASSPORT_REGISTRY_ADDRESS || "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853") as `0x${string}`,
  verificationRegistry: (process.env.NEXT_PUBLIC_VERIFICATION_REGISTRY_ADDRESS || "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6") as `0x${string}`,
} as const;

export const chainConfig = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || "31337"),
  networkName: process.env.NEXT_PUBLIC_NETWORK_NAME || "Anvil Local",
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  explorerUrl: "https://sepolia.etherscan.io",
} as const;
