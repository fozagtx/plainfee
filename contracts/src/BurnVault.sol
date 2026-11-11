// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta, BalanceDeltaLibrary, toBalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IWIF} from "./interfaces/IWIF.sol";

/// @title BurnVault
/// @notice The only liquidity provider in the Plainfee ETH/WIF pool. Depositors can always take back
///         their principal. Every fee the position earns is kept apart and burned as $WIF by `harvest`.
/// @dev Deployed by PlainfeeHook, so `hook` is set without an owner. One full-range position, held
///      directly through PoolManager.unlock. Shares are liquidity units: fees never compound into the
///      position, so one share is always one unit of liquidity.
contract BurnVault is IUnlockCallback, ReentrancyGuard {
    using PoolIdLibrary for PoolKey;
    using SafeERC20 for IWIF;

    int24 public constant TICK_SPACING = 60;

    IPoolManager public immutable poolManager;
    IWIF public immutable wif;
    address public immutable hook;
    int24 public immutable tickLower;
    int24 public immutable tickUpper;

    mapping(address account => uint256) public sharesOf;
    uint256 public totalShares;

    /// @notice Fees collected but not yet burned.
    uint256 public accruedEth;
    uint256 public accruedWif;
    /// @notice All WIF this vault has ever burned.
    uint256 public totalBurned;

    enum Action {
        Deposit,
        Withdraw,
        Harvest
    }

    event Deposited(address indexed account, uint256 liquidity, uint256 ethIn, uint256 wifIn);
    event Withdrawn(address indexed account, uint256 liquidity, uint256 ethOut, uint256 wifOut);
    event FeesCollected(uint256 eth, uint256 wif);
    event Burned(uint256 wifAmount, uint256 ethIn, address indexed caller);

    error NotPoolManager();
    error ZeroLiquidity();
    error InsufficientShares();
    error InsufficientEth(uint256 needed, uint256 sent);
    error ExcessWif(uint256 needed, uint256 max);
    error Slippage(uint256 wifOut, uint256 minWifOut);
    error EthTransferFailed();

    constructor(IPoolManager poolManager_, IWIF wif_) {
        poolManager = poolManager_;
        wif = wif_;
        hook = msg.sender;
        tickLower = TickMath.minUsableTick(TICK_SPACING);
        tickUpper = TickMath.maxUsableTick(TICK_SPACING);
    }

    receive() external payable {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
    }

    // ---------------------------------------------------------------- views

    function poolKey() public view returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(address(wif)),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(hook)
        });
    }

    function poolId() external view returns (PoolId) {
        return poolKey().toId();
    }

    // ---------------------------------------------------------------- actions

    /// @notice Add `liquidity` to the full-range position. Send ETH with the call (any excess is
    ///         refunded) and approve up to `maxWif` WIF.
    function deposit(uint128 liquidity, uint256 maxWif) external payable nonReentrant {
        if (liquidity == 0) revert ZeroLiquidity();
        poolManager.unlock(abi.encode(Action.Deposit, msg.sender, uint256(liquidity), maxWif, msg.value));
        sharesOf[msg.sender] += liquidity;
        totalShares += liquidity;
    }

    /// @notice Remove `liquidity` of your own principal. Fees stay behind to be burned.
    function withdraw(uint128 liquidity) external nonReentrant {
        if (liquidity == 0) revert ZeroLiquidity();
        if (sharesOf[msg.sender] < liquidity) revert InsufficientShares();
        sharesOf[msg.sender] -= liquidity;
        totalShares -= liquidity;
        poolManager.unlock(
            abi.encode(Action.Withdraw, msg.sender, uint256(liquidity), uint256(0), uint256(0))
        );
    }

    /// @notice Collect the position's fees, swap the ETH side to WIF in this same pool, and burn all of it.
    ///         Anyone can call it. `minWifOut` bounds the ETH->WIF swap against sandwiching.
    function harvest(uint256 minWifOut) external nonReentrant returns (uint256 burned) {
        bytes memory result =
            poolManager.unlock(abi.encode(Action.Harvest, msg.sender, uint256(0), minWifOut, uint256(0)));
        (burned) = abi.decode(result, (uint256));
    }

    // ---------------------------------------------------------------- callback

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        (Action action, address account, uint256 amount, uint256 bound, uint256 ethSent) =
            abi.decode(data, (Action, address, uint256, uint256, uint256));

        if (action == Action.Deposit) {
            _deposit(account, amount, bound, ethSent);
            return "";
        }
        if (action == Action.Withdraw) {
            _withdraw(account, amount);
            return "";
        }
        return abi.encode(_harvest(account, bound));
    }

    function _deposit(address account, uint256 liquidity, uint256 maxWif, uint256 ethSent) private {
        (BalanceDelta principal,) = _modify(int256(liquidity));
        uint256 ethIn = uint256(uint128(-principal.amount0()));
        uint256 wifIn = uint256(uint128(-principal.amount1()));
        if (ethIn > ethSent) revert InsufficientEth(ethIn, ethSent);
        if (wifIn > maxWif) revert ExcessWif(wifIn, maxWif);

        if (ethIn != 0) poolManager.settle{value: ethIn}();
        if (wifIn != 0) {
            poolManager.sync(Currency.wrap(address(wif)));
            wif.safeTransferFrom(account, address(poolManager), wifIn);
            poolManager.settle();
        }
        if (ethSent > ethIn) _sendEth(account, ethSent - ethIn);
        emit Deposited(account, liquidity, ethIn, wifIn);
    }

    function _withdraw(address account, uint256 liquidity) private {
        (BalanceDelta principal,) = _modify(-int256(liquidity));
        uint256 ethOut = uint256(uint128(principal.amount0()));
        uint256 wifOut = uint256(uint128(principal.amount1()));
        if (ethOut != 0) poolManager.take(Currency.wrap(address(0)), account, ethOut);
        if (wifOut != 0) poolManager.take(Currency.wrap(address(wif)), account, wifOut);
        emit Withdrawn(account, liquidity, ethOut, wifOut);
    }

    function _harvest(address caller, uint256 minWifOut) private returns (uint256 burned) {
        if (totalShares != 0) _modify(0); // poke: collects fees into accruedEth / accruedWif

        uint256 ethIn = accruedEth;
        uint256 wifOut;
        if (ethIn != 0) {
            BalanceDelta swapDelta = poolManager.swap(
                poolKey(),
                SwapParams({
                    zeroForOne: true,
                    amountSpecified: -int256(ethIn),
                    sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
                }),
                ""
            );
            uint256 ethPaid = uint256(uint128(-swapDelta.amount0()));
            wifOut = uint256(uint128(swapDelta.amount1()));
            if (wifOut < minWifOut) revert Slippage(wifOut, minWifOut);
            poolManager.settle{value: ethPaid}();
            poolManager.take(Currency.wrap(address(wif)), address(this), wifOut);
            accruedEth = ethIn - ethPaid; // non-zero only if the price limit was hit
        }

        burned = accruedWif + wifOut;
        accruedWif = 0;
        if (burned != 0) {
            totalBurned += burned;
            wif.burn(burned);
        }
        emit Burned(burned, ethIn - accruedEth, caller);
    }

    /// @dev Change the position by `liquidityDelta`, take its fees into the vault, and return the
    ///      principal part of the delta (callerDelta minus fees). Only principal ever reaches a depositor.
    function _modify(int256 liquidityDelta) private returns (BalanceDelta principal, BalanceDelta fees) {
        BalanceDelta callerDelta;
        (callerDelta, fees) = poolManager.modifyLiquidity(
            poolKey(),
            ModifyLiquidityParams({
                tickLower: tickLower, tickUpper: tickUpper, liquidityDelta: liquidityDelta, salt: bytes32(0)
            }),
            ""
        );
        principal = callerDelta - fees;

        uint256 feeEth = uint256(uint128(fees.amount0()));
        uint256 feeWif = uint256(uint128(fees.amount1()));
        if (feeEth != 0) {
            poolManager.take(Currency.wrap(address(0)), address(this), feeEth);
            accruedEth += feeEth;
        }
        if (feeWif != 0) {
            poolManager.take(Currency.wrap(address(wif)), address(this), feeWif);
            accruedWif += feeWif;
        }
        if (feeEth != 0 || feeWif != 0) emit FeesCollected(feeEth, feeWif);
    }

    function _sendEth(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert EthTransferFailed();
    }
}
