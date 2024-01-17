// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract MainToken is ERC20Upgradeable, AccessControlUpgradeable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    mapping(address => uint256) public permitOpsCounter;
    mapping(address => bool) badUsers;
    mapping(address => bool) allowedDestinations;

    function initialize() public initializer {
        __ERC20_init("MainToken", "MCN");
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address account, uint256 amount) public {
        require(
            hasRole(MINTER_ROLE, msg.sender),
            "msg.sender should have granted MINTER_ROLE"
        );
        _mint(account, amount);
    }

    function permit(
        address spender,
        address sender,
        uint256 amount,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        bytes memory originalMessage = abi.encodePacked(
            permitOpsCounter[sender],
            spender,
            amount
        );
        bytes32 prefixedHashMessage = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(originalMessage)
            )
        );
        address signer = ecrecover(prefixedHashMessage, _v, _r, _s);
        require(signer == sender, "snec");
        ++permitOpsCounter[sender];
        _approve(signer, spender, amount);
    }

    function setBadUser(address user, bool isBad) public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "msg.sender should have granted DEFAULT_ADMIN_ROLE"
        );
        badUsers[user] = isBad;
    }

    function setAllowedDestination(address destination, bool isAllowed) public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "msg.sender should have granted DEFAULT_ADMIN_ROLE"
        );
        allowedDestinations[destination] = isAllowed;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256
    ) internal override view {
        require(!badUsers[from], "bad user");
        require(!badUsers[to], "bad user");

        // Disallow transfers until accumulation mode is off
        require(from == address(0) || allowedDestinations[to], "Accumulation Mode is ON");
    }
}
