// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Addresses} from "../../src/Addresses.sol";

/// @notice Proves the toolchain can fork Robinhood Chain and that the
/// addresses the hook depends on are what we think they are.
contract EnvironmentForkTest is Test {
    function setUp() public {
        vm.createSelectFork(vm.rpcUrl("robinhood"));
    }

    function test_chainId() public view {
        assertEq(block.chainid, Addresses.CHAIN_ID);
    }

    function test_wifIsTheTokenWeExpect() public view {
        IERC20Metadata wif = IERC20Metadata(Addresses.WIF);
        assertEq(wif.symbol(), "WIF");
        assertEq(wif.decimals(), 18);
    }

    function test_wifBurnReducesSupply() public {
        address holder = makeAddr("holder");
        deal(Addresses.WIF, holder, 1e18);
        uint256 supplyBefore = IERC20Metadata(Addresses.WIF).totalSupply();
        vm.prank(holder);
        (bool ok,) = Addresses.WIF.call(abi.encodeWithSignature("burn(uint256)", 1e18));
        assertTrue(ok, "burn(uint256) reverted");
        assertEq(IERC20Metadata(Addresses.WIF).totalSupply(), supplyBefore - 1e18);
    }

    function test_uniswapV4IsDeployed() public view {
        assertGt(Addresses.POOL_MANAGER.code.length, 0, "PoolManager");
        assertGt(Addresses.POSITION_MANAGER.code.length, 0, "PositionManager");
        assertGt(Addresses.UNIVERSAL_ROUTER.code.length, 0, "UniversalRouter");
        assertGt(Addresses.PERMIT2.code.length, 0, "Permit2");
        assertGt(Addresses.CREATE2_DEPLOYER.code.length, 0, "CREATE2 deployer");
    }
}
