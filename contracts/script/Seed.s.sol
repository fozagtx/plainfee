// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {Addresses} from "../src/Addresses.sol";
import {BurnVault} from "../src/BurnVault.sol";

/// @notice Seeds the BurnVault position. Env: VAULT, LIQUIDITY, ETH_WEI (sent; excess refunded),
///         MAX_WIF (wei). Principal stays withdrawable with BurnVault.withdraw.
contract Seed is Script {
    function run() external {
        BurnVault vault = BurnVault(payable(vm.envAddress("VAULT")));
        uint128 liquidity = uint128(vm.envUint("LIQUIDITY"));
        uint256 ethWei = vm.envUint("ETH_WEI");
        uint256 maxWif = vm.envUint("MAX_WIF");

        vm.startBroadcast();
        IERC20(Addresses.WIF).approve(address(vault), maxWif);
        vault.deposit{value: ethWei}(liquidity, maxWif);
        vm.stopBroadcast();

        console2.log("shares", vault.sharesOf(msg.sender));
    }
}
