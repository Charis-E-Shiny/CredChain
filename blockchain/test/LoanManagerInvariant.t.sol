// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/LoanManager.sol";
import "../src/interfaces/ILoanManager.sol";

/**
 * @title LoanManagerHandler
 * @notice Bounded actor that drives LoanManager through random sequences of
 *         lifecycle calls. Reverts are swallowed so every sequence is explored,
 *         and every status change is checked against the legal transition table.
 */
contract LoanManagerHandler is Test {
    LoanManager public immutable loanManager;
    address public immutable operator;
    address public immutable lender;
    address[] public borrowers;

    /// @notice Set to true if any action moves a loan along an illegal edge
    bool public badTransition;

    constructor(LoanManager _loanManager, address _operator, address _lender, address[] memory _borrowers) {
        loanManager = _loanManager;
        operator = _operator;
        lender = _lender;
        for (uint256 i = 0; i < _borrowers.length; i++) {
            borrowers.push(_borrowers[i]);
        }
    }

    // ---------------------------------------------------------------
    //  Legal transition table (mirrors docs/smart-contracts.md)
    // ---------------------------------------------------------------

    function _legal(ILoanManager.LoanStatus from, ILoanManager.LoanStatus to) internal pure returns (bool) {
        if (from == to) return true; // no-op (call reverted or nothing changed)
        if (from == ILoanManager.LoanStatus.REQUESTED) {
            return to == ILoanManager.LoanStatus.APPROVED
                || to == ILoanManager.LoanStatus.REJECTED
                || to == ILoanManager.LoanStatus.CANCELLED;
        }
        if (from == ILoanManager.LoanStatus.APPROVED) {
            return to == ILoanManager.LoanStatus.ACTIVE;
        }
        if (from == ILoanManager.LoanStatus.ACTIVE) {
            return to == ILoanManager.LoanStatus.REPAID || to == ILoanManager.LoanStatus.DEFAULTED;
        }
        // REPAID, DEFAULTED, REJECTED, CANCELLED are terminal
        return false;
    }

    function _check(uint256 id, ILoanManager.LoanStatus before) internal {
        if (!_legal(before, loanManager.getLoanStatus(id))) {
            badTransition = true;
        }
    }

    function _pickId(uint256 seed) internal view returns (bool ok, uint256 id) {
        uint256 total = loanManager.getTotalLoans();
        if (total == 0) return (false, 0);
        return (true, seed % total);
    }

    // ---------------------------------------------------------------
    //  Actions
    // ---------------------------------------------------------------

    function requestLoan(uint256 borrowerSeed, uint256 amount, uint256 duration, uint256 bps) external {
        address b = borrowers[borrowerSeed % borrowers.length];
        amount = bound(amount, 1, 1e24);
        duration = bound(duration, 1 days, 365 days);
        bps = bound(bps, 0, 5000);

        vm.prank(b);
        try loanManager.requestLoan(amount, 0, duration, bps, bytes32(uint256(1))) {} catch {}
    }

    function approve(uint256 seed) external {
        (bool ok, uint256 id) = _pickId(seed);
        if (!ok) return;
        ILoanManager.LoanStatus before = loanManager.getLoanStatus(id);

        vm.prank(operator);
        try loanManager.approveLoan(id) {} catch {}

        _check(id, before);
    }

    function reject(uint256 seed) external {
        (bool ok, uint256 id) = _pickId(seed);
        if (!ok) return;
        ILoanManager.LoanStatus before = loanManager.getLoanStatus(id);

        vm.prank(operator);
        try loanManager.rejectLoan(id) {} catch {}

        _check(id, before);
    }

    function cancel(uint256 seed) external {
        (bool ok, uint256 id) = _pickId(seed);
        if (!ok) return;
        ILoanManager.Loan memory loan = loanManager.getLoan(id);

        vm.prank(loan.borrower);
        try loanManager.cancelLoan(id) {} catch {}

        _check(id, loan.status);
    }

    function activate(uint256 seed) external {
        (bool ok, uint256 id) = _pickId(seed);
        if (!ok) return;
        ILoanManager.LoanStatus before = loanManager.getLoanStatus(id);

        vm.prank(lender);
        try loanManager.activateLoan(id) {} catch {}

        _check(id, before);
    }

    function repay(uint256 seed, uint256 amount) external {
        (bool ok, uint256 id) = _pickId(seed);
        if (!ok) return;
        ILoanManager.Loan memory loan = loanManager.getLoan(id);
        uint256 outstanding = loanManager.getOutstandingBalance(id);
        if (outstanding == 0) return;
        amount = bound(amount, 1, outstanding);

        vm.prank(loan.borrower);
        try loanManager.repayLoan(id, amount) {} catch {}

        _check(id, loan.status);
    }

    function markDefault(uint256 seed, uint256 warpSeed) external {
        (bool ok, uint256 id) = _pickId(seed);
        if (!ok) return;
        ILoanManager.LoanStatus before = loanManager.getLoanStatus(id);

        vm.warp(block.timestamp + bound(warpSeed, 0, 400 days));
        try loanManager.markDefault(id) {} catch {}

        _check(id, before);
    }
}

/**
 * @title LoanManagerInvariantTest
 * @notice Stateful invariant suite for LoanManager. Foundry calls random
 *         sequences of handler actions and asserts these properties after each run.
 */
contract LoanManagerInvariantTest is Test {
    LoanManager internal loanManager;
    LoanManagerHandler internal handler;

    address internal admin = makeAddr("admin");
    address internal operator = makeAddr("operator");
    address internal lender = makeAddr("lender");

    function setUp() public {
        address escrow = makeAddr("escrow");
        address governance = makeAddr("governance");

        vm.startPrank(admin);
        loanManager = new LoanManager(admin);
        loanManager.setContracts(escrow, governance, address(0));
        loanManager.grantRole(loanManager.OPERATOR_ROLE(), operator);
        vm.stopPrank();

        address[] memory borrowers = new address[](3);
        borrowers[0] = makeAddr("borrower0");
        borrowers[1] = makeAddr("borrower1");
        borrowers[2] = makeAddr("borrower2");

        handler = new LoanManagerHandler(loanManager, operator, lender, borrowers);
        targetContract(address(handler));
    }

    /// @dev Every status change follows the documented state machine.
    function invariant_StatusTransitionsAreLegal() public view {
        assertFalse(handler.badTransition(), "illegal status transition observed");
    }

    /// @dev The contract's active-loan counter equals the number of ACTIVE loans.
    function invariant_ActiveLoanCountMatchesStatuses() public view {
        uint256 total = loanManager.getTotalLoans();
        uint256 active;
        for (uint256 i = 0; i < total; i++) {
            if (loanManager.getLoanStatus(i) == ILoanManager.LoanStatus.ACTIVE) {
                active++;
            }
        }
        assertEq(loanManager.getActiveLoanCount(), active, "active count drifted from statuses");
    }

    /// @dev Repaid never exceeds principal + interest, and REPAID means fully repaid.
    function invariant_RepaidNeverExceedsOwed() public view {
        uint256 total = loanManager.getTotalLoans();
        for (uint256 i = 0; i < total; i++) {
            ILoanManager.Loan memory loan = loanManager.getLoan(i);
            uint256 owed = (loan.principal * (10000 + loan.interestRateBps)) / 10000;

            assertLe(loan.repaid, owed, "repaid exceeds owed");
            if (loan.status == ILoanManager.LoanStatus.REPAID) {
                assertEq(loan.repaid, owed, "REPAID loan not fully repaid");
            }
        }
    }
}

/**
 * @title LoanManagerBpsMathTest
 * @notice Deterministic checks of the basis-point interest formula as exposed
 *         through getOutstandingBalance and repayLoan.
 * @dev Interest is currently a flat rate: owed = principal * (10000 + bps) / 10000.
 *      The "KnownGap" tests characterize current behavior and must be updated
 *      if time-based interest is adopted.
 */
contract LoanManagerBpsMathTest is Test {
    LoanManager internal loanManager;

    address internal admin = makeAddr("admin");
    address internal operator = makeAddr("operator");
    address internal lender = makeAddr("lender");
    address internal borrower = makeAddr("borrower");
    bytes32 internal constant RISK_HASH = keccak256("bps-math");

    function setUp() public {
        address escrow = makeAddr("escrow");
        address governance = makeAddr("governance");

        vm.startPrank(admin);
        loanManager = new LoanManager(admin);
        loanManager.setContracts(escrow, governance, address(0));
        loanManager.grantRole(loanManager.OPERATOR_ROLE(), operator);
        vm.stopPrank();
    }

    function _requestAndActivate(uint256 amount, uint256 duration, uint256 bps) internal returns (uint256 id) {
        vm.prank(borrower);
        id = loanManager.requestLoan(amount, 0, duration, bps, RISK_HASH);
        vm.prank(operator);
        loanManager.approveLoan(id);
        vm.prank(lender);
        loanManager.activateLoan(id);
    }

    function test_Bps_FivePercentOwed() public {
        uint256 id = _requestAndActivate(1000e18, 30 days, 500);
        assertEq(loanManager.getOutstandingBalance(id), 1050e18);
    }

    function test_Bps_ZeroRateOwesPrincipal() public {
        uint256 id = _requestAndActivate(1000e18, 30 days, 0);
        assertEq(loanManager.getOutstandingBalance(id), 1000e18);
    }

    function test_Bps_MaxRateIsOneAndAHalf() public {
        uint256 id = _requestAndActivate(1000e18, 30 days, 5000);
        assertEq(loanManager.getOutstandingBalance(id), 1500e18);
    }

    function test_Bps_FloorRoundingOnDust() public {
        // 1 wei principal at 1 bps: 1 * 10001 / 10000 floors to 1, so no interest accrues.
        uint256 id = _requestAndActivate(1, 30 days, 1);
        assertEq(loanManager.getOutstandingBalance(id), 1);
    }

    function test_Bps_ExactRepaymentClosesLoan() public {
        uint256 id = _requestAndActivate(1000e18, 30 days, 500);

        vm.prank(borrower);
        loanManager.repayLoan(id, 1049e18);
        assertEq(loanManager.getOutstandingBalance(id), 1e18);

        vm.prank(borrower);
        loanManager.repayLoan(id, 1e18);
        assertEq(uint256(loanManager.getLoanStatus(id)), uint256(ILoanManager.LoanStatus.REPAID));
    }

    function test_Bps_OverpaymentReverts() public {
        uint256 id = _requestAndActivate(1000e18, 30 days, 500);

        vm.expectRevert(
            abi.encodeWithSelector(LoanManager.RepaymentExceedsOutstanding.selector, 1050e18 + 1, 1050e18)
        );
        vm.prank(borrower);
        loanManager.repayLoan(id, 1050e18 + 1);
    }

    /// @notice KnownGap: owed does not depend on duration despite the docstring's time-based description.
    function test_KnownGap_OwedIgnoresDuration() public {
        uint256 shortLoan = _requestAndActivate(1000e18, 1 days, 500);
        uint256 longLoan = _requestAndActivate(1000e18, 365 days, 500);
        assertEq(loanManager.getOutstandingBalance(shortLoan), loanManager.getOutstandingBalance(longLoan));
    }

    /// @notice KnownGap: an APPROVED loan whose approval has expired never leaves APPROVED,
    ///         and it still counts toward the borrower's active-loan cap.
    function test_KnownGap_ExpiredApprovalStuckAndCountsTowardCap() public {
        uint256 max = loanManager.MAX_ACTIVE_LOANS_PER_BORROWER();
        uint256[] memory ids = new uint256[](max);

        for (uint256 i = 0; i < max; i++) {
            vm.prank(borrower);
            ids[i] = loanManager.requestLoan(1000e18, 0, 30 days, 500, RISK_HASH);
            vm.prank(operator);
            loanManager.approveLoan(ids[i]);
        }

        vm.warp(block.timestamp + loanManager.APPROVAL_EXPIRY() + 1);

        // Expired approval cannot be activated...
        vm.expectRevert(abi.encodeWithSelector(LoanManager.ApprovalExpired.selector, ids[0]));
        vm.prank(lender);
        loanManager.activateLoan(ids[0]);

        // ...and remains APPROVED with no transition out of that state.
        assertEq(uint256(loanManager.getLoanStatus(ids[0])), uint256(ILoanManager.LoanStatus.APPROVED));

        // It still blocks the borrower's next request.
        vm.expectRevert(abi.encodeWithSelector(LoanManager.MaxActiveLoansReached.selector, borrower));
        vm.prank(borrower);
        loanManager.requestLoan(1000e18, 0, 30 days, 500, RISK_HASH);
    }
}
