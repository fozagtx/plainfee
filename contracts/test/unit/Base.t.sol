// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, Vm} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {HookMiner} from "@uniswap/v4-periphery/test/shared/HookMiner.sol";

import {PlainfeeHook} from "../../src/PlainfeeHook.sol";
import {BurnVault} from "../../src/BurnVault.sol";
import {WifLock} from "../../src/WifLock.sol";
import {MockWIF} from "../mocks/MockWIF.sol";

abstract contract PlainfeeBase is Test {
    uint160 internal constant FLAGS =
        uint160(Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG);
    // 1 ETH = 1,000,000 WIF  =>  sqrt(1e6) = 1000
    uint160 internal constant SQRT_PRICE = uint160(1000) << 96;
    bytes32 internal constant SWAP_TOPIC =
        keccak256("Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)");

    PoolManager internal manager;
    PoolSwapTest internal router;
    MockWIF internal wif;
    WifLock internal wifLock;
    PlainfeeHook internal hook;
    BurnVault internal vault;
    PoolKey internal key;

    address internal lp = makeAddr("lp");
    address internal trader = makeAddr("trader");

    uint256[3] internal thresholds = [uint256(10_000e18), 100_000e18, 1_000_000e18];

    function setUp() public virtual {
        manager = new PoolManager(address(this));
        router = new PoolSwapTest(manager);
        wif = new MockWIF();
        wifLock = new WifLock(IERC20(address(wif)));

        bytes memory args = abi.encode(IPoolManager(address(manager)), wifLock, thresholds);
        (address predicted, bytes32 salt) =
            HookMiner.find(address(this), FLAGS, type(PlainfeeHook).creationCode, args);
        hook = new PlainfeeHook{salt: salt}(manager, wifLock, thresholds);
        assertEq(address(hook), predicted);
        vault = hook.vault();
        key = vault.poolKey();
        manager.initialize(key, SQRT_PRICE);

        vm.deal(lp, 1_000 ether);
        wif.mint(lp, 1_000_000_000e18);
        vm.prank(lp);
        wif.approve(address(vault), type(uint256).max);

        vm.deal(trader, 1_000 ether);
        wif.mint(trader, 100_000_000e18);
        vm.startPrank(trader);
        wif.approve(address(router), type(uint256).max);
        wif.approve(address(wifLock), type(uint256).max);
        vm.stopPrank();
    }

    function _seed(uint128 liquidity) internal {
        vm.prank(lp);
        vault.deposit{value: 100 ether}(liquidity, type(uint256).max);
    }

    /// @dev Swap as `who`, with tx.origin = `who`. Returns the fee recorded in the Swap event.
    function _swap(address who, bool ethForWif, uint256 amountIn) internal returns (uint24 fee) {
        PoolSwapTest.TestSettings memory settings =
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});
        SwapParams memory params = SwapParams({
            zeroForOne: ethForWif,
            amountSpecified: -int256(amountIn),
            sqrtPriceLimitX96: ethForWif ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
        });
        vm.recordLogs();
        vm.prank(who, who);
        router.swap{value: ethForWif ? amountIn : 0}(key, params, settings, "");
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i; i < logs.length; i++) {
            if (logs[i].topics[0] == SWAP_TOPIC) {
                (,,,,, fee) = abi.decode(logs[i].data, (int128, int128, uint160, uint128, int24, uint24));
                return fee;
            }
        }
        revert("no Swap event");
    }

    function _lockAndWarm(address who, uint256 amount) internal {
        vm.prank(who);
        wifLock.lock(amount);
        skip(wifLock.WARMUP());
    }
}
