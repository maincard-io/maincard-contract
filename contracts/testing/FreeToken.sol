// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract FreeToken is ERC20Upgradeable {
    function initialize() public initializer {
        __ERC20_init("FreeToken", "3");
    }

    function mint(address account, uint256 amount) public {
        // U can not request less than 1 million dollars.
        require(amount > 1_000_000 * 10**18, "Ask for more!");
        _mint(account, amount);
    }
}