// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ILoanEscrow
 * @notice Interface for the escrow contract managing collateral and loan fund custody
 * @dev Module 2 — Token transfers, collateralization, and escrow
 */
interface ILoanEscrow {
    event CollateralDeposited(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event CollateralReleased(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event CollateralSeized(uint256 indexed loanId, uint256 amount);
    event LoanFundsDeposited(uint256 indexed loanId, address indexed lender, uint256 amount);
    event LoanFundsDisbursed(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event RepaymentReceived(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event RepaymentForwarded(uint256 indexed loanId, address indexed lender, uint256 amount);

    function depositCollateral(uint256 loanId, address borrower, uint256 amount) external;
    function releaseCollateral(uint256 loanId, address borrower) external;
    function seizeCollateral(uint256 loanId) external;

    function depositLoanFunds(uint256 loanId, address lender, uint256 amount) external;
    function disburseLoanFunds(uint256 loanId, address borrower) external;

    function receiveRepayment(uint256 loanId, address borrower, uint256 amount) external;
    function forwardRepaymentToLender(uint256 loanId, address lender, uint256 amount) external;

    function getCollateralBalance(uint256 loanId) external view returns (uint256);
    function getLoanFundBalance(uint256 loanId) external view returns (uint256);
    function getEscrowDetails(uint256 loanId) external view returns (
        uint256 collateral,
        uint256 loanFunds,
        uint256 repaymentBalance,
        bool collateralReleased,
        bool fundsDisburse
    );
}
