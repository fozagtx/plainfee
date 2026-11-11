// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";

import {PlainfeeHook} from "../../src/PlainfeeHook.sol";
import {PlainfeeBase} from "./Base.t.sol";

contract PlainfeeHookTest is PlainfeeBase {
    function setUp() public override {
        super.setUp();
        _seed(1e21); // ~1 ETH + ~1M WIF
    }

    function test_addressCarriesOnlyThePlainPermissions() public view {
        uint160 bits = uint160(address(hook)) & Hooks.ALL_HOOK_MASK;
        assertEq(bits, FLAGS);
        IHooks h = IHooks(address(hook));
        assertFalse(Hooks.hasPermission(h, Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG));
        assertFalse(Hooks.hasPermission(h, Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG));
        assertFalse(Hooks.hasPermission(h, Hooks.AFTER_SWAP_FLAG));
        assertFalse(Hooks.hasPermission(h, Hooks.AFTER_ADD_LIQUIDITY_RETURNS_DELTA_FLAG));
        assertFalse(Hooks.hasPermission(h, Hooks.AFTER_REMOVE_LIQUIDITY_RETURNS_DELTA_FLAG));
    }

    function test_swapEventShowsBaseFee() public {
        assertEq(_swap(trader, true, 0.01 ether), 3000);
        assertEq(_swap(trader, false, 1_000e18), 3000);
    }

    function test_tiersLowerTheRecordedFee() public {
        _lockAndWarm(trader, 10_000e18);
        assertEq(_swap(trader, true, 0.01 ether), 2500);
        _lockAndWarm(trader, 90_000e18);
        assertEq(_swap(trader, true, 0.01 ether), 2000);
        _lockAndWarm(trader, 900_000e18);
        assertEq(_swap(trader, true, 0.01 ether), 1500);
    }

    function test_tierBoundaries() public {
        _lockAndWarm(trader, 10_000e18 - 1);
        assertEq(hook.feeFor(trader), 3000);
        _lockAndWarm(trader, 1);
        assertEq(hook.feeFor(trader), 2500);
    }

    function test_flashLockedWifGetsNoDiscount() public {
        vm.prank(trader);
        wifLock.lock(5_000_000e18);
        assertEq(_swap(trader, true, 0.01 ether), 3000);
    }

    function test_discountFollowsTxOriginNotRouter() public {
        _lockAndWarm(trader, 1_000_000e18);
        address other = makeAddr("other");
        vm.deal(other, 1 ether);
        assertEq(_swap(other, true, 0.01 ether), 3000);
        assertEq(_swap(trader, true, 0.01 ether), 1500);
    }

    function testFuzz_feeNeverAboveBase(uint256 weight) public {
        weight = bound(weight, 1, 50_000_000e18);
        _lockAndWarm(trader, weight);
        assertLe(hook.feeFor(trader), hook.BASE_FEE());
    }

    function test_onlyVaultCanAddLiquidity() public {
        PoolModifyLiquidityTest lpRouter = new PoolModifyLiquidityTest(manager);
        vm.prank(lp);
        wif.approve(address(lpRouter), type(uint256).max);
        vm.prank(lp);
        vm.expectRevert();
        lpRouter.modifyLiquidity{value: 1 ether}(
            key, ModifyLiquidityParams({tickLower: -600, tickUpper: 600, liquidityDelta: 1e18, salt: 0}), ""
        );
    }

    function test_hookRejectsOtherPools() public {
        MockERC20 other = new MockERC20("Other", "OTH", 18);
        PoolKey memory k = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(address(other)),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });
        vm.expectRevert();
        manager.initialize(k, SQRT_PRICE);
    }

    function test_badThresholdsRevert() public {
        uint256[3] memory bad = [uint256(10), 10, 20];
        vm.expectRevert();
        new PlainfeeHook(IPoolManager(address(manager)), wifLock, bad);
    }
}
