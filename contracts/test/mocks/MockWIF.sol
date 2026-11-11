// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";

/// @dev Stand-in for $WIF in unit tests: an ERC-20 with holder burns, like the real token.
contract MockWIF is MockERC20 {
    constructor() MockERC20("dogwifhat", "WIF", 18) {}

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
