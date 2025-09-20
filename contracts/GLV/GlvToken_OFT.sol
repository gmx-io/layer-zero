// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";

contract GlvToken_OFT is OFT, ERC20Permit {
    /// @dev Using msg.sender instead of _delegate in Ownable to avoid via-ir
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) ERC20Permit(_name) Ownable(msg.sender) {}
}
