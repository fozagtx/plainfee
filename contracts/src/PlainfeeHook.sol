// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {BaseOverrideFee} from "@openzeppelin/uniswap-hooks/fee/BaseOverrideFee.sol";
import {BaseHook} from "@openzeppelin/uniswap-hooks/base/BaseHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

import {WifLock} from "./WifLock.sol";
import {BurnVault} from "./BurnVault.sol";
import {IWIF} from "./interfaces/IWIF.sol";

/// @title PlainfeeHook
/// @notice A Uniswap v4 hook whose whole fee is the pool's own LP fee, set per swap with the
///         override flag, so it is written into the `fee` field of every `Swap` event.
///         Locked $WIF lowers the fee. Every fee is earned by BurnVault, which burns $WIF.
/// @dev The address carries only afterInitialize, beforeAddLiquidity and beforeSwap.
///      The return-delta permissions are off, so the hook can never take value outside the fee.
///      No owner, no setters: every parameter is immutable.
contract PlainfeeHook is BaseOverrideFee {
    using PoolIdLibrary for PoolKey;

    uint24 public constant BASE_FEE = 3000; // 0.30%
    uint24 public constant FEE_TIER_1 = 2500; // 0.25%
    uint24 public constant FEE_TIER_2 = 2000; // 0.20%
    uint24 public constant FEE_TIER_3 = 1500; // 0.15%

    WifLock public immutable wifLock;
    BurnVault public immutable vault;
    uint256 public immutable threshold1;
    uint256 public immutable threshold2;
    uint256 public immutable threshold3;

    error OnlyVault();
    error NotPlainfeePool();
    error BadThresholds();

    constructor(IPoolManager poolManager_, WifLock wifLock_, uint256[3] memory thresholds)
        BaseHook(poolManager_)
    {
        if (!(thresholds[0] > 0 && thresholds[0] < thresholds[1] && thresholds[1] < thresholds[2])) {
            revert BadThresholds();
        }
        wifLock = wifLock_;
        threshold1 = thresholds[0];
        threshold2 = thresholds[1];
        threshold3 = thresholds[2];
        vault = new BurnVault(poolManager_, IWIF(address(wifLock_.wif())));
    }

    /// @notice The fee a swap sent by `trader` (as tx.origin) pays right now, in pips.
    function feeFor(address trader) public view returns (uint24) {
        uint256 weight = wifLock.weightOf(trader);
        if (weight >= threshold3) return FEE_TIER_3;
        if (weight >= threshold2) return FEE_TIER_2;
        if (weight >= threshold1) return FEE_TIER_1;
        return BASE_FEE;
    }

    /// @dev Only the vault's ETH/WIF pool may use this hook, so every Plainfee pool burns WIF.
    function _afterInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96, int24 tick)
        internal
        override
        returns (bytes4)
    {
        if (PoolId.unwrap(key.toId()) != PoolId.unwrap(vault.poolId())) revert NotPlainfeePool();
        return super._afterInitialize(sender, key, sqrtPriceX96, tick);
    }

    /// @dev Only BurnVault provides liquidity, so no fee can be earned by anyone who doesn't burn it.
    function _beforeAddLiquidity(
        address sender,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) internal view override returns (bytes4) {
        if (sender != address(vault)) revert OnlyVault();
        return this.beforeAddLiquidity.selector;
    }

    /// @dev `sender` is the router, and hookData can name anyone, so the discount follows tx.origin.
    ///      A contract wallet pays BASE_FEE: never more than the advertised fee.
    function _getFee(address, PoolKey calldata, SwapParams calldata, bytes calldata)
        internal
        view
        override
        returns (uint24)
    {
        // solhint-disable-next-line avoid-tx-origin
        return feeFor(tx.origin);
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory permissions) {
        permissions = super.getHookPermissions();
        permissions.beforeAddLiquidity = true;
    }
}
