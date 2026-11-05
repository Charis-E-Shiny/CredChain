// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/LoanManager.sol";
import "../src/CredToken.sol";
import "../src/LoanEscrow.sol";
import "../src/LoanGovernance.sol";
import "../src/BorrowerReputation.sol";

/**
 * @title LoanManagerTest
 * @notice Comprehensive Foundry tests for the LoanManager loan lifecycle contract
 */
contract LoanManagerTest is Test {
    LoanManager public loanManager;
    CredToken public token;
    LoanEscrow public escrow;
    LoanGovernance public governance;
    BorrowerReputation public reputation;

    address public admin = makeAddr("admin");
    address public operator = makeAddr("operator");
    address public borrower = makeAddr("borrower");
    address public borrower2 = makeAddr("borrower2");
    address public lender = makeAddr("lender");
    address public approver1 = makeAddr("approver1");
    address public approver2 = makeAddr("approver2");
    address public unauthorized = makeAddr("unauthorized");

    // Default loan parameters
    uint256 constant LOAN_AMOUNT = 1000 * 1e18;
    uint256 constant COLLATERAL_AMOUNT = 500 * 1e18;
    uint256 constant DURATION = 30 days;
    uint256 constant INTEREST_BPS = 500; // 5%
    bytes32 constant RISK_HASH = keccak256("test-risk-assessment");

    /// @dev Events mirrored for expectEmit
    event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 collateral);
    event LoanApproved(uint256 indexed loanId, address indexed approver);
    event LoanRejected(uint256 indexed loanId, address indexed rejector);
    event LoanActivated(uint256 indexed loanId, address indexed lender, uint256 timestamp);
    event LoanRepaid(uint256 indexed loanId, uint256 amount, uint256 remaining);
    event LoanDefaulted(uint256 indexed loanId, uint256 timestamp);
    event LoanClosed(uint256 indexed loanId);
    event LoanCancelled(uint256 indexed loanId, address indexed borrower);

    function setUp() public {
        vm.startPrank(admin);

        // Deploy contracts
        token = new CredToken(admin);
        loanManager = new LoanManager(admin);
        escrow = new LoanEscrow(address(token), admin);
        governance = new LoanGovernance(admin, 1, 10_000 * 1e18, 2);
        reputation = new BorrowerReputation(admin);

        // Configure LoanManager with external contracts
        loanManager.setContracts(address(escrow), address(governance), address(reputation));

        // Configure governance
        governance.setLoanManager(address(loanManager));

        // Grant operator role on LoanManager
        loanManager.grantRole(loanManager.OPERATOR_ROLE(), operator);

        // Grant LoanManager as operator on escrow
        escrow.grantRole(escrow.OPERATOR_ROLE(), address(loanManager));

        // Grant reputation recorder role to loan manager
        reputation.grantRole(reputation.RECORDER_ROLE(), address(loanManager));

        // Grant approver roles for governance
        governance.grantRole(governance.APPROVER_ROLE(), approver1);
        governance.grantRole(governance.APPROVER_ROLE(), approver2);

        // Grant governance contract the ability to call approveLoan/rejectLoan
        // (governance address acts as caller via its submitApproval/rejectLoan)

        vm.stopPrank();
    }

    // ============================
    //  Helper Functions
    // ============================

    function _requestLoan() internal returns (uint256) {
        return _requestLoanAs(borrower);
    }

    function _requestLoanAs(address _borrower) internal returns (uint256) {
        vm.prank(_borrower);
        return loanManager.requestLoan(LOAN_AMOUNT, COLLATERAL_AMOUNT, DURATION, INTEREST_BPS, RISK_HASH);
    }

    function _requestLoanWithParams(uint256 amount, uint256 duration, uint256 interestBps) internal returns (uint256) {
        vm.prank(borrower);
        return loanManager.requestLoan(amount, COLLATERAL_AMOUNT, duration, interestBps, RISK_HASH);
    }

    function _approveLoan(uint256 loanId) internal {
        vm.prank(operator);
        loanManager.approveLoan(loanId);
    }

    function _activateLoan(uint256 loanId) internal {
        vm.prank(lender);
        loanManager.activateLoan(loanId);
    }

    function _createActiveLoan() internal returns (uint256) {
        uint256 loanId = _requestLoan();
        _approveLoan(loanId);
        _activateLoan(loanId);
        return loanId;
    }

    // ============================
    //  Loan Request Creation
    // ============================

    function test_RequestLoan_Success() public {
        vm.expectEmit(true, true, false, true);
        emit LoanRequested(0, borrower, LOAN_AMOUNT, COLLATERAL_AMOUNT);

        uint256 loanId = _requestLoan();
        assertEq(loanId, 0);

        ILoanManager.Loan memory loan = loanManager.getLoan(loanId);
        assertEq(loan.borrower, borrower);
        assertEq(loan.principal, LOAN_AMOUNT);
        assertEq(loan.collateralAmount, COLLATERAL_AMOUNT);
        assertEq(loan.duration, DURATION);
        assertEq(loan.interestRateBps, INTEREST_BPS);
        assertEq(uint256(loan.status), uint256(ILoanManager.LoanStatus.REQUESTED));
        assertEq(loan.riskAssessmentHash, RISK_HASH);
    }

    function test_RequestLoan_IncrementingIds() public {
        uint256 id0 = _requestLoan();
        uint256 id1 = _requestLoanAs(borrower2);

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(loanManager.getTotalLoans(), 2);
    }

    function test_RequestLoan_TracksBorrowerLoans() public {
        _requestLoan();
        _requestLoan();

        uint256[] memory loans = loanManager.getBorrowerLoans(borrower);
        assertEq(loans.length, 2);
        assertEq(loans[0], 0);
        assertEq(loans[1], 1);
    }

    // ============================
    //  Invalid Loan Parameters
    // ============================

    function test_RequestLoan_RevertZeroAmount() public {
        vm.prank(borrower);
        vm.expectRevert(LoanManager.InvalidAmount.selector);
        loanManager.requestLoan(0, COLLATERAL_AMOUNT, DURATION, INTEREST_BPS, RISK_HASH);
    }

    function test_RequestLoan_RevertDurationTooShort() public {
        vm.prank(borrower);
        vm.expectRevert(LoanManager.InvalidDuration.selector);
        loanManager.requestLoan(LOAN_AMOUNT, COLLATERAL_AMOUNT, 0, INTEREST_BPS, RISK_HASH);
    }

    function test_RequestLoan_RevertDurationTooLong() public {
        vm.prank(borrower);
        vm.expectRevert(LoanManager.InvalidDuration.selector);
        loanManager.requestLoan(LOAN_AMOUNT, COLLATERAL_AMOUNT, 366 days, INTEREST_BPS, RISK_HASH);
    }

    function test_RequestLoan_RevertExcessiveInterest() public {
        vm.prank(borrower);
        vm.expectRevert(LoanManager.InvalidInterestRate.selector);
        loanManager.requestLoan(LOAN_AMOUNT, COLLATERAL_AMOUNT, DURATION, 5001, RISK_HASH);
    }

    function test_RequestLoan_MaxInterestAllowed() public {
        vm.prank(borrower);
        uint256 loanId = loanManager.requestLoan(LOAN_AMOUNT, COLLATERAL_AMOUNT, DURATION, 5000, RISK_HASH);
        ILoanManager.Loan memory loan = loanManager.getLoan(loanId);
        assertEq(loan.interestRateBps, 5000);
    }

    // ============================
    //  State: REQUESTED → APPROVED → ACTIVE → REPAID
    // ============================

    function test_Lifecycle_FullRepayment() public {
        uint256 loanId = _requestLoan();

        // Approve
        vm.expectEmit(true, true, false, true);
        emit LoanApproved(loanId, operator);
        _approveLoan(loanId);

        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.APPROVED));

        // Activate
        _activateLoan(loanId);
        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.ACTIVE));
        assertEq(loanManager.getActiveLoanCount(), 1);

        // Calculate total owed: principal * (10000 + interestBps) / 10000
        uint256 totalOwed = (LOAN_AMOUNT * (10000 + INTEREST_BPS)) / 10000;
        uint256 outstanding = loanManager.getOutstandingBalance(loanId);
        assertEq(outstanding, totalOwed);

        // Repay in full
        vm.prank(borrower);
        loanManager.repayLoan(loanId, totalOwed);

        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.REPAID));
        assertEq(loanManager.getActiveLoanCount(), 0);
    }

    // ============================
    //  State: REQUESTED → REJECTED
    // ============================

    function test_Lifecycle_Rejection() public {
        uint256 loanId = _requestLoan();

        vm.expectEmit(true, true, false, true);
        emit LoanRejected(loanId, operator);

        vm.prank(operator);
        loanManager.rejectLoan(loanId);

        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.REJECTED));
    }

    // ============================
    //  State: REQUESTED → CANCELLED
    // ============================

    function test_Lifecycle_Cancellation() public {
        uint256 loanId = _requestLoan();

        vm.expectEmit(true, true, false, true);
        emit LoanCancelled(loanId, borrower);

        vm.prank(borrower);
        loanManager.cancelLoan(loanId);

        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.CANCELLED));
    }

    function test_CancelLoan_RevertNotBorrower() public {
        uint256 loanId = _requestLoan();

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(LoanManager.NotBorrower.selector, loanId, unauthorized)
        );
        loanManager.cancelLoan(loanId);
    }

    // ============================
    //  State: ACTIVE → DEFAULTED
    // ============================

    function test_Lifecycle_Default() public {
        uint256 loanId = _createActiveLoan();

        ILoanManager.Loan memory loan = loanManager.getLoan(loanId);

        // Warp past the repayment deadline
        vm.warp(loan.repaymentDeadline + 1);

        vm.expectEmit(true, false, false, true);
        emit LoanDefaulted(loanId, block.timestamp);

        vm.prank(operator);
        loanManager.markDefault(loanId);

        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.DEFAULTED));
        assertEq(loanManager.getActiveLoanCount(), 0);
    }

    // ============================
    //  Invalid State Transitions
    // ============================

    function test_ApproveLoan_RevertWhenNotRequested() public {
        uint256 loanId = _requestLoan();
        _approveLoan(loanId);

        // Already APPROVED, cannot approve again
        vm.prank(operator);
        vm.expectRevert(
            abi.encodeWithSelector(
                LoanManager.InvalidStateTransition.selector,
                loanId,
                ILoanManager.LoanStatus.APPROVED,
                ILoanManager.LoanStatus.REQUESTED
            )
        );
        loanManager.approveLoan(loanId);
    }

    function test_ActivateLoan_RevertWhenNotApproved() public {
        uint256 loanId = _requestLoan();

        // Still REQUESTED, cannot activate
        vm.prank(lender);
        vm.expectRevert(
            abi.encodeWithSelector(
                LoanManager.InvalidStateTransition.selector,
                loanId,
                ILoanManager.LoanStatus.REQUESTED,
                ILoanManager.LoanStatus.APPROVED
            )
        );
        loanManager.activateLoan(loanId);
    }

    function test_RepayLoan_RevertWhenRepaid() public {
        uint256 loanId = _createActiveLoan();

        uint256 totalOwed = (LOAN_AMOUNT * (10000 + INTEREST_BPS)) / 10000;

        // Full repayment
        vm.prank(borrower);
        loanManager.repayLoan(loanId, totalOwed);

        // Try to repay again (now REPAID)
        vm.prank(borrower);
        vm.expectRevert(
            abi.encodeWithSelector(
                LoanManager.InvalidStateTransition.selector,
                loanId,
                ILoanManager.LoanStatus.REPAID,
                ILoanManager.LoanStatus.ACTIVE
            )
        );
        loanManager.repayLoan(loanId, 1);
    }

    function test_RejectLoan_RevertWhenActive() public {
        uint256 loanId = _createActiveLoan();

        vm.prank(operator);
        vm.expectRevert(
            abi.encodeWithSelector(
                LoanManager.InvalidStateTransition.selector,
                loanId,
                ILoanManager.LoanStatus.ACTIVE,
                ILoanManager.LoanStatus.REQUESTED
            )
        );
        loanManager.rejectLoan(loanId);
    }

    // ============================
    //  Unauthorized Approval Rejection
    // ============================

    function test_ApproveLoan_RevertUnauthorized() public {
        uint256 loanId = _requestLoan();

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(LoanManager.UnauthorizedCaller.selector, unauthorized)
        );
        loanManager.approveLoan(loanId);
    }

    function test_RejectLoan_RevertUnauthorized() public {
        uint256 loanId = _requestLoan();

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(LoanManager.UnauthorizedCaller.selector, unauthorized)
        );
        loanManager.rejectLoan(loanId);
    }

    // ============================
    //  Repayment Tracking
    // ============================

    function test_RepayLoan_PartialRepayment() public {
        uint256 loanId = _createActiveLoan();

        uint256 totalOwed = (LOAN_AMOUNT * (10000 + INTEREST_BPS)) / 10000;
        uint256 partialAmount = totalOwed / 2;

        vm.prank(borrower);
        loanManager.repayLoan(loanId, partialAmount);

        // Should still be ACTIVE
        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.ACTIVE));

        ILoanManager.Loan memory loan = loanManager.getLoan(loanId);
        assertEq(loan.repaid, partialAmount);

        uint256 remaining = loanManager.getOutstandingBalance(loanId);
        assertEq(remaining, totalOwed - partialAmount);
    }

    function test_RepayLoan_MultiplePartialPayments() public {
        uint256 loanId = _createActiveLoan();

        uint256 totalOwed = (LOAN_AMOUNT * (10000 + INTEREST_BPS)) / 10000;
        uint256 payment1 = totalOwed / 4;
        uint256 payment2 = totalOwed / 4;
        uint256 payment3 = totalOwed - payment1 - payment2;

        vm.startPrank(borrower);
        loanManager.repayLoan(loanId, payment1);
        loanManager.repayLoan(loanId, payment2);
        loanManager.repayLoan(loanId, payment3);
        vm.stopPrank();

        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.REPAID));
    }

    // ============================
    //  Over-repayment Rejection
    // ============================

    function test_RepayLoan_RevertOverpayment() public {
        uint256 loanId = _createActiveLoan();

        uint256 totalOwed = (LOAN_AMOUNT * (10000 + INTEREST_BPS)) / 10000;

        vm.prank(borrower);
        vm.expectRevert(
            abi.encodeWithSelector(LoanManager.RepaymentExceedsOutstanding.selector, totalOwed + 1, totalOwed)
        );
        loanManager.repayLoan(loanId, totalOwed + 1);
    }

    function test_RepayLoan_RevertZeroAmount() public {
        uint256 loanId = _createActiveLoan();

        vm.prank(borrower);
        vm.expectRevert(LoanManager.InvalidAmount.selector);
        loanManager.repayLoan(loanId, 0);
    }

    function test_RepayLoan_RevertNotBorrower() public {
        uint256 loanId = _createActiveLoan();

        vm.prank(lender);
        vm.expectRevert(
            abi.encodeWithSelector(LoanManager.NotBorrower.selector, loanId, lender)
        );
        loanManager.repayLoan(loanId, 100 * 1e18);
    }

    // ============================
    //  Default Only After Deadline
    // ============================

    function test_MarkDefault_RevertBeforeDeadline() public {
        uint256 loanId = _createActiveLoan();

        vm.prank(operator);
        vm.expectRevert(
            abi.encodeWithSelector(LoanManager.LoanNotExpired.selector, loanId)
        );
        loanManager.markDefault(loanId);
    }

    function test_MarkDefault_RevertExactlyAtDeadline() public {
        uint256 loanId = _createActiveLoan();

        ILoanManager.Loan memory loan = loanManager.getLoan(loanId);
        vm.warp(loan.repaymentDeadline);

        vm.prank(operator);
        vm.expectRevert(
            abi.encodeWithSelector(LoanManager.LoanNotExpired.selector, loanId)
        );
        loanManager.markDefault(loanId);
    }

    function test_MarkDefault_SucceedsAfterDeadline() public {
        uint256 loanId = _createActiveLoan();

        ILoanManager.Loan memory loan = loanManager.getLoan(loanId);
        vm.warp(loan.repaymentDeadline + 1);

        vm.prank(operator);
        loanManager.markDefault(loanId);

        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.DEFAULTED));
    }

    // ============================
    //  Max Active Loans Per Borrower
    // ============================

    function test_RequestLoan_RevertMaxActiveLoans() public {
        // Create MAX_ACTIVE_LOANS_PER_BORROWER loans (5)
        for (uint256 i = 0; i < 5; i++) {
            _requestLoan();
        }

        // 6th should fail
        vm.prank(borrower);
        vm.expectRevert(
            abi.encodeWithSelector(LoanManager.MaxActiveLoansReached.selector, borrower)
        );
        loanManager.requestLoan(LOAN_AMOUNT, COLLATERAL_AMOUNT, DURATION, INTEREST_BPS, RISK_HASH);
    }

    function test_RequestLoan_AllowedAfterCancellation() public {
        // Create 5 loans
        uint256[] memory ids = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            ids[i] = _requestLoan();
        }

        // Cancel one
        vm.prank(borrower);
        loanManager.cancelLoan(ids[0]);

        // Now can create another
        uint256 newId = _requestLoan();
        assertEq(newId, 5);
    }

    // ============================
    //  Approval Expiry Enforcement
    // ============================

    function test_ActivateLoan_RevertApprovalExpired() public {
        uint256 loanId = _requestLoan();
        _approveLoan(loanId);

        // Warp past approval expiry (7 days + 1 second)
        vm.warp(block.timestamp + 7 days + 1);

        vm.prank(lender);
        vm.expectRevert(
            abi.encodeWithSelector(LoanManager.ApprovalExpired.selector, loanId)
        );
        loanManager.activateLoan(loanId);
    }

    function test_ActivateLoan_SucceedsBeforeExpiry() public {
        uint256 loanId = _requestLoan();
        _approveLoan(loanId);

        // Warp to just within expiry
        vm.warp(block.timestamp + 7 days);

        vm.prank(lender);
        loanManager.activateLoan(loanId);

        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.ACTIVE));
    }

    // ============================
    //  Configuration
    // ============================

    function test_SetContracts_RevertZeroEscrow() public {
        LoanManager newManager = new LoanManager(admin);
        vm.prank(admin);
        vm.expectRevert(LoanManager.ZeroAddress.selector);
        newManager.setContracts(address(0), address(governance), address(reputation));
    }

    function test_SetContracts_RevertZeroGovernance() public {
        LoanManager newManager = new LoanManager(admin);
        vm.prank(admin);
        vm.expectRevert(LoanManager.ZeroAddress.selector);
        newManager.setContracts(address(escrow), address(0), address(reputation));
    }

    function test_RequestLoan_RevertContractsNotConfigured() public {
        LoanManager newManager = new LoanManager(admin);

        vm.prank(borrower);
        vm.expectRevert(LoanManager.ContractsNotConfigured.selector);
        newManager.requestLoan(LOAN_AMOUNT, COLLATERAL_AMOUNT, DURATION, INTEREST_BPS, RISK_HASH);
    }

    function test_Deployment_RevertZeroAdmin() public {
        vm.expectRevert(LoanManager.ZeroAddress.selector);
        new LoanManager(address(0));
    }

    // ============================
    //  View Functions
    // ============================

    function test_GetLoan_RevertNonExistent() public {
        vm.expectRevert(
            abi.encodeWithSelector(LoanManager.LoanNotFound.selector, 0)
        );
        loanManager.getLoan(0);
    }

    function test_GetOutstandingBalance_ZeroWhenNotActive() public {
        uint256 loanId = _requestLoan();
        assertEq(loanManager.getOutstandingBalance(loanId), 0);
    }

    // ============================
    //  Pause Functionality
    // ============================

    function test_RequestLoan_RevertWhenPaused() public {
        vm.prank(admin);
        loanManager.pause();

        vm.prank(borrower);
        vm.expectRevert();
        loanManager.requestLoan(LOAN_AMOUNT, COLLATERAL_AMOUNT, DURATION, INTEREST_BPS, RISK_HASH);
    }

    function test_Unpause_AllowsOperations() public {
        vm.prank(admin);
        loanManager.pause();

        vm.prank(admin);
        loanManager.unpause();

        // Should work again
        _requestLoan();
        assertEq(loanManager.getTotalLoans(), 1);
    }

    // ============================
    //  Fuzz Tests
    // ============================

    function testFuzz_RequestLoan_ValidAmounts(uint256 amount) public {
        amount = bound(amount, 1, type(uint128).max);

        vm.prank(borrower);
        uint256 loanId = loanManager.requestLoan(amount, COLLATERAL_AMOUNT, DURATION, INTEREST_BPS, RISK_HASH);

        ILoanManager.Loan memory loan = loanManager.getLoan(loanId);
        assertEq(loan.principal, amount);
    }

    function testFuzz_RequestLoan_ValidDurations(uint256 duration) public {
        duration = bound(duration, 1 days, 365 days);

        vm.prank(borrower);
        uint256 loanId = loanManager.requestLoan(LOAN_AMOUNT, COLLATERAL_AMOUNT, duration, INTEREST_BPS, RISK_HASH);

        ILoanManager.Loan memory loan = loanManager.getLoan(loanId);
        assertEq(loan.duration, duration);
    }

    function testFuzz_RequestLoan_ValidInterestRates(uint256 bps) public {
        bps = bound(bps, 0, 5000);

        vm.prank(borrower);
        uint256 loanId = loanManager.requestLoan(LOAN_AMOUNT, COLLATERAL_AMOUNT, DURATION, bps, RISK_HASH);

        ILoanManager.Loan memory loan = loanManager.getLoan(loanId);
        assertEq(loan.interestRateBps, bps);
    }

    // ============================
    //  Partial repayments never push repaid past total owed
    //  (stateful invariants live in LoanManagerInvariant.t.sol)
    // ============================

    function test_RepaidNeverExceedsTotalOwed_AcrossPartialPayments() public {
        uint256 loanId = _createActiveLoan();

        uint256 totalOwed = (LOAN_AMOUNT * (10000 + INTEREST_BPS)) / 10000;

        // Make partial payments
        uint256 payment = totalOwed / 3;
        vm.startPrank(borrower);

        loanManager.repayLoan(loanId, payment);
        ILoanManager.Loan memory loan = loanManager.getLoan(loanId);
        assertTrue(loan.repaid <= totalOwed, "Repaid exceeds total owed after payment 1");

        loanManager.repayLoan(loanId, payment);
        loan = loanManager.getLoan(loanId);
        assertTrue(loan.repaid <= totalOwed, "Repaid exceeds total owed after payment 2");

        // Final payment = remaining
        uint256 remaining = totalOwed - loan.repaid;
        loanManager.repayLoan(loanId, remaining);
        loan = loanManager.getLoan(loanId);
        assertTrue(loan.repaid <= totalOwed, "Repaid exceeds total owed after final payment");
        assertEq(loan.repaid, totalOwed);

        vm.stopPrank();
    }
}
