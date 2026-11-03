// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IBorrowerReputation
 * @notice Interface for on-chain borrower reputation tracking
 * @dev Module 4 — Persistent on-chain reputation
 */
interface IBorrowerReputation {
    struct ReputationRecord {
        uint256 totalLoans;
        uint256 repaidLoans;
        uint256 defaultedLoans;
        uint256 totalBorrowed;
        uint256 totalRepaid;
        uint256 lastActivityTimestamp;
    }

    event RepaymentRecorded(address indexed borrower, uint256 indexed loanId, uint256 amount);
    event DefaultRecorded(address indexed borrower, uint256 indexed loanId);
    event LoanRecorded(address indexed borrower, uint256 indexed loanId, uint256 amount);

    function recordLoan(address borrower, uint256 loanId, uint256 amount) external;
    function recordRepayment(address borrower, uint256 loanId, uint256 amount) external;
    function recordDefault(address borrower, uint256 loanId) external;

    function getReputation(address borrower) external view returns (ReputationRecord memory);
    function getReputationScore(address borrower) external view returns (uint256);
    function getCompletionRate(address borrower) external view returns (uint256);
}
