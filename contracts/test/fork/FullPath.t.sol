// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, Vm} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {HookMiner} from "@uniswap/v4-periphery/test/shared/HookMiner.sol";

import {Addresses} from "../../src/Addresses.sol";
import {PlainfeeHook} from "../../src/PlainfeeHook.sol";
import {BurnVault} from "../../src/BurnVault.sol";
import {WifLock} from "../../src/WifLock.sol";

/// @notice The whole Plainfee path against the live Uniswap v4 PoolManager and the real $WIF.
contract FullPathForkTest is Test {
    uint160 constant FLAGS =
        uint160(Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG);
    bytes32 constant SWAP_TOPIC =
        keccak256("Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)");

    IPoolManager manager = IPoolManager(Addresses.POOL_MANAGER);
    IERC20 wif = IERC20(Addresses.WIF);
    PlainfeeHook hook;
    BurnVault vault;
    WifLock wifLock;
    PoolSwapTest router;
    PoolKey key;
    address trader = makeAddr("trader");

    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("robinhood"));
        wifLock = new WifLock(wif);
        uint256[3] memory t = [uint256(10_000e18), 100_000e18, 1_000_000e18];
        bytes memory args = abi.encode(manager, wifLock, t);
        (, bytes32 salt) = HookMiner.find(address(this), FLAGS, type(PlainfeeHook).creationCode, args);
        hook = new PlainfeeHook{salt: salt}(manager, wifLock, t);
        vault = hook.vault();
        key = vault.poolKey();
        manager.initialize(key, uint160(1000) << 96);
        router = new PoolSwapTest(manager);

        deal(address(wif), address(this), 2_000_000e18);
        vm.deal(address(this), 10 ether);
        wif.approve(address(vault), type(uint256).max);
        vault.deposit{value: 2 ether}(1e21, type(uint256).max);

        deal(address(wif), trader, 2_000_000e18);
        vm.deal(trader, 10 ether);
        vm.startPrank(trader);
        wif.approve(address(router), type(uint256).max);
        wif.approve(address(wifLock), type(uint256).max);
        vm.stopPrank();
    }

    receive() external payable {}

    function test_swapRecordsFeeThenHarvestBurnsRealWif() public {
        assertEq(_swap(true, 0.05 ether), 3000);

        vm.prank(trader);
        wifLock.lock(1_000_000e18);
        skip(wifLock.WARMUP());
        assertEq(_swap(false, 50_000e18), 1500);

        uint256 supplyBefore = wif.totalSupply();
        uint256 burned = vault.harvest(0);
        assertGt(burned, 0);
        assertEq(supplyBefore - wif.totalSupply(), burned, "real WIF supply fell by the burn");

        uint256 ethBefore = address(this).balance;
        vault.withdraw(1e21);
        assertGt(address(this).balance, ethBefore, "principal came back");
    }

    function _swap(bool ethForWif, uint256 amountIn) internal returns (uint24 fee) {
        vm.recordLogs();
        vm.prank(trader, trader);
        router.swap{value: ethForWif ? amountIn : 0}(
            key,
            SwapParams({
                zeroForOne: ethForWif,
                amountSpecified: -int256(amountIn),
                sqrtPriceLimitX96: ethForWif ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i; i < logs.length; i++) {
            if (logs[i].topics[0] == SWAP_TOPIC) {
                (,,,,, fee) = abi.decode(logs[i].data, (int128, int128, uint160, uint128, int24, uint24));
                return fee;
            }
        }
        revert("no Swap event");
    }
}
