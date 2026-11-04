// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CreditPassportRegistry.sol";

contract CreditPassportRegistryTest is Test {
    CreditPassportRegistry public registry;

    address public admin = makeAddr("admin");
    address public issuer = makeAddr("issuer");
    address public borrower = makeAddr("borrower");
    address public stranger = makeAddr("stranger");

    bytes32 public passportId1 = keccak256("PASS-001");
    bytes32 public passportId2 = keccak256("PASS-002");
    bytes32 public sampleHash1 = sha256("canonical-json-data-1");
    bytes32 public sampleHash2 = sha256("canonical-json-data-2");

    function setUp() public {
        vm.startPrank(admin);
        registry = new CreditPassportRegistry(admin);
        registry.grantRole(registry.ISSUER_ROLE(), issuer);
        vm.stopPrank();
    }

    function test_RegisterPassport_ByBorrower() public {
        vm.prank(borrower);
        registry.registerPassport(passportId1, borrower, sampleHash1, 0);

        ICreditPassportRegistry.PassportRecord memory rec = registry.getPassport(passportId1);
        assertEq(rec.dataHash, sampleHash1);
        assertEq(rec.borrower, borrower);
        assertEq(rec.revoked, false);
        assertEq(rec.version, 1);
        assertTrue(registry.isPassportValid(passportId1));
    }

    function test_RegisterPassport_ByIssuer() public {
        vm.prank(issuer);
        registry.registerPassport(passportId1, borrower, sampleHash1, block.timestamp + 30 days);

        ICreditPassportRegistry.PassportRecord memory rec = registry.getPassport(passportId1);
        assertEq(rec.dataHash, sampleHash1);
        assertEq(rec.borrower, borrower);
        assertEq(rec.version, 1);
        assertEq(rec.expiresAt, block.timestamp + 30 days);
    }

    function test_RegisterPassport_RevertUnauthorized() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(CreditPassportRegistry.UnauthorizedCaller.selector, stranger));
        registry.registerPassport(passportId1, borrower, sampleHash1, 0);
    }

    function test_RegisterPassport_RevertZeroInputs() public {
        vm.startPrank(borrower);

        vm.expectRevert(CreditPassportRegistry.ZeroPassportId.selector);
        registry.registerPassport(bytes32(0), borrower, sampleHash1, 0);

        vm.expectRevert(CreditPassportRegistry.ZeroDataHash.selector);
        registry.registerPassport(passportId1, borrower, bytes32(0), 0);

        vm.expectRevert(CreditPassportRegistry.ZeroAddress.selector);
        registry.registerPassport(passportId1, address(0), sampleHash1, 0);

        vm.stopPrank();
    }

    function test_RegisterPassport_RevertDuplicateId() public {
        vm.startPrank(borrower);
        registry.registerPassport(passportId1, borrower, sampleHash1, 0);

        vm.expectRevert(abi.encodeWithSelector(CreditPassportRegistry.PassportAlreadyExists.selector, passportId1));
        registry.registerPassport(passportId1, borrower, sampleHash2, 0);
        vm.stopPrank();
    }

    function test_VerifyPassport_ValidAndInvalidHash() public {
        vm.prank(borrower);
        registry.registerPassport(passportId1, borrower, sampleHash1, 0);

        // Exact match
        (bool isValid, ICreditPassportRegistry.PassportStatus status) = registry.verifyPassport(passportId1, sampleHash1);
        assertTrue(isValid);
        assertEq(uint256(status), uint256(ICreditPassportRegistry.PassportStatus.VALID));

        // Wrong hash
        (bool isInvalid, ICreditPassportRegistry.PassportStatus invalidStatus) = registry.verifyPassport(passportId1, sampleHash2);
        assertFalse(isInvalid);
        assertEq(uint256(invalidStatus), uint256(ICreditPassportRegistry.PassportStatus.INVALID_HASH));

        // Unknown passport ID
        (bool notFoundValid, ICreditPassportRegistry.PassportStatus notFoundStatus) = registry.verifyPassport(keccak256("NON_EXISTENT"), sampleHash1);
        assertFalse(notFoundValid);
        assertEq(uint256(notFoundStatus), uint256(ICreditPassportRegistry.PassportStatus.NOT_FOUND));
    }

    function test_RevokePassport_ByBorrower() public {
        vm.prank(borrower);
        registry.registerPassport(passportId1, borrower, sampleHash1, 0);

        vm.prank(borrower);
        registry.revokePassport(passportId1);

        (bool isValid, ICreditPassportRegistry.PassportStatus status) = registry.verifyPassport(passportId1, sampleHash1);
        assertFalse(isValid);
        assertEq(uint256(status), uint256(ICreditPassportRegistry.PassportStatus.REVOKED));
        assertFalse(registry.isPassportValid(passportId1));
    }

    function test_RevokePassport_ByAdmin() public {
        vm.prank(borrower);
        registry.registerPassport(passportId1, borrower, sampleHash1, 0);

        vm.prank(admin);
        registry.revokePassport(passportId1);

        ICreditPassportRegistry.PassportRecord memory rec = registry.getPassport(passportId1);
        assertTrue(rec.revoked);
    }

    function test_RevokePassport_RevertUnauthorized() public {
        vm.prank(borrower);
        registry.registerPassport(passportId1, borrower, sampleHash1, 0);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(CreditPassportRegistry.UnauthorizedCaller.selector, stranger));
        registry.revokePassport(passportId1);
    }

    function test_RevokePassport_RevertAlreadyRevoked() public {
        vm.startPrank(borrower);
        registry.registerPassport(passportId1, borrower, sampleHash1, 0);
        registry.revokePassport(passportId1);

        vm.expectRevert(abi.encodeWithSelector(CreditPassportRegistry.PassportAlreadyRevoked.selector, passportId1));
        registry.revokePassport(passportId1);
        vm.stopPrank();
    }

    function test_ExpirationHandling() public {
        uint256 expiry = block.timestamp + 7 days;
        vm.prank(borrower);
        registry.registerPassport(passportId1, borrower, sampleHash1, expiry);

        // Before expiry: Valid
        (bool validBefore, ) = registry.verifyPassport(passportId1, sampleHash1);
        assertTrue(validBefore);

        // Warp past expiry
        vm.warp(block.timestamp + 8 days);

        (bool validAfter, ICreditPassportRegistry.PassportStatus statusAfter) = registry.verifyPassport(passportId1, sampleHash1);
        assertFalse(validAfter);
        assertEq(uint256(statusAfter), uint256(ICreditPassportRegistry.PassportStatus.EXPIRED));
        assertFalse(registry.isPassportValid(passportId1));
    }

    function test_BorrowerVersioning() public {
        vm.startPrank(borrower);
        registry.registerPassport(passportId1, borrower, sampleHash1, 0);
        registry.registerPassport(passportId2, borrower, sampleHash2, 0);
        vm.stopPrank();

        bytes32[] memory list = registry.getBorrowerPassports(borrower);
        assertEq(list.length, 2);
        assertEq(list[0], passportId1);
        assertEq(list[1], passportId2);

        ICreditPassportRegistry.PassportRecord memory rec1 = registry.getPassport(passportId1);
        ICreditPassportRegistry.PassportRecord memory rec2 = registry.getPassport(passportId2);
        assertEq(rec1.version, 1);
        assertEq(rec2.version, 2);
    }

    function test_Pause_PreventsRegistration() public {
        vm.prank(admin);
        registry.pause();

        vm.prank(borrower);
        vm.expectRevert();
        registry.registerPassport(passportId1, borrower, sampleHash1, 0);
    }
}
