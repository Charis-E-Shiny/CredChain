export const CredTokenABI = [
  {
    type: "constructor",
    inputs: [{ name: "admin", type: "address", internalType: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "faucet",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "spender", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TokensMinted",
    inputs: [
      { name: "minter", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const LoanManagerABI = [
  {
    type: "constructor",
    inputs: [{ name: "admin", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "requestLoan",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "collateralAmount", type: "uint256" },
      { name: "duration", type: "uint256" },
      { name: "interestRateBps", type: "uint256" },
      { name: "riskAssessmentHash", type: "bytes32" },
    ],
    outputs: [{ name: "loanId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "activateLoan",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "repayLoan",
    inputs: [
      { name: "loanId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelLoan",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "markDefault",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getLoan",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "borrower", type: "address" },
          { name: "lender", type: "address" },
          { name: "principal", type: "uint256" },
          { name: "repaid", type: "uint256" },
          { name: "collateralAmount", type: "uint256" },
          { name: "interestRateBps", type: "uint256" },
          { name: "applicationTime", type: "uint256" },
          { name: "approvalTime", type: "uint256" },
          { name: "activationTime", type: "uint256" },
          { name: "repaymentDeadline", type: "uint256" },
          { name: "duration", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "riskAssessmentHash", type: "bytes32" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLoanStatus",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBorrowerLoans",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getActiveLoanCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTotalLoans",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getOutstandingBalance",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "LoanRequested",
    inputs: [
      { name: "loanId", type: "uint256", indexed: true },
      { name: "borrower", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "collateral", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LoanApproved",
    inputs: [
      { name: "loanId", type: "uint256", indexed: true },
      { name: "approver", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "LoanActivated",
    inputs: [
      { name: "loanId", type: "uint256", indexed: true },
      { name: "lender", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LoanRepaid",
    inputs: [
      { name: "loanId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "remaining", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LoanDefaulted",
    inputs: [
      { name: "loanId", type: "uint256", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LoanClosed",
    inputs: [{ name: "loanId", type: "uint256", indexed: true }],
  },
  {
    type: "event",
    name: "LoanCancelled",
    inputs: [
      { name: "loanId", type: "uint256", indexed: true },
      { name: "borrower", type: "address", indexed: true },
    ],
  },
] as const;

export const LoanEscrowABI = [
  {
    type: "function",
    name: "getCollateralBalance",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLoanFundBalance",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getEscrowDetails",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [
      { name: "collateral", type: "uint256" },
      { name: "loanFunds", type: "uint256" },
      { name: "repaymentBalance", type: "uint256" },
      { name: "collateralReleased", type: "bool" },
      { name: "fundsDisbursed", type: "bool" },
    ],
    stateMutability: "view",
  },
] as const;

export const LoanGovernanceABI = [
  {
    type: "function",
    name: "submitApproval",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "rejectLoan",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isApproved",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getApprovalCount",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getApprovers",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasApproved",
    inputs: [
      { name: "loanId", type: "uint256" },
      { name: "approver", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRequiredApprovals",
    inputs: [{ name: "loanAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getApprovalThreshold",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getHighValueThreshold",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "LoanApprovalSubmitted",
    inputs: [
      { name: "loanId", type: "uint256", indexed: true },
      { name: "approver", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "LoanApprovalThresholdMet",
    inputs: [
      { name: "loanId", type: "uint256", indexed: true },
      { name: "approvalCount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LoanRejectedByGovernance",
    inputs: [
      { name: "loanId", type: "uint256", indexed: true },
      { name: "rejector", type: "address", indexed: true },
    ],
  },
] as const;

export const BorrowerReputationABI = [
  {
    type: "function",
    name: "getReputation",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "totalLoans", type: "uint256" },
          { name: "repaidLoans", type: "uint256" },
          { name: "defaultedLoans", type: "uint256" },
          { name: "totalBorrowed", type: "uint256" },
          { name: "totalRepaid", type: "uint256" },
          { name: "lastActivityTimestamp", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getReputationScore",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ name: "score", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCompletionRate",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const CollateralOracleABI = [
  {
    type: "function",
    name: "getLatestPrice",
    inputs: [],
    outputs: [
      { name: "price", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCollateralValueUSD",
    inputs: [{ name: "ethAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLoanToValueRatio",
    inputs: [
      { name: "loanAmountUSD", type: "uint256" },
      { name: "collateralETH", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isCollateralSufficient",
    inputs: [
      { name: "loanAmountUSD", type: "uint256" },
      { name: "collateralETH", type: "uint256" },
      { name: "requiredLTVBps", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRequiredCollateral",
    inputs: [
      { name: "loanAmountUSD", type: "uint256" },
      { name: "ltvBps", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
