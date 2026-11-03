// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/LoanEscrow.sol";
import "../src/CredToken.sol";

contract LoanEscrowTest is Test {
    LoanEscrow public escrow;
    CredToken public token;

    address public admin = makeAddr("admin");
    address public operator = makeAddr("operator");
    address public borrower = makeAddr("borrower");
    address public lender = makeAddr("lender");
    address public outsider = makeAddr("outsider");

    uint256 public constant LOAN_ID = 1;
    uint256 public constant COLLATERAL_AMOUNT = 500 * 1e18;
    uint256 public constant PRINCIPAL_AMOUNT = 1000 * 1e18;

    function setUp() public {
        vm.startPrank(admin);
        token = new CredToken(admin);
        escrow = new LoanEscrow(address(token), admin);

        escrow.grantRole(escrow.OPERATOR_ROLE(), operator);

        // Mint test tokens to participants
        token.mint(borrower, 5000 * 1e18);
        token.mint(lender, 5000 * 1e18);
        vm.stopPrank();

        // Approve escrow to pull tokens
        vm.prank(borrower);
        token.approve(address(escrow), type(uint256).max);

        vm.prank(lender);
        token.approve(address(escrow), type(uint256).max);
    }

    function test_DepositCollateral_Success() public {
        vm.prank(operator);
        escrow.depositCollateral(LOAN_ID, borrower, COLLATERAL_AMOUNT);

        assertEq(escrow.getCollateralBalance(LOAN_ID), COLLATERAL_AMOUNT);
        assertEq(token.balanceOf(address(escrow)), COLLATERAL_AMOUNT);
    }

    function test_DepositCollateral_RevertZeroAmount() public {
        vm.prank(operator);
        vm.expectRevert(LoanEscrow.ZeroAmount.selector);
        escrow.depositCollateral(LOAN_ID, borrower, 0);
    }

    function test_DepositCollateral_RevertUnauthorized() public {
        vm.prank(outsider);
        vm.expectRevert();
        escrow.depositCollateral(LOAN_ID, borrower, COLLATERAL_AMOUNT);
    }

    function test_ReleaseCollateral_Success() public {
        vm.startPrank(operator);
        escrow.depositCollateral(LOAN_ID, borrower, COLLATERAL_AMOUNT);

        uint256 balBefore = token.balanceOf(borrower);
        escrow.releaseCollateral(LOAN_ID, borrower);
        uint256 balAfter = token.balanceOf(borrower);

        assertEq(balAfter - balBefore, COLLATERAL_AMOUNT);
        assertEq(escrow.getCollateralBalance(LOAN_ID), 0);
        vm.stopPrank();
    }

    function test_ReleaseCollateral_DoubleReleaseFails() public {
        vm.startPrank(operator);
        escrow.depositCollateral(LOAN_ID, borrower, COLLATERAL_AMOUNT);
        escrow.releaseCollateral(LOAN_ID, borrower);

        vm.expectRevert(abi.encodeWithSelector(LoanEscrow.CollateralAlreadyReleased.selector, LOAN_ID));
        escrow.releaseCollateral(LOAN_ID, borrower);
        vm.stopPrank();
    }

    function test_SeizeCollateral_Success() public {
        vm.startPrank(operator);
        escrow.depositCollateral(LOAN_ID, borrower, COLLATERAL_AMOUNT);
        escrow.depositLoanFunds(LOAN_ID, lender, PRINCIPAL_AMOUNT);

        uint256 lenderBalBefore = token.balanceOf(lender);
        escrow.seizeCollateral(LOAN_ID);
        uint256 lenderBalAfter = token.balanceOf(lender);

        assertEq(lenderBalAfter - lenderBalBefore, COLLATERAL_AMOUNT);
        assertEq(escrow.getCollateralBalance(LOAN_ID), 0);
        vm.stopPrank();
    }

    function test_DepositAndDisburseLoanFunds_Success() public {
        vm.startPrank(operator);
        escrow.depositLoanFunds(LOAN_ID, lender, PRINCIPAL_AMOUNT);
        assertEq(escrow.getLoanFundBalance(LOAN_ID), PRINCIPAL_AMOUNT);

        uint256 borrowerBalBefore = token.balanceOf(borrower);
        escrow.disburseLoanFunds(LOAN_ID, borrower);
        uint256 borrowerBalAfter = token.balanceOf(borrower);

        assertEq(borrowerBalAfter - borrowerBalBefore, PRINCIPAL_AMOUNT);
        assertEq(escrow.getLoanFundBalance(LOAN_ID), 0);
        vm.stopPrank();
    }

    function test_DisburseLoanFunds_DoubleDisburseFails() public {
        vm.startPrank(operator);
        escrow.depositLoanFunds(LOAN_ID, lender, PRINCIPAL_AMOUNT);
        escrow.disburseLoanFunds(LOAN_ID, borrower);

        vm.expectRevert(abi.encodeWithSelector(LoanEscrow.FundsAlreadyDisbursed.selector, LOAN_ID));
        escrow.disburseLoanFunds(LOAN_ID, borrower);
        vm.stopPrank();
    }

    function test_RepaymentWorkflow() public {
        vm.startPrank(operator);
        uint256 repayAmount = 1050 * 1e18; // principal + interest
        escrow.receiveRepayment(LOAN_ID, borrower, repayAmount);

        uint256 lenderBalBefore = token.balanceOf(lender);
        escrow.forwardRepaymentToLender(LOAN_ID, lender, repayAmount);
        uint256 lenderBalAfter = token.balanceOf(lender);

        assertEq(lenderBalAfter - lenderBalBefore, repayAmount);
        vm.stopPrank();
    }

    function test_PausePreventsOperations() public {
        vm.prank(admin);
        escrow.pause();

        vm.prank(operator);
        vm.expectRevert();
        escrow.depositCollateral(LOAN_ID, borrower, COLLATERAL_AMOUNT);
    }
}
