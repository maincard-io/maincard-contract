// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./MainToken.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Lottery is Initializable {
    MainToken public maintoken;
    uint256 public ticketPrice;
    address public owner;
    mapping(address => uint256) public ticketsBought;
    mapping(address => uint256) public gasFreeOpCounter;

    event TicketPurchased(address buyer, uint256 price);
    event TicketsPurchased(address buyer, uint256 price, uint256 amount);

    function initialize(
        address _mcnTokenAddress,
        uint256 _ticketPrice
    ) public initializer {
        maintoken = MainToken(_mcnTokenAddress);
        ticketPrice = _ticketPrice;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    function withdraw() public onlyOwner {
        uint256 balance = maintoken.balanceOf(address(this));
        require(maintoken.transfer(owner, balance), "Withdrawal failed");
    }

    function updatePrice(uint256 _newPrice) public onlyOwner {
        ticketPrice = _newPrice;
    }

    function buyTicketGasFree(
        address caller,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        bytes memory originalMessage = abi.encodePacked(ticketPrice, gasFreeOpCounter[caller]);
        bytes32 hashedMessage = keccak256(originalMessage);
        bytes32 prefixedHashMessage = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                hashedMessage
            )
        );
        address signer = ecrecover(prefixedHashMessage, _v, _r, _s);
        require(signer == caller, "snec");
        require(maintoken.transferFrom(signer, address(this), ticketPrice), "Transfer failed");

        ++gasFreeOpCounter[signer];
        ticketsBought[signer] += 1;
        emit TicketPurchased(signer, ticketPrice);
    }

    function buyTicketsGasFree(
        uint256 amount,
        address caller,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        bytes memory originalMessage = abi.encodePacked(amount, ticketPrice, gasFreeOpCounter[caller]);
        bytes32 hashedMessage = keccak256(originalMessage);
        bytes32 prefixedHashMessage = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                hashedMessage
            )
        );
        address signer = ecrecover(prefixedHashMessage, _v, _r, _s);
        require(signer == caller, "snec");
        require(maintoken.transferFrom(signer, address(this), amount * ticketPrice), "Transfer failed");

        ++gasFreeOpCounter[signer];
        ticketsBought[signer] += amount;
        emit TicketsPurchased(signer, ticketPrice, amount);
    }
}
