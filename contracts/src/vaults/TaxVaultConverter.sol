// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IStockSwapAdapter} from "../interfaces/IStockSwapAdapter.sol";

interface IJackpotSink {
    function fundJackpot(uint256 amount) external;
}

interface ICreditsSink {
    function fundCredits(uint256 amount) external;
}

/// @title TaxVaultConverter
/// @notice Receives taxed protocol tokens (as either the Pack Rewards Vault or
///         the Jackpot Support Vault) and lets an authorized keeper batch-convert
///         them into USDG through a configured adapter — never on transfer.
///         Converted USDG is forwarded to its destination:
///           - JACKPOT  → StockPackz.fundJackpot
///           - CREDITS  → PackCredits.fundCredits
contract TaxVaultConverter is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Destination {
        Jackpot,
        Credits
    }

    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    IERC20 public immutable protocolToken;
    IERC20 public immutable usdg;
    Destination public immutable destination;

    IStockSwapAdapter public adapter;
    address public sink;

    event Converted(uint256 tokenAmountIn, uint256 usdgOut);
    event AdapterUpdated(address adapter);
    event SinkUpdated(address sink);

    error ZeroAddress();
    error BadOutput();

    constructor(
        IERC20 _protocolToken,
        IERC20 _usdg,
        IStockSwapAdapter _adapter,
        address _sink,
        Destination _destination,
        address admin
    ) {
        if (address(_protocolToken) == address(0) || address(_usdg) == address(0) || _sink == address(0)) {
            revert ZeroAddress();
        }
        protocolToken = _protocolToken;
        usdg = _usdg;
        adapter = _adapter;
        sink = _sink;
        destination = _destination;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(KEEPER_ROLE, admin);
    }

    function setAdapter(IStockSwapAdapter _adapter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(_adapter) == address(0)) revert ZeroAddress();
        adapter = _adapter;
        emit AdapterUpdated(address(_adapter));
    }

    function setSink(address _sink) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_sink == address(0)) revert ZeroAddress();
        sink = _sink;
        emit SinkUpdated(_sink);
    }

    /// @notice Convert `amountIn` accumulated protocol tokens into USDG with
    ///         explicit slippage/deadline bounds and forward to the sink.
    function convert(uint256 amountIn, uint256 minAmountOut, uint256 deadline)
        external
        onlyRole(KEEPER_ROLE)
        nonReentrant
        returns (uint256 amountOut)
    {
        protocolToken.forceApprove(address(adapter), amountIn);
        amountOut = adapter.swapExactInput(
            address(protocolToken), address(usdg), amountIn, minAmountOut, address(this), deadline
        );
        protocolToken.forceApprove(address(adapter), 0);
        if (amountOut < minAmountOut) revert BadOutput();

        if (destination == Destination.Jackpot) {
            usdg.forceApprove(sink, amountOut);
            IJackpotSink(sink).fundJackpot(amountOut);
        } else {
            usdg.forceApprove(sink, amountOut);
            ICreditsSink(sink).fundCredits(amountOut);
        }

        emit Converted(amountIn, amountOut);
    }
}
