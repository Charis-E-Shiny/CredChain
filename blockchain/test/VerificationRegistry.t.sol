// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/VerificationRegistry.sol";

contract VerificationRegistryTest is Test {
    VerificationRegistry registry;

    address admin = makeAddr("admin");
    address verifier = makeAddr("verifier");
    address borrower = makeAddr("borrower");
    address unauthorized = makeAddr("unauthorized");

    bytes32 sampleHash = keccak256("canonical-verification-json-report-1234");

    event VerificationStatusUpdated(
        address indexed borrower,
        IVerificationRegistry.VerificationStatus indexed status,
        bytes32 indexed recordHash,
        address verifier,
        uint256 timestamp,
        uint16 discrepancyBps
    );

    function setUp() public {
        vm.startPrank(admin);
        registry = new VerificationRegistry(admin);
        registry.grantRole(registry.VERIFIER_ROLE(), verifier);
        vm.stopPrank();
    }

    function test_InitialStatus_IsUnverified() public view {
        IVerificationRegistry.VerificationStatus status = registry.getVerificationStatus(borrower);
        assertEq(uint256(status), uint256(IVerificationRegistry.VerificationStatus.Unverified));
        assertFalse(registry.isEvidenceCheckedOrBetter(borrower));
    }

    function test_Verifier_CanAttestEvidenceChecked() public {
        vm.prank(verifier);
        registry.updateVerification(
            borrower,
            IVerificationRegistry.VerificationStatus.EvidenceChecked,
            sampleHash,
            80000,
            79000,
            125 // 1.25% discrepancy
        );

        IVerificationRegistry.VerificationRecord memory rec = registry.getVerification(borrower);
        assertEq(uint256(rec.status), uint256(IVerificationRegistry.VerificationStatus.EvidenceChecked));
        assertEq(rec.recordHash, sampleHash);
        assertEq(rec.verifier, verifier);
        assertEq(rec.declaredIncome, 80000);
        assertEq(rec.extractedIncome, 79000);
        assertEq(rec.discrepancyBps, 125);
        assertTrue(registry.isEvidenceCheckedOrBetter(borrower));
    }

    function test_Verifier_CanAttestSourceVerified() public {
        vm.prank(verifier);
        registry.updateVerification(
            borrower,
            IVerificationRegistry.VerificationStatus.SourceVerified,
            sampleHash,
            80000,
            80000,
            0
        );

        IVerificationRegistry.VerificationStatus status = registry.getVerificationStatus(borrower);
        assertEq(uint256(status), uint256(IVerificationRegistry.VerificationStatus.SourceVerified));
        assertTrue(registry.isEvidenceCheckedOrBetter(borrower));
    }

    function test_FlagManualReview_OnDiscrepancy() public {
        vm.prank(verifier);
        registry.updateVerification(
            borrower,
            IVerificationRegistry.VerificationStatus.ManualReview,
            sampleHash,
            80000,
            45000,
            4375 // 43.75% discrepancy
        );

        IVerificationRegistry.VerificationStatus status = registry.getVerificationStatus(borrower);
        assertEq(uint256(status), uint256(IVerificationRegistry.VerificationStatus.ManualReview));
        assertFalse(registry.isEvidenceCheckedOrBetter(borrower));
    }

    function test_Revert_UnauthorizedCaller() public {
        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(VerificationRegistry.UnauthorizedVerifier.selector, unauthorized)
        );
        registry.updateVerification(
            borrower,
            IVerificationRegistry.VerificationStatus.EvidenceChecked,
            sampleHash,
            80000,
            80000,
            0
        );
    }

    function test_Revert_BorrowerCannotSelfVerify() public {
        // Use startPrank so argument evaluation doesn't consume prank
        vm.startPrank(admin);
        registry.grantRole(registry.VERIFIER_ROLE(), borrower);
        vm.stopPrank();

        vm.prank(borrower);
        vm.expectRevert(VerificationRegistry.BorrowerCannotSelfVerify.selector);
        registry.updateVerification(
            borrower,
            IVerificationRegistry.VerificationStatus.EvidenceChecked,
            sampleHash,
            80000,
            80000,
            0
        );
    }

    function test_Revert_ZeroAddressAndHash() public {
        vm.startPrank(verifier);
        vm.expectRevert(VerificationRegistry.ZeroAddress.selector);
        registry.updateVerification(
            address(0),
            IVerificationRegistry.VerificationStatus.EvidenceChecked,
            sampleHash,
            80000,
            80000,
            0
        );

        vm.expectRevert(VerificationRegistry.ZeroRecordHash.selector);
        registry.updateVerification(
            borrower,
            IVerificationRegistry.VerificationStatus.EvidenceChecked,
            bytes32(0),
            80000,
            80000,
            0
        );
        vm.stopPrank();
    }

    function test_Pause_PreventsUpdates() public {
        vm.prank(admin);
        registry.pause();

        vm.prank(verifier);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        registry.updateVerification(
            borrower,
            IVerificationRegistry.VerificationStatus.EvidenceChecked,
            sampleHash,
            80000,
            80000,
            0
        );

        vm.prank(admin);
        registry.unpause();

        vm.prank(verifier);
        registry.updateVerification(
            borrower,
            IVerificationRegistry.VerificationStatus.EvidenceChecked,
            sampleHash,
            80000,
            80000,
            0
        );
        assertEq(uint256(registry.getVerificationStatus(borrower)), uint256(IVerificationRegistry.VerificationStatus.EvidenceChecked));
    }
}
