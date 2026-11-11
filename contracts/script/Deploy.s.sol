// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {VmSafe} from "forge-std/Vm.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {HookMiner} from "@uniswap/v4-periphery/test/shared/HookMiner.sol";

import {Addresses} from "../src/Addresses.sol";
import {PlainfeeHook} from "../src/PlainfeeHook.sol";
import {BurnVault} from "../src/BurnVault.sol";
import {WifLock} from "../src/WifLock.sol";

/// @notice Deploys WifLock, mines the hook salt, deploys PlainfeeHook (which deploys BurnVault),
///         initializes the ETH/WIF pool and writes deployments/<chainid>.json.
/// @dev Env: SQRT_PRICE_X96 (required; read it from the main existing WIF pool),
///      TIER1_WIF / TIER2_WIF / TIER3_WIF (whole WIF; default 500 / 2,500 / 10,000).
///      Dry run:  forge script script/Deploy.s.sol --rpc-url robinhood --account plainfee
///      Live:     add --broadcast --verify
contract Deploy is Script {
    uint160 constant FLAGS =
        uint160(Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG);

    function run() external {
        require(block.chainid == Addresses.CHAIN_ID, "wrong chain");
        uint160 sqrtPriceX96 = uint160(vm.envUint("SQRT_PRICE_X96"));
        uint256[3] memory thresholds = [
            vm.envOr("TIER1_WIF", uint256(500)) * 1e18,
            vm.envOr("TIER2_WIF", uint256(2_500)) * 1e18,
            vm.envOr("TIER3_WIF", uint256(10_000)) * 1e18
        ];
        IPoolManager manager = IPoolManager(Addresses.POOL_MANAGER);

        vm.startBroadcast();
        WifLock wifLock = new WifLock(IERC20(Addresses.WIF));

        bytes memory args = abi.encode(manager, wifLock, thresholds);
        (address predicted, bytes32 salt) =
            HookMiner.find(Addresses.CREATE2_DEPLOYER, FLAGS, type(PlainfeeHook).creationCode, args);
        PlainfeeHook hook = new PlainfeeHook{salt: salt}(manager, wifLock, thresholds);
        require(address(hook) == predicted, "hook address mismatch");

        BurnVault vault = hook.vault();
        manager.initialize(vault.poolKey(), sqrtPriceX96);
        vm.stopBroadcast();

        console2.log("WifLock     ", address(wifLock));
        console2.log("PlainfeeHook", address(hook));
        console2.log("BurnVault   ", address(vault));
        // Only a real broadcast writes the deployment record, so a dry run never leaves fake addresses.
        if (!vm.isContext(VmSafe.ForgeContext.ScriptBroadcast)) return;

        string memory o = "deployment";
        vm.serializeUint(o, "chainId", block.chainid);
        vm.serializeAddress(o, "wifLock", address(wifLock));
        vm.serializeAddress(o, "hook", address(hook));
        vm.serializeAddress(o, "vault", address(vault));
        vm.serializeBytes32(o, "poolId", PoolId.unwrap(vault.poolId()));
        vm.serializeUint(o, "sqrtPriceX96", sqrtPriceX96);
        string memory json = vm.serializeUint(o, "block", block.number);
        vm.writeJson(json, string.concat("deployments/", vm.toString(block.chainid), ".json"));
    }
}
