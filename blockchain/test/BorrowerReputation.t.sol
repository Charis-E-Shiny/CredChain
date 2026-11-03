// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BorrowerReputation.sol";

contract BorrowerReputationTest is Test {
    BorrowerReputation public reputation;

    address public admin = makeAddr("admin");
    address public recorder = makeAddr("recorder");
    address public borrower = makeAddr("borrower");
    address public outsider = makeAddr("outsider");

    function setUp() public {
        vm.startPrank(admin);
        reputation = new BorrowerReputation(admin);
        reputation.grantRole(reputation.RECORDER_ROLE(), recorder);
        vm.stopPrank();
    }

    function test_InitialReputationScore_IsNeutral50() public view {
        uint256 score = reputation.getReputationScore(borrower);
        assertEq(score, 50); // Neutral baseline for new borrowers
    }

    function test_RecordLoan_Success() public {
        vm.prank(recorder);
        reputation.recordLoan(borrower, 1, 1000 * 1e18);

        IBorrowerReputation.ReputationRecord memory rec = reputation.getReputation(borrower);
        assertEq(rec.totalLoans, 1);
        assertEq(rec.totalBorrowed, 1000 * 1e18);
        assertEq(rec.repaidLoans, 0);
        assertEq(rec.defaultedLoans, 0);
    }

    function test_RecordLoan_DuplicateLoanIdFails() public {
        vm.startPrank(recorder);
        reputation.recordLoan(borrower, 1, 1000 * 1e18);

        vm.expectRevert(abi.encodeWithSelector(BorrowerReputation.LoanAlreadyRecorded.selector, 1));
        reputation.recordLoan(borrower, 1, 1000 * 1e18);
        vm.stopPrank();
    }

    function test_RepaymentUpdatesScoreTo100() public {
        vm.startPrank(recorder);
        reputation.recordLoan(borrower, 1, 1000 * 1e18);
        reputation.recordRepayment(borrower, 1, 1000 * 1e18);
        vm.stopPrank();

        uint256 score = reputation.getReputationScore(borrower);
        assertEq(score, 100);

        uint256 rate = reputation.getCompletionRate(borrower);
        assertEq(rate, 10000); // 100% (10000 bps)
    }

    function test_DefaultUpdatesScore() public {
        vm.startPrank(recorder);
        // Loan 1 repaid
        reputation.recordLoan(borrower, 1, 1000 * 1e18);
        reputation.recordRepayment(borrower, 1, 1000 * 1e18);

        // Loan 2 defaulted
        reputation.recordLoan(borrower, 2, 1000 * 1e18);
        reputation.recordDefault(borrower, 2);
        vm.stopPrank();

        // 1 repaid out of 2 total = 50%
        uint256 score = reputation.getReputationScore(borrower);
        assertEq(score, 50);

        uint256 rate = reputation.getCompletionRate(borrower);
        assertEq(rate, 5000); // 5000 bps
    }

    function test_DoubleOutcomeFails() public {
        vm.startPrank(recorder);
        reputation.recordLoan(borrower, 1, 1000 * 1e18);
        reputation.recordRepayment(borrower, 1, 1000 * 1e18);

        vm.expectRevert(abi.encodeWithSelector(BorrowerReputation.OutcomeAlreadyRecorded.selector, 1));
        reputation.recordDefault(borrower, 1);
        vm.stopPrank();
    }

    function test_UnauthorizedCallerCannotUpdateReputation() public {
        vm.prank(outsider);
        vm.expectRevert();
        reputation.recordLoan(borrower, 1, 1000 * 1e18);
    }
}
