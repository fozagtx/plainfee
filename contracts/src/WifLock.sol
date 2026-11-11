// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title WifLock
/// @notice Lock $WIF to earn a lower Plainfee swap fee.
/// @dev Newly locked WIF counts only after WARMUP, and an unlock request removes all weight at once,
///      so WIF borrowed and locked inside one transaction (a flash-lock) never earns a discount.
///      There is no owner. Locked WIF can only leave to the account that locked it.
contract WifLock {
    using SafeERC20 for IERC20;

    uint256 public constant WARMUP = 1 hours;
    uint256 public constant COOLDOWN = 3 days;

    struct Position {
        uint128 matured; // locked at least WARMUP ago
        uint128 pending; // locked less than WARMUP ago, as of the last write
        uint64 pendingSince; // when `pending` was last topped up
        uint64 unlockRequestedAt; // 0 while locked
    }

    IERC20 public immutable wif;
    mapping(address account => Position) internal _positions;

    event Locked(address indexed account, uint256 amount);
    event UnlockRequested(address indexed account, uint256 amount, uint256 availableAt);
    event Withdrawn(address indexed account, uint256 amount);

    error ZeroAmount();
    error UnlockPending();
    error NothingLocked();
    error NoUnlockRequested();
    error CooldownActive(uint256 availableAt);

    constructor(IERC20 wif_) {
        wif = wif_;
    }

    /// @notice Lock `amount` WIF. It starts counting toward your fee tier after WARMUP.
    function lock(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        Position memory p = _mature(_positions[msg.sender]);
        if (p.unlockRequestedAt != 0) revert UnlockPending();

        p.pending += uint128(amount);
        p.pendingSince = uint64(block.timestamp);
        _positions[msg.sender] = p;

        wif.safeTransferFrom(msg.sender, address(this), amount);
        emit Locked(msg.sender, amount);
    }

    /// @notice Start the cooldown on your whole position. Your fee discount ends immediately.
    function requestUnlock() external {
        Position memory p = _positions[msg.sender];
        uint256 total = uint256(p.matured) + p.pending;
        if (total == 0) revert NothingLocked();
        if (p.unlockRequestedAt != 0) revert UnlockPending();

        _positions[msg.sender].unlockRequestedAt = uint64(block.timestamp);
        emit UnlockRequested(msg.sender, total, block.timestamp + COOLDOWN);
    }

    /// @notice Withdraw your whole position once the cooldown has passed.
    function withdraw() external {
        Position memory p = _positions[msg.sender];
        if (p.unlockRequestedAt == 0) revert NoUnlockRequested();
        uint256 availableAt = uint256(p.unlockRequestedAt) + COOLDOWN;
        if (block.timestamp < availableAt) revert CooldownActive(availableAt);

        uint256 total = uint256(p.matured) + p.pending;
        delete _positions[msg.sender];

        wif.safeTransfer(msg.sender, total);
        emit Withdrawn(msg.sender, total);
    }

    /// @notice WIF that counts toward `account`'s fee tier right now.
    function weightOf(address account) external view returns (uint256) {
        Position memory p = _mature(_positions[account]);
        if (p.unlockRequestedAt != 0) return 0;
        return p.matured;
    }

    /// @notice The raw position, for the UI.
    function positionOf(address account)
        external
        view
        returns (uint256 matured, uint256 pending, uint256 pendingSince, uint256 unlockRequestedAt)
    {
        Position memory p = _mature(_positions[account]);
        return (p.matured, p.pending, p.pendingSince, p.unlockRequestedAt);
    }

    function _mature(Position memory p) private view returns (Position memory) {
        if (p.pending != 0 && block.timestamp >= uint256(p.pendingSince) + WARMUP) {
            p.matured += p.pending;
            p.pending = 0;
        }
        return p;
    }
}
