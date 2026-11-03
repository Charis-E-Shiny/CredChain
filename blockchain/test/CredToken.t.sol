// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CredToken.sol";

/**
 * @title CredTokenTest
 * @notice Comprehensive Foundry tests for the CredToken ERC-20 contract
 */
contract CredTokenTest is Test {
    CredToken public token;

    address public admin = makeAddr("admin");
    address public minter = makeAddr("minter");
    address public pauser = makeAddr("pauser");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    /// @dev Events mirrored for expectEmit
    event TokensMinted(address indexed minter, address indexed to, uint256 amount);

    function setUp() public {
        vm.prank(admin);
        token = new CredToken(admin);

        // Grant minter role to minter
        vm.startPrank(admin);
        token.grantRole(token.MINTER_ROLE(), minter);
        token.grantRole(token.PAUSER_ROLE(), pauser);
        vm.stopPrank();
    }

    // ============================
    //  Deployment & Initial State
    // ============================

    function test_Deployment_Name() public view {
        assertEq(token.name(), "CredChain Token");
    }

    function test_Deployment_Symbol() public view {
        assertEq(token.symbol(), "CRED");
    }

    function test_Deployment_Decimals() public view {
        assertEq(token.decimals(), 18);
    }

    function test_Deployment_ZeroInitialSupply() public view {
        assertEq(token.totalSupply(), 0);
    }

    function test_Deployment_AdminHasRoles() public view {
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(token.hasRole(token.MINTER_ROLE(), admin));
        assertTrue(token.hasRole(token.PAUSER_ROLE(), admin));
    }

    function test_Deployment_Constants() public view {
        assertEq(token.MAX_SUPPLY(), 100_000_000 * 1e18);
        assertEq(token.MAX_MINT_PER_TX(), 10_000 * 1e18);
    }

    function test_Deployment_RevertOnZeroAdmin() public {
        vm.expectRevert(CredToken.ZeroAddress.selector);
        new CredToken(address(0));
    }

    // ============================
    //  Minting by Authorized Minter
    // ============================

    function test_Mint_ByAuthorizedMinter() public {
        uint256 amount = 1000 * 1e18;

        vm.expectEmit(true, true, false, true);
        emit TokensMinted(minter, alice, amount);

        vm.prank(minter);
        token.mint(alice, amount);

        assertEq(token.balanceOf(alice), amount);
        assertEq(token.totalSupply(), amount);
        assertEq(token.mintedBy(minter), amount);
    }

    function test_Mint_ByAdmin() public {
        uint256 amount = 500 * 1e18;

        vm.prank(admin);
        token.mint(bob, amount);

        assertEq(token.balanceOf(bob), amount);
        assertEq(token.mintedBy(admin), amount);
    }

    function test_Mint_TracksMintedByAccumulation() public {
        vm.startPrank(minter);
        token.mint(alice, 100 * 1e18);
        token.mint(bob, 200 * 1e18);
        vm.stopPrank();

        assertEq(token.mintedBy(minter), 300 * 1e18);
    }

    // ============================
    //  Minting Rejection for Unauthorized
    // ============================

    function test_Mint_RevertUnauthorizedCaller() public {
        vm.prank(alice);
        vm.expectRevert();
        token.mint(alice, 100 * 1e18);
    }

    function test_Mint_RevertZeroAddress() public {
        vm.prank(minter);
        vm.expectRevert(CredToken.ZeroAddress.selector);
        token.mint(address(0), 100 * 1e18);
    }

    function test_Mint_RevertZeroAmount() public {
        vm.prank(minter);
        vm.expectRevert(CredToken.ZeroAmount.selector);
        token.mint(alice, 0);
    }

    // ============================
    //  Max Supply Enforcement
    // ============================

    function test_Mint_RevertExceedsMaxSupply() public {
        // Mint close to max supply first
        uint256 batchSize = token.MAX_MINT_PER_TX();
        uint256 maxSupply = token.MAX_SUPPLY();
        uint256 batches = maxSupply / batchSize;

        vm.startPrank(minter);
        for (uint256 i = 0; i < batches; i++) {
            token.mint(alice, batchSize);
        }
        vm.stopPrank();

        // Now there should be 0 left (100M is evenly divisible by 10K)
        assertEq(token.totalSupply(), maxSupply);

        vm.prank(minter);
        vm.expectRevert(
            abi.encodeWithSelector(CredToken.ExceedsMaxSupply.selector, 1, 0)
        );
        token.mint(alice, 1);
    }

    // ============================
    //  Max Mint Per TX Enforcement
    // ============================

    function test_Mint_RevertExceedsMaxMintPerTx() public {
        uint256 maxPerTx = token.MAX_MINT_PER_TX();
        uint256 tooMuch = maxPerTx + 1;

        vm.prank(minter);
        vm.expectRevert(
            abi.encodeWithSelector(CredToken.ExceedsMaxMintPerTx.selector, tooMuch, maxPerTx)
        );
        token.mint(alice, tooMuch);
    }

    function test_Mint_ExactMaxMintPerTx() public {
        uint256 maxPerTx = token.MAX_MINT_PER_TX();

        vm.prank(minter);
        token.mint(alice, maxPerTx);

        assertEq(token.balanceOf(alice), maxPerTx);
    }

    // ============================
    //  Faucet Function
    // ============================

    function test_Faucet_Success() public {
        uint256 amount = 500 * 1e18;

        vm.prank(alice);
        token.faucet(amount);

        assertEq(token.balanceOf(alice), amount);
    }

    function test_Faucet_MaxAmount() public {
        uint256 amount = 1000 * 1e18;

        vm.prank(alice);
        token.faucet(amount);

        assertEq(token.balanceOf(alice), amount);
    }

    function test_Faucet_RevertExceedsMax() public {
        uint256 tooMuch = 1001 * 1e18;

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(CredToken.ExceedsMaxMintPerTx.selector, tooMuch, 1000 * 1e18)
        );
        token.faucet(tooMuch);
    }

    function test_Faucet_RevertZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(CredToken.ZeroAmount.selector);
        token.faucet(0);
    }

    function test_Faucet_EmitsEvent() public {
        uint256 amount = 100 * 1e18;

        vm.expectEmit(true, true, false, true);
        emit TokensMinted(address(0), alice, amount);

        vm.prank(alice);
        token.faucet(amount);
    }

    function test_Faucet_NoRoleRequired() public {
        // Any address can call faucet
        address randomUser = makeAddr("randomUser");
        vm.prank(randomUser);
        token.faucet(100 * 1e18);
        assertEq(token.balanceOf(randomUser), 100 * 1e18);
    }

    // ============================
    //  Pause / Unpause
    // ============================

    function test_Pause_ByPauser() public {
        vm.prank(pauser);
        token.pause();

        assertTrue(token.paused());
    }

    function test_Unpause_ByPauser() public {
        vm.prank(pauser);
        token.pause();

        vm.prank(pauser);
        token.unpause();

        assertFalse(token.paused());
    }

    function test_Pause_RevertUnauthorized() public {
        vm.prank(alice);
        vm.expectRevert();
        token.pause();
    }

    function test_Mint_RevertWhenPaused() public {
        vm.prank(pauser);
        token.pause();

        vm.prank(minter);
        vm.expectRevert();
        token.mint(alice, 100 * 1e18);
    }

    function test_Faucet_RevertWhenPaused() public {
        vm.prank(pauser);
        token.pause();

        vm.prank(alice);
        vm.expectRevert();
        token.faucet(100 * 1e18);
    }

    // ============================
    //  Transfer While Paused
    // ============================

    function test_Transfer_RevertWhenPaused() public {
        // Mint some tokens first
        vm.prank(minter);
        token.mint(alice, 1000 * 1e18);

        // Pause
        vm.prank(pauser);
        token.pause();

        // Try to transfer
        vm.prank(alice);
        vm.expectRevert();
        token.transfer(bob, 100 * 1e18);
    }

    function test_Transfer_SucceedsWhenNotPaused() public {
        vm.prank(minter);
        token.mint(alice, 1000 * 1e18);

        vm.prank(alice);
        token.transfer(bob, 100 * 1e18);

        assertEq(token.balanceOf(alice), 900 * 1e18);
        assertEq(token.balanceOf(bob), 100 * 1e18);
    }

    // ============================
    //  Approval and TransferFrom
    // ============================

    function test_Approve_SetsAllowance() public {
        vm.prank(alice);
        token.approve(bob, 500 * 1e18);

        assertEq(token.allowance(alice, bob), 500 * 1e18);
    }

    function test_TransferFrom_Success() public {
        // Mint tokens to alice
        vm.prank(minter);
        token.mint(alice, 1000 * 1e18);

        // Alice approves bob
        vm.prank(alice);
        token.approve(bob, 500 * 1e18);

        // Bob transfers from alice
        vm.prank(bob);
        token.transferFrom(alice, bob, 300 * 1e18);

        assertEq(token.balanceOf(alice), 700 * 1e18);
        assertEq(token.balanceOf(bob), 300 * 1e18);
        assertEq(token.allowance(alice, bob), 200 * 1e18);
    }

    function test_TransferFrom_RevertInsufficientAllowance() public {
        vm.prank(minter);
        token.mint(alice, 1000 * 1e18);

        vm.prank(alice);
        token.approve(bob, 100 * 1e18);

        vm.prank(bob);
        vm.expectRevert();
        token.transferFrom(alice, bob, 200 * 1e18);
    }

    function test_TransferFrom_RevertWhenPaused() public {
        vm.prank(minter);
        token.mint(alice, 1000 * 1e18);

        vm.prank(alice);
        token.approve(bob, 500 * 1e18);

        vm.prank(pauser);
        token.pause();

        vm.prank(bob);
        vm.expectRevert();
        token.transferFrom(alice, bob, 100 * 1e18);
    }

    // ============================
    //  Fuzz Tests
    // ============================

    function testFuzz_Mint_ValidAmounts(uint256 amount) public {
        // Bound amount to valid range: 1 to MAX_MINT_PER_TX
        amount = bound(amount, 1, token.MAX_MINT_PER_TX());

        vm.prank(minter);
        token.mint(alice, amount);

        assertEq(token.balanceOf(alice), amount);
        assertEq(token.totalSupply(), amount);
    }

    function testFuzz_Faucet_ValidAmounts(uint256 amount) public {
        amount = bound(amount, 1, 1000 * 1e18);

        vm.prank(alice);
        token.faucet(amount);

        assertEq(token.balanceOf(alice), amount);
    }

    function testFuzz_Transfer_ValidAmounts(uint256 mintAmount, uint256 transferAmount) public {
        mintAmount = bound(mintAmount, 1, token.MAX_MINT_PER_TX());
        transferAmount = bound(transferAmount, 1, mintAmount);

        vm.prank(minter);
        token.mint(alice, mintAmount);

        vm.prank(alice);
        token.transfer(bob, transferAmount);

        assertEq(token.balanceOf(alice), mintAmount - transferAmount);
        assertEq(token.balanceOf(bob), transferAmount);
    }
}
