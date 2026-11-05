// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ILoanManager.sol";
import "./interfaces/ILoanEscrow.sol";
import "./interfaces/ILoanGovernance.sol";
import "./interfaces/IBorrowerReputation.sol";

/**
 * @title LoanManager
 * @author CredChain Team — Member 1
 * @notice Core loan lifecycle management with state machine enforcement
 * @dev Module 1 — State machines and event-driven blockchain architecture
 *
 * Manages the full loan lifecycle: REQUESTED → APPROVED → ACTIVE → REPAID/DEFAULTED
 * Coordinates with LoanEscrow for fund management, LoanGovernance for authorization,
 * and BorrowerReputation for on-chain reputation tracking.
 */
contract LoanManager is ILoanManager, AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Counter for generating unique loan IDs
    uint256 private _nextLoanId;

    /// @notice Mapping of loan ID to loan data
    mapping(uint256 => Loan) private _loans;

    /// @notice Mapping of borrower address to their loan IDs
    mapping(address => uint256[]) private _borrowerLoans;

    /// @notice Count of currently active loans
    uint256 private _activeLoanCount;

    /// @notice Maximum loan duration: 365 days
    uint256 public constant MAX_DURATION = 365 days;

    /// @notice Minimum loan duration: 1 day
    uint256 public constant MIN_DURATION = 1 days;

    /// @notice Maximum interest rate: 50% (5000 bps)
    uint256 public constant MAX_INTEREST_RATE_BPS = 5000;

    /// @notice Maximum active loans per borrower
    uint256 public constant MAX_ACTIVE_LOANS_PER_BORROWER = 5;

    /// @notice Approval expiry period: 7 days
    uint256 public constant APPROVAL_EXPIRY = 7 days;

    // External contract references
    ILoanEscrow public escrow;
    ILoanGovernance public governance;
    IBorrowerReputation public reputation;

    // Errors
    error InvalidAmount();
    error InvalidDuration();
    error InvalidInterestRate();
    error LoanNotFound(uint256 loanId);
    error InvalidStateTransition(uint256 loanId, LoanStatus current, LoanStatus target);
    error UnauthorizedCaller(address caller);
    error NotBorrower(uint256 loanId, address caller);
    error NotLender(uint256 loanId, address caller);
    error MaxActiveLoansReached(address borrower);
    error RepaymentExceedsOutstanding(uint256 repayment, uint256 outstanding);
    error LoanNotExpired(uint256 loanId);
    error ApprovalExpired(uint256 loanId);
    error ZeroAddress();
    error ContractsNotConfigured();

    modifier loanExists(uint256 loanId) {
        if (loanId >= _nextLoanId) revert LoanNotFound(loanId);
        _;
    }

    modifier inStatus(uint256 loanId, LoanStatus expected) {
        if (_loans[loanId].status != expected) {
            revert InvalidStateTransition(loanId, _loans[loanId].status, expected);
        }
        _;
    }

    modifier contractsConfigured() {
        if (address(escrow) == address(0) || address(governance) == address(0)) {
            revert ContractsNotConfigured();
        }
        _;
    }

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ============================
    //  Configuration
    // ============================

    /**
     * @notice Set external contract references
     * @param _escrow Address of the LoanEscrow contract
     * @param _governance Address of the LoanGovernance contract
     * @param _reputation Address of the BorrowerReputation contract
     */
    function setContracts(
        address _escrow,
        address _governance,
        address _reputation
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_escrow == address(0) || _governance == address(0)) revert ZeroAddress();
        escrow = ILoanEscrow(_escrow);
        governance = ILoanGovernance(_governance);
        if (_reputation != address(0)) {
            reputation = IBorrowerReputation(_reputation);
        }
    }

    // ============================
    //  Loan Lifecycle
    // ============================

    /**
     * @notice Submit a new loan request and lock its collateral in escrow
     * @dev The borrower must have approved the escrow for `collateralAmount`
     * @param amount Requested loan amount in tokens
     * @param collateralAmount Collateral amount to lock
     * @param duration Loan duration in seconds
     * @param interestRateBps Interest rate in basis points
     * @param riskAssessmentHash Keccak256 hash of off-chain ML assessment
     * @return loanId The ID of the newly created loan
     */
    function requestLoan(
        uint256 amount,
        uint256 collateralAmount,
        uint256 duration,
        uint256 interestRateBps,
        bytes32 riskAssessmentHash
    ) external whenNotPaused nonReentrant contractsConfigured returns (uint256 loanId) {
        if (amount == 0) revert InvalidAmount();
        if (duration < MIN_DURATION || duration > MAX_DURATION) revert InvalidDuration();
        if (interestRateBps > MAX_INTEREST_RATE_BPS) revert InvalidInterestRate();

        // Check borrower doesn't exceed max active loans
        uint256 activeCount = _countActiveLoansByBorrower(msg.sender);
        if (activeCount >= MAX_ACTIVE_LOANS_PER_BORROWER) {
            revert MaxActiveLoansReached(msg.sender);
        }

        loanId = _nextLoanId++;

        _loans[loanId] = Loan({
            id: loanId,
            borrower: msg.sender,
            lender: address(0),
            principal: amount,
            repaid: 0,
            collateralAmount: collateralAmount,
            interestRateBps: interestRateBps,
            applicationTime: block.timestamp,
            approvalTime: 0,
            activationTime: 0,
            repaymentDeadline: 0,
            duration: duration,
            status: LoanStatus.REQUESTED,
            riskAssessmentHash: riskAssessmentHash
        });

        _borrowerLoans[msg.sender].push(loanId);

        if (collateralAmount > 0) {
            escrow.depositCollateral(loanId, msg.sender, collateralAmount);
        }

        emit LoanRequested(loanId, msg.sender, amount, collateralAmount);
    }

    /**
     * @notice Approve a loan request (called after governance authorization)
     * @param loanId The loan to approve
     */
    function approveLoan(uint256 loanId)
        external
        loanExists(loanId)
        inStatus(loanId, LoanStatus.REQUESTED)
        whenNotPaused
    {
        // Only governance contract or operator can approve
        if (msg.sender != address(governance) && !hasRole(OPERATOR_ROLE, msg.sender)) {
            revert UnauthorizedCaller(msg.sender);
        }

        _loans[loanId].status = LoanStatus.APPROVED;
        _loans[loanId].approvalTime = block.timestamp;

        emit LoanApproved(loanId, msg.sender);
    }

    /**
     * @notice Reject a loan request and refund its collateral
     * @param loanId The loan to reject
     */
    function rejectLoan(uint256 loanId)
        external
        loanExists(loanId)
        inStatus(loanId, LoanStatus.REQUESTED)
        whenNotPaused
        nonReentrant
    {
        if (msg.sender != address(governance) && !hasRole(OPERATOR_ROLE, msg.sender)) {
            revert UnauthorizedCaller(msg.sender);
        }

        _loans[loanId].status = LoanStatus.REJECTED;

        _refundCollateral(_loans[loanId]);

        emit LoanRejected(loanId, msg.sender);
    }

    /**
     * @notice Activate an approved loan — funds are disbursed to borrower
     * @dev The lender calls this to fund the loan, and must have approved the
     *      escrow for the principal.
     *      Requires: loan is APPROVED and the approval has not expired
     * @param loanId The loan to activate
     */
    function activateLoan(uint256 loanId)
        external
        loanExists(loanId)
        inStatus(loanId, LoanStatus.APPROVED)
        whenNotPaused
        nonReentrant
        contractsConfigured
    {
        Loan storage loan = _loans[loanId];

        // Check approval hasn't expired
        if (block.timestamp > loan.approvalTime + APPROVAL_EXPIRY) {
            revert ApprovalExpired(loanId);
        }

        loan.lender = msg.sender;
        loan.status = LoanStatus.ACTIVE;
        loan.activationTime = block.timestamp;
        loan.repaymentDeadline = block.timestamp + loan.duration;
        _activeLoanCount++;

        // Record in reputation system
        if (address(reputation) != address(0)) {
            reputation.recordLoan(loan.borrower, loanId, loan.principal);
        }

        escrow.depositLoanFunds(loanId, msg.sender, loan.principal);
        escrow.disburseLoanFunds(loanId, loan.borrower);

        emit LoanActivated(loanId, msg.sender, block.timestamp);
    }

    /**
     * @notice Repay part or all of an active loan
     * @dev The borrower must have approved the escrow for `amount`. Each payment
     *      is forwarded to the lender; the final one also releases the collateral.
     * @param loanId The loan to repay
     * @param amount Amount to repay
     */
    function repayLoan(uint256 loanId, uint256 amount)
        external
        loanExists(loanId)
        inStatus(loanId, LoanStatus.ACTIVE)
        whenNotPaused
        nonReentrant
    {
        Loan storage loan = _loans[loanId];
        if (msg.sender != loan.borrower) revert NotBorrower(loanId, msg.sender);
        if (amount == 0) revert InvalidAmount();

        uint256 totalOwed = _calculateTotalOwed(loan);
        uint256 outstanding = totalOwed - loan.repaid;

        if (amount > outstanding) {
            revert RepaymentExceedsOutstanding(amount, outstanding);
        }

        // Effects
        loan.repaid += amount;
        bool fullyRepaid = loan.repaid >= totalOwed;
        if (fullyRepaid) {
            loan.status = LoanStatus.REPAID;
            _activeLoanCount--;
        }

        emit LoanRepaid(loanId, amount, totalOwed - loan.repaid);

        // Interactions
        escrow.receiveRepayment(loanId, loan.borrower, amount);
        escrow.forwardRepaymentToLender(loanId, loan.lender, amount);

        if (fullyRepaid) {
            _refundCollateral(loan);

            if (address(reputation) != address(0)) {
                reputation.recordRepayment(loan.borrower, loanId, loan.repaid);
            }

            emit LoanClosed(loanId);
        }
    }

    /**
     * @notice Mark a loan as defaulted and seize its collateral for the lender
     * @dev Callable once the repayment deadline has passed
     * @param loanId The loan to default
     */
    function markDefault(uint256 loanId)
        external
        loanExists(loanId)
        inStatus(loanId, LoanStatus.ACTIVE)
        whenNotPaused
        nonReentrant
    {
        Loan storage loan = _loans[loanId];

        if (block.timestamp <= loan.repaymentDeadline) {
            revert LoanNotExpired(loanId);
        }

        loan.status = LoanStatus.DEFAULTED;
        _activeLoanCount--;

        if (address(reputation) != address(0)) {
            reputation.recordDefault(loan.borrower, loanId);
        }

        if (loan.collateralAmount > 0) {
            escrow.seizeCollateral(loanId);
        }

        emit LoanDefaulted(loanId, block.timestamp);
    }

    /**
     * @notice Cancel a loan and refund its collateral (borrower only)
     * @dev Allowed before approval, or once an approval has expired unfunded,
     *      so that collateral can never be stranded in escrow
     * @param loanId The loan to cancel
     */
    function cancelLoan(uint256 loanId)
        external
        loanExists(loanId)
        whenNotPaused
        nonReentrant
    {
        Loan storage loan = _loans[loanId];

        bool approvalExpired = loan.status == LoanStatus.APPROVED
            && block.timestamp > loan.approvalTime + APPROVAL_EXPIRY;
        if (loan.status != LoanStatus.REQUESTED && !approvalExpired) {
            revert InvalidStateTransition(loanId, loan.status, LoanStatus.REQUESTED);
        }
        if (loan.borrower != msg.sender) revert NotBorrower(loanId, msg.sender);

        loan.status = LoanStatus.CANCELLED;

        _refundCollateral(loan);

        emit LoanCancelled(loanId, msg.sender);
    }

    // ============================
    //  View Functions
    // ============================

    function getLoan(uint256 loanId) external view loanExists(loanId) returns (Loan memory) {
        return _loans[loanId];
    }

    function getLoanStatus(uint256 loanId) external view loanExists(loanId) returns (LoanStatus) {
        return _loans[loanId].status;
    }

    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return _borrowerLoans[borrower];
    }

    function getActiveLoanCount() external view returns (uint256) {
        return _activeLoanCount;
    }

    function getTotalLoans() external view returns (uint256) {
        return _nextLoanId;
    }

    function getOutstandingBalance(uint256 loanId) external view loanExists(loanId) returns (uint256) {
        Loan storage loan = _loans[loanId];
        if (loan.status != LoanStatus.ACTIVE) return 0;
        uint256 totalOwed = _calculateTotalOwed(loan);
        return totalOwed - loan.repaid;
    }

    // ============================
    //  Admin Functions
    // ============================

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ============================
    //  Internal Functions
    // ============================

    function _refundCollateral(Loan storage loan) internal {
        if (loan.collateralAmount > 0) {
            escrow.releaseCollateral(loan.id, loan.borrower);
        }
    }

    function _calculateTotalOwed(Loan storage loan) internal view returns (uint256) {
        // Simple interest: principal + (principal * rate * time) / (10000 * 365 days)
        // For simplicity in this prototype, we use: principal * (10000 + interestRateBps) / 10000
        return (loan.principal * (10000 + loan.interestRateBps)) / 10000;
    }

    function _countActiveLoansByBorrower(address borrower) internal view returns (uint256 count) {
        uint256[] storage loanIds = _borrowerLoans[borrower];
        for (uint256 i = 0; i < loanIds.length; i++) {
            LoanStatus status = _loans[loanIds[i]].status;
            if (status == LoanStatus.REQUESTED || status == LoanStatus.APPROVED || status == LoanStatus.ACTIVE) {
                count++;
            }
        }
    }
}
