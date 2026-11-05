// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/LoanGovernance.sol";
import "../src/LoanManager.sol";
import "../src/LoanEscrow.sol";
import "../src/CredToken.sol";
import "../src/BorrowerReputation.sol";

contract LoanGovernanceTest is Test {
    LoanGovernance public governance;
    LoanManager public loanManager;
    LoanEscrow public escrow;
    CredToken public token;
    BorrowerReputation public reputation;

    address public admin = makeAddr("admin");
    address public approver1 = makeAddr("approver1");
    address public approver2 = makeAddr("approver2");
    address public borrower = makeAddr("borrower");
    address public lender = makeAddr("lender");

    uint256 public standardThreshold = 1;
    uint256 public highValueThreshold = 5000 * 1e18;
    uint256 public highValueApprovalThreshold = 2;

    function setUp() public {
        vm.startPrank(admin);
        token = new CredToken(admin);
        escrow = new LoanEscrow(address(token), admin);
        reputation = new BorrowerReputation(admin);

        governance = new LoanGovernance(
            admin,
            standardThreshold,
            highValueThreshold,
            highValueApprovalThreshold
        );

        loanManager = new LoanManager(admin);
        loanManager.setContracts(address(escrow), address(governance), address(reputation));
        governance.setLoanManager(address(loanManager));

        // Grant approver roles
        governance.grantRole(governance.APPROVER_ROLE(), approver1);
        governance.grantRole(governance.APPROVER_ROLE(), approver2);
        escrow.grantRole(escrow.OPERATOR_ROLE(), address(loanManager));
        vm.stopPrank();

        deal(address(token), borrower, 100_000 * 1e18);
        vm.prank(borrower);
        token.approve(address(escrow), type(uint256).max);
    }

    function test_StandardLoan_SingleApprovalSucceeds() public {
        // Borrower requests standard loan (1000 tokens)
        vm.prank(borrower);
        uint256 loanId = loanManager.requestLoan(
            1000 * 1e18,
            200 * 1e18,
            30 days,
            500,
            keccak256("risk-hash-standard")
        );

        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.REQUESTED));

        // Approver 1 submits approval
        vm.prank(approver1);
        governance.submitApproval(loanId);

        assertTrue(governance.isApproved(loanId));
        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.APPROVED));
    }

    function test_HighValueLoan_RequiresMultipleApprovals() public {
        // Borrower requests high-value loan (6000 tokens >= 5000)
        vm.prank(borrower);
        uint256 loanId = loanManager.requestLoan(
            6000 * 1e18,
            1200 * 1e18,
            30 days,
            500,
            keccak256("risk-hash-high")
        );

        // First approval
        vm.prank(approver1);
        governance.submitApproval(loanId);

        assertFalse(governance.isApproved(loanId));
        assertEq(governance.getApprovalCount(loanId), 1);
        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.REQUESTED));

        // Second approval satisfies high-value threshold
        vm.prank(approver2);
        governance.submitApproval(loanId);

        assertTrue(governance.isApproved(loanId));
        assertEq(governance.getApprovalCount(loanId), 2);
        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.APPROVED));
    }

    function test_DuplicateApprovalFails() public {
        vm.prank(borrower);
        uint256 loanId = loanManager.requestLoan(
            6000 * 1e18,
            1200 * 1e18,
            30 days,
            500,
            keccak256("risk-hash-dup")
        );

        vm.startPrank(approver1);
        governance.submitApproval(loanId);

        vm.expectRevert(abi.encodeWithSelector(LoanGovernance.AlreadyApproved.selector, loanId, approver1));
        governance.submitApproval(loanId);
        vm.stopPrank();
    }

    function test_RejectLoanWorkflow() public {
        vm.prank(borrower);
        uint256 loanId = loanManager.requestLoan(
            1000 * 1e18,
            200 * 1e18,
            30 days,
            500,
            keccak256("risk-hash-rej")
        );

        vm.prank(approver1);
        governance.rejectLoan(loanId);

        assertEq(uint256(loanManager.getLoanStatus(loanId)), uint256(ILoanManager.LoanStatus.REJECTED));

        // Attempting to approve after rejection must fail
        vm.prank(approver2);
        vm.expectRevert(abi.encodeWithSelector(LoanGovernance.AlreadyRejected.selector, loanId));
        governance.submitApproval(loanId);
    }

    function test_UnauthorizedApproverReverted() public {
        address hacker = makeAddr("hacker");
        vm.prank(borrower);
        uint256 loanId = loanManager.requestLoan(
            1000 * 1e18,
            200 * 1e18,
            30 days,
            500,
            keccak256("risk-hash-unauth")
        );

        vm.prank(hacker);
        vm.expectRevert();
        governance.submitApproval(loanId);
    }
}
