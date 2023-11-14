// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./MainToken.sol";

contract Lottery {
    MainToken public maintoken;
    // i'm not sure...
    uint256 public ticketPrice = 50 * 10 ** 18;
    address public owner;
    mapping(address => uint256) public ticketsBought;
    mapping(address => uint256) public gasFreeOpCounter;

    event TicketPurchased(address buyer, uint256 amount);

    constructor(address _mcnTokenAddress) {
        maintoken = MainToken(_mcnTokenAddress);
        owner = msg.sender;
    }

    function buyTicketGasFree(
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        bytes memory originalMessage = abi.encodePacked(ticketPrice, gasFreeOpCounter[msg.sender]);
        bytes32 prefixedHashMessage = keccak256(
            abi.encodePacked(
                "\x19E Signed Message:\n32",
                keccak256(originalMessage)
            )
        );
        address signer = ecrecover(prefixedHashMessage, _v, _r, _s);
        require(signer == msg.sender, "Invalid signature");
        require(maintoken.transferFrom(signer, address(this), ticketPrice), "Transfer failed");

        ++gasFreeOpCounter[signer];
        ticketsBought[signer] += 1;
        emit TicketPurchased(signer, ticketPrice);
    }
}
