// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {BurnVault} from "../../src/BurnVault.sol";
import {PlainfeeBase} from "./Base.t.sol";

contract BurnVaultTest is PlainfeeBase {
    uint128 constant L = 1e21; // ~1 ETH + ~1M WIF at the test price

    function test_depositTakesBothSidesAndRefundsEth() public {
        uint256 ethBefore = lp.balance;
        uint256 wifBefore = wif.balanceOf(lp);
        _seed(L);
        uint256 ethIn = ethBefore - lp.balance;
        uint256 wifIn = wifBefore - wif.balanceOf(lp);
        assertApproxEqRel(ethIn, 1 ether, 0.01e18);
        assertApproxEqRel(wifIn, 1_000_000e18, 0.01e18);
        assertEq(vault.sharesOf(lp), L);
        assertEq(vault.totalShares(), L);
        assertEq(address(vault).balance, 0, "no ETH left behind");
    }

    function test_depositRevertsOnSlippageBounds() public {
        vm.prank(lp);
        vm.expectRevert();
        vault.deposit{value: 0.5 ether}(L, type(uint256).max);
        vm.prank(lp);
        vm.expectRevert();
        vault.deposit{value: 2 ether}(L, 1e18);
    }

    function test_withdrawReturnsPrincipalWithoutSwaps() public {
        uint256 ethBefore = lp.balance;
        uint256 wifBefore = wif.balanceOf(lp);
        _seed(L);
        vm.prank(lp);
        vault.withdraw(L);
        assertApproxEqAbs(lp.balance, ethBefore, 2);
        assertApproxEqAbs(wif.balanceOf(lp), wifBefore, 2);
        assertEq(vault.totalShares(), 0);
    }

    function test_feesStayInVaultWhenPrincipalLeaves() public {
        _seed(L);
        _swap(trader, true, 0.1 ether);
        _swap(trader, false, 100_000e18);
        vm.prank(lp);
        vault.withdraw(L);
        // 0.30% of each input was the fee; it stayed with the vault.
        assertApproxEqRel(vault.accruedEth(), 0.0003 ether, 0.01e18);
        assertApproxEqRel(vault.accruedWif(), 300e18, 0.01e18);
        assertEq(address(vault).balance, vault.accruedEth());
        assertEq(wif.balanceOf(address(vault)), vault.accruedWif());
    }

    function test_withdrawMoreThanSharesReverts() public {
        _seed(L);
        vm.prank(trader);
        vm.expectRevert(BurnVault.InsufficientShares.selector);
        vault.withdraw(1);
    }

    function test_harvestBurnsAllFees() public {
        _seed(L);
        _swap(trader, true, 0.1 ether);
        _swap(trader, false, 100_000e18);

        uint256 supplyBefore = wif.totalSupply();
        address keeper = makeAddr("keeper");
        vm.prank(keeper, keeper);
        uint256 burned = vault.harvest(0);

        assertGt(burned, 300e18, "WIF fees plus the swapped ETH fees");
        assertEq(supplyBefore - wif.totalSupply(), burned);
        assertEq(vault.totalBurned(), burned);
        assertEq(vault.accruedEth(), 0);
        assertEq(vault.accruedWif(), 0);
        assertEq(wif.balanceOf(address(vault)), 0);
        assertEq(address(vault).balance, 0);
    }

    function test_harvestRespectsMinWifOut() public {
        _seed(L);
        _swap(trader, true, 0.1 ether);
        vm.expectRevert();
        vault.harvest(type(uint256).max);
    }

    function test_principalUnaffectedByHarvest() public {
        _seed(L);
        _swap(trader, true, 0.1 ether);
        _swap(trader, false, 100_000e18); // round trip, price back near start
        vault.harvest(0);
        uint256 ethBefore = lp.balance;
        uint256 wifBefore = wif.balanceOf(lp);
        vm.prank(lp);
        vault.withdraw(L);
        assertApproxEqRel(lp.balance - ethBefore, 1 ether, 0.05e18);
        assertApproxEqRel(wif.balanceOf(lp) - wifBefore, 1_000_000e18, 0.05e18);
    }

    function test_harvestWithNothingIsHarmless() public {
        assertEq(vault.harvest(0), 0);
        _seed(L);
        assertEq(vault.harvest(0), 0);
    }

    function test_rejectsStrayEth() public {
        vm.deal(trader, 1 ether);
        vm.prank(trader);
        (bool ok,) = address(vault).call{value: 1}("");
        assertFalse(ok);
    }

    function testFuzz_feesNeverReachDepositor(uint256 ethIn, uint256 wifIn) public {
        ethIn = bound(ethIn, 0.001 ether, 0.5 ether);
        wifIn = bound(wifIn, 1_000e18, 500_000e18);
        _seed(L);
        _swap(trader, true, ethIn);
        _swap(trader, false, wifIn);
        vm.prank(lp);
        vault.withdraw(L);
        assertEq(address(vault).balance, vault.accruedEth());
        assertEq(wif.balanceOf(address(vault)), vault.accruedWif());
        assertGt(vault.accruedEth() + vault.accruedWif(), 0);
    }
}
