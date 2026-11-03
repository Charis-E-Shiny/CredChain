// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ILoanGovernance
 * @notice Interface for decentralized authorization and governance
 * @dev Module 3 — Role-based access control and multi-signature authorization
 */
interface ILoanGovernance {
    event ApproverRegistered(address indexed approver);
    event ApproverRemoved(address indexed approver);
    event LoanApprovalSubmitted(uint256 indexed loanId, address indexed approver);
    event LoanApprovalThresholdMet(uint256 indexed loanId, uint256 approvalCount);
    event LoanRejectedByGovernance(uint256 indexed loanId, address indexed rejector);
    event ApprovalThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event HighValueThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    function submitApproval(uint256 loanId) external;
    function rejectLoan(uint256 loanId) external;

    function isApproved(uint256 loanId) external view returns (bool);
    function getApprovalCount(uint256 loanId) external view returns (uint256);
    function getApprovers(uint256 loanId) external view returns (address[] memory);
    function hasApproved(uint256 loanId, address approver) external view returns (bool);

    function getRequiredApprovals(uint256 loanAmount) external view returns (uint256);
    function getApprovalThreshold() external view returns (uint256);
    function getHighValueThreshold() external view returns (uint256);
    function getHighValueApprovalThreshold() external view returns (uint256);
}
