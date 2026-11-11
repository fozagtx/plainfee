// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice The $WIF token on Robinhood Chain: a plain ERC-20 with holder-initiated burns.
interface IWIF is IERC20 {
    function burn(uint256 amount) external;
}
