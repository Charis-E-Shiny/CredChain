// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/ILoanGovernance.sol";
import "./interfaces/ILoanManager.sol";

/**
 * @title LoanGovernance
 * @author CredChain Team — Member 3
 * @notice Decentralized authorization and multi-signature loan approval
 * @dev Module 3 — Role-based access control and multi-signature authorization
 *
 * Implements a configurable multi-party approval workflow:
 *   - Standard loans require `approvalThreshold` approvals
 *   - High-value loans (>= `highValueThreshold`) require `highValueApprovalThreshold` approvals
 *   - Duplicate approvals are prevented
 *   - Approvers must hold APPROVER_ROLE
 *
 * Trust assumptions:
 *   - DEFAULT_ADMIN_ROLE is trusted to manage roles and thresholds
 *   - Approvers are assumed to be independent authorized entities
 *   - The admin cannot unilaterally approve loans without the required signatures
 */
contract LoanGovernance is ILoanGovernance, AccessControl, Pausable {
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");
    bytes32 public constant LENDER_ROLE = keccak256("LENDER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Minimum approvals required for standard loans
    uint256 private _approvalThreshold;

    /// @notice Minimum approvals required for high-value loans
    uint256 private _highValueApprovalThreshold;

    /// @notice Loan amount threshold for high-value classification (in token wei)
    uint256 private _highValueThreshold;

    /// @notice Reference to the LoanManager contract
    ILoanManager public loanManager;

    /// @notice Per-loan approval tracking
    struct ApprovalRecord {
        address[] approvers;
        mapping(address => bool) hasApproved;
        bool isRejected;
        bool isFullyApproved;
    }

    /// @notice Loan ID -> Approval Record
    mapping(uint256 => ApprovalRecord) private _approvals;

    // Errors
    error ThresholdTooLow();
    error ThresholdExceedsApprovers();
    error AlreadyApproved(uint256 loanId, address approver);
    error AlreadyRejected(uint256 loanId);
    error AlreadyFullyApproved(uint256 loanId);
    error LoanManagerNotSet();
    error ZeroAddress();
    error InvalidThreshold();

    constructor(
        address admin,
        uint256 initialApprovalThreshold,
        uint256 initialHighValueThreshold,
        uint256 initialHighValueApprovalThreshold
    ) {
        if (admin == address(0)) revert ZeroAddress();
        if (initialApprovalThreshold == 0) revert ThresholdTooLow();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(APPROVER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        _approvalThreshold = initialApprovalThreshold;
        _highValueThreshold = initialHighValueThreshold;
        _highValueApprovalThreshold = initialHighValueApprovalThreshold > 0
            ? initialHighValueApprovalThreshold
            : initialApprovalThreshold;
    }

    // ============================
    //  Configuration
    // ============================

    /**
     * @notice Set the LoanManager contract reference
     * @param _loanManager Address of LoanManager
     */
    function setLoanManager(address _loanManager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_loanManager == address(0)) revert ZeroAddress();
        loanManager = ILoanManager(_loanManager);
    }

    /**
     * @notice Update the standard approval threshold
     * @param newThreshold New required number of approvals
     */
    function setApprovalThreshold(uint256 newThreshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newThreshold == 0) revert ThresholdTooLow();
        uint256 old = _approvalThreshold;
        _approvalThreshold = newThreshold;
        emit ApprovalThresholdUpdated(old, newThreshold);
    }

    /**
     * @notice Update the high-value loan threshold
     * @param newThreshold New loan amount threshold
     */
    function setHighValueThreshold(uint256 newThreshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 old = _highValueThreshold;
        _highValueThreshold = newThreshold;
        emit HighValueThresholdUpdated(old, newThreshold);
    }

    /**
     * @notice Update the high-value approval threshold
     * @param newThreshold New required approvals for high-value loans
     */
    function setHighValueApprovalThreshold(uint256 newThreshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newThreshold == 0) revert ThresholdTooLow();
        _highValueApprovalThreshold = newThreshold;
    }

    // ============================
    //  Approval Workflow
    // ============================

    /**
     * @notice Submit an approval for a loan
     * @dev Requires APPROVER_ROLE. If threshold is met, triggers LoanManager approval.
     * @param loanId Loan to approve
     */
    function submitApproval(uint256 loanId) external onlyRole(APPROVER_ROLE) whenNotPaused {
        if (address(loanManager) == address(0)) revert LoanManagerNotSet();

        ApprovalRecord storage record = _approvals[loanId];
        if (record.isRejected) revert AlreadyRejected(loanId);
        if (record.isFullyApproved) revert AlreadyFullyApproved(loanId);
        if (record.hasApproved[msg.sender]) revert AlreadyApproved(loanId, msg.sender);

        // Record approval
        record.hasApproved[msg.sender] = true;
        record.approvers.push(msg.sender);

        emit LoanApprovalSubmitted(loanId, msg.sender);

        // Check if threshold is met
        ILoanManager.Loan memory loan = loanManager.getLoan(loanId);
        uint256 required = getRequiredApprovals(loan.principal);

        if (record.approvers.length >= required) {
            record.isFullyApproved = true;

            emit LoanApprovalThresholdMet(loanId, record.approvers.length);

            // Trigger approval in LoanManager
            loanManager.approveLoan(loanId);
        }
    }

    /**
     * @notice Reject a loan application
     * @param loanId Loan to reject
     */
    function rejectLoan(uint256 loanId) external onlyRole(APPROVER_ROLE) whenNotPaused {
        if (address(loanManager) == address(0)) revert LoanManagerNotSet();

        ApprovalRecord storage record = _approvals[loanId];
        if (record.isRejected) revert AlreadyRejected(loanId);
        if (record.isFullyApproved) revert AlreadyFullyApproved(loanId);

        record.isRejected = true;

        emit LoanRejectedByGovernance(loanId, msg.sender);

        loanManager.rejectLoan(loanId);
    }

    // ============================
    //  View Functions
    // ============================

    function isApproved(uint256 loanId) external view returns (bool) {
        return _approvals[loanId].isFullyApproved;
    }

    function getApprovalCount(uint256 loanId) external view returns (uint256) {
        return _approvals[loanId].approvers.length;
    }

    function getApprovers(uint256 loanId) external view returns (address[] memory) {
        return _approvals[loanId].approvers;
    }

    function hasApproved(uint256 loanId, address approver) external view returns (bool) {
        return _approvals[loanId].hasApproved[approver];
    }

    function getRequiredApprovals(uint256 loanAmount) public view returns (uint256) {
        if (_highValueThreshold > 0 && loanAmount >= _highValueThreshold) {
            return _highValueApprovalThreshold;
        }
        return _approvalThreshold;
    }

    function getApprovalThreshold() external view returns (uint256) {
        return _approvalThreshold;
    }

    function getHighValueThreshold() external view returns (uint256) {
        return _highValueThreshold;
    }

    function getHighValueApprovalThreshold() external view returns (uint256) {
        return _highValueApprovalThreshold;
    }

    // ============================
    //  Admin
    // ============================

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
