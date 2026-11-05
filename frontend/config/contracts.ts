// Contract addresses — auto-configured for active deployment
export const contracts = {
  credToken: (process.env.NEXT_PUBLIC_CRED_TOKEN_ADDRESS || "0x95401dc811bb5740090279Ba06cfA8fcF6113778") as `0x${string}`,
  loanManager: (process.env.NEXT_PUBLIC_LOAN_MANAGER_ADDRESS || "0x4826533B4897376654Bb4d4AD88B7faFD0C98528") as `0x${string}`,
  loanEscrow: (process.env.NEXT_PUBLIC_LOAN_ESCROW_ADDRESS || "0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf") as `0x${string}`,
  loanGovernance: (process.env.NEXT_PUBLIC_LOAN_GOVERNANCE_ADDRESS || "0x998abeb3E57409262aE5b751f60747921B33613E") as `0x${string}`,
  collateralOracle: (process.env.NEXT_PUBLIC_COLLATERAL_ORACLE_ADDRESS || "0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf") as `0x${string}`,
  borrowerReputation: (process.env.NEXT_PUBLIC_BORROWER_REPUTATION_ADDRESS || "0x70e0bA845a1A0F2DA3359C97E0285013525FFC49") as `0x${string}`,
  creditPassportRegistry: (process.env.NEXT_PUBLIC_CREDIT_PASSPORT_REGISTRY_ADDRESS || "0x9d4454B023096f34B160D6B654540c56A1F81688") as `0x${string}`,
  verificationRegistry: (process.env.NEXT_PUBLIC_VERIFICATION_REGISTRY_ADDRESS || "0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00") as `0x${string}`,
} as const;

export const chainConfig = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || "31337"),
  networkName: process.env.NEXT_PUBLIC_NETWORK_NAME || "Anvil Local (Sepolia Fork)",
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  explorerUrl: "https://sepolia.etherscan.io",
} as const;
