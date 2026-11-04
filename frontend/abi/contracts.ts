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


export const CreditPassportRegistryABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "admin",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "DEFAULT_ADMIN_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ISSUER_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "PAUSER_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getBorrowerPassportCount",
    "inputs": [
      {
        "name": "borrower",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getBorrowerPassports",
    "inputs": [
      {
        "name": "borrower",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPassport",
    "inputs": [
      {
        "name": "passportId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct ICreditPassportRegistry.PassportRecord",
        "components": [
          {
            "name": "dataHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "borrower",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "issuedAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "expiresAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "revoked",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "version",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoleAdmin",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "grantRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "hasRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isPassportValid",
    "inputs": [
      {
        "name": "passportId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registerPassport",
    "inputs": [
      {
        "name": "passportId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "borrower",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "dataHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "expiresAt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "callerConfirmation",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revokePassport",
    "inputs": [
      {
        "name": "passportId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revokeRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "supportsInterface",
    "inputs": [
      {
        "name": "interfaceId",
        "type": "bytes4",
        "internalType": "bytes4"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "unpause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "verifyPassport",
    "inputs": [
      {
        "name": "passportId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "dataHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "isValid",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "status",
        "type": "uint8",
        "internalType": "enum ICreditPassportRegistry.PassportStatus"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "PassportRegistered",
    "inputs": [
      {
        "name": "passportId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "borrower",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "dataHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "issuedAt",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "expiresAt",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "version",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PassportRevoked",
    "inputs": [
      {
        "name": "passportId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "borrower",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "revoker",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Paused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleAdminChanged",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "previousAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "newAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleGranted",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleRevoked",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Unpaused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AccessControlBadConfirmation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AccessControlUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "neededRole",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "EnforcedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ExpectedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidExpirationTime",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PassportAlreadyExists",
    "inputs": [
      {
        "name": "passportId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "PassportAlreadyRevoked",
    "inputs": [
      {
        "name": "passportId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "PassportNotFound",
    "inputs": [
      {
        "name": "passportId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnauthorizedCaller",
    "inputs": [
      {
        "name": "caller",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroDataHash",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroPassportId",
    "inputs": []
  }
] as const;
