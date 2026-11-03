// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ILoanManager
 * @notice Interface for the core loan lifecycle management contract
 * @dev Module 1 — State machines and event-driven smart contract architecture
 */
interface ILoanManager {
    enum LoanStatus {
        REQUESTED,
        APPROVED,
        ACTIVE,
        REPAID,
        DEFAULTED,
        REJECTED,
        CANCELLED
    }

    struct Loan {
        uint256 id;
        address borrower;
        address lender;
        uint256 principal;
        uint256 repaid;
        uint256 collateralAmount;
        uint256 interestRateBps; // basis points (e.g., 500 = 5%)
        uint256 applicationTime;
        uint256 approvalTime;
        uint256 activationTime;
        uint256 repaymentDeadline;
        uint256 duration; // in seconds
        LoanStatus status;
        bytes32 riskAssessmentHash; // hash of off-chain ML assessment
    }

    // Events
    event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 collateral);
    event LoanApproved(uint256 indexed loanId, address indexed approver);
    event LoanRejected(uint256 indexed loanId, address indexed rejector);
    event LoanActivated(uint256 indexed loanId, address indexed lender, uint256 timestamp);
    event LoanRepaid(uint256 indexed loanId, uint256 amount, uint256 remaining);
    event LoanDefaulted(uint256 indexed loanId, uint256 timestamp);
    event LoanClosed(uint256 indexed loanId);
    event LoanCancelled(uint256 indexed loanId, address indexed borrower);

    function requestLoan(
        uint256 amount,
        uint256 collateralAmount,
        uint256 duration,
        uint256 interestRateBps,
        bytes32 riskAssessmentHash
    ) external returns (uint256 loanId);

    function approveLoan(uint256 loanId) external;
    function rejectLoan(uint256 loanId) external;
    function activateLoan(uint256 loanId) external;
    function repayLoan(uint256 loanId, uint256 amount) external;
    function markDefault(uint256 loanId) external;
    function cancelLoan(uint256 loanId) external;

    function getLoan(uint256 loanId) external view returns (Loan memory);
    function getLoanStatus(uint256 loanId) external view returns (LoanStatus);
    function getBorrowerLoans(address borrower) external view returns (uint256[] memory);
    function getActiveLoanCount() external view returns (uint256);
    function getTotalLoans() external view returns (uint256);
}
