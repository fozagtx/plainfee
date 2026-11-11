// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {WifLock} from "../../src/WifLock.sol";
import {MockWIF} from "../mocks/MockWIF.sol";

contract WifLockTest is Test {
    MockWIF wif;
    WifLock wifLock;
    address alice = makeAddr("alice");

    function setUp() public {
        wif = new MockWIF();
        wifLock = new WifLock(IERC20(address(wif)));
        wif.mint(alice, 1_000_000e18);
        vm.prank(alice);
        wif.approve(address(wifLock), type(uint256).max);
    }

    function test_lockCountsOnlyAfterWarmup() public {
        vm.prank(alice);
        wifLock.lock(100e18);
        assertEq(wifLock.weightOf(alice), 0);
        skip(wifLock.WARMUP() - 1);
        assertEq(wifLock.weightOf(alice), 0);
        skip(1);
        assertEq(wifLock.weightOf(alice), 100e18);
        assertEq(wif.balanceOf(address(wifLock)), 100e18);
    }

    function test_flashLockEarnsNothing() public {
        vm.startPrank(alice);
        wifLock.lock(500_000e18);
        assertEq(wifLock.weightOf(alice), 0, "same tx weight");
        wifLock.requestUnlock();
        vm.stopPrank();
        skip(wifLock.WARMUP());
        assertEq(wifLock.weightOf(alice), 0, "pending unlock has no weight");
    }

    function test_topUpKeepsMaturedWeight() public {
        vm.prank(alice);
        wifLock.lock(100e18);
        skip(wifLock.WARMUP());
        vm.prank(alice);
        wifLock.lock(50e18);
        assertEq(wifLock.weightOf(alice), 100e18);
        skip(wifLock.WARMUP());
        assertEq(wifLock.weightOf(alice), 150e18);
    }

    function test_topUpOfPendingRestartsWarmup() public {
        vm.prank(alice);
        wifLock.lock(100e18);
        skip(30 minutes);
        vm.prank(alice);
        wifLock.lock(1e18);
        skip(30 minutes);
        assertEq(wifLock.weightOf(alice), 0);
        skip(30 minutes);
        assertEq(wifLock.weightOf(alice), 101e18);
    }

    function test_requestUnlockDropsWeightAndCooldownHolds() public {
        vm.prank(alice);
        wifLock.lock(100e18);
        skip(wifLock.WARMUP());
        vm.prank(alice);
        wifLock.requestUnlock();
        assertEq(wifLock.weightOf(alice), 0);

        skip(wifLock.COOLDOWN() - 1);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(WifLock.CooldownActive.selector, block.timestamp + 1));
        wifLock.withdraw();

        skip(1);
        uint256 before = wif.balanceOf(alice);
        vm.prank(alice);
        wifLock.withdraw();
        assertEq(wif.balanceOf(alice) - before, 100e18);
        assertEq(wif.balanceOf(address(wifLock)), 0);
    }

    function test_cannotLockWhileUnlockPending() public {
        vm.startPrank(alice);
        wifLock.lock(1e18);
        wifLock.requestUnlock();
        vm.expectRevert(WifLock.UnlockPending.selector);
        wifLock.lock(1e18);
        vm.expectRevert(WifLock.UnlockPending.selector);
        wifLock.requestUnlock();
        vm.stopPrank();
    }

    function test_reverts() public {
        vm.startPrank(alice);
        vm.expectRevert(WifLock.ZeroAmount.selector);
        wifLock.lock(0);
        vm.expectRevert(WifLock.NothingLocked.selector);
        wifLock.requestUnlock();
        vm.expectRevert(WifLock.NoUnlockRequested.selector);
        wifLock.withdraw();
        vm.stopPrank();
    }

    function test_onlyLockerCanWithdraw() public {
        vm.prank(alice);
        wifLock.lock(10e18);
        address bob = makeAddr("bob");
        vm.prank(bob);
        vm.expectRevert(WifLock.NoUnlockRequested.selector);
        wifLock.withdraw();
    }

    function testFuzz_weightNeverExceedsLocked(uint96 a, uint96 b, uint32 gap) public {
        a = uint96(bound(a, 1, 500_000e18));
        b = uint96(bound(b, 1, 500_000e18));
        vm.prank(alice);
        wifLock.lock(a);
        skip(gap);
        vm.prank(alice);
        wifLock.lock(b);
        assertLe(wifLock.weightOf(alice), uint256(a) + b);
        skip(wifLock.WARMUP());
        assertEq(wifLock.weightOf(alice), uint256(a) + b);
    }
}
