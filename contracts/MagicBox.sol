// SPDX-License-Identifier: Undefined

pragma solidity >=0.8.0;


import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

import "./Card.sol";

contract MagicBox is VRFConsumerBaseV2, Ownable, Pausable {
    using Counters for Counters.Counter;
    using Strings for uint256;

    struct Request {
        address initiator;
        ICard.CardRarity requestedRarity;
    }

    VRFCoordinatorV2Interface immutable COORDINATOR;
    uint64 public immutable s_subscriptionId;
    bytes32 public immutable s_keyHash;
    
    Card _card;
    mapping(uint256 => Request) public _requests;
    uint32 public _callbackGasLimit;
    uint16 _requestConfirmations;
    uint32 _probabilityVector; /* 4x8bit uints, each stores 0..100, [LEG][EPIC][RAR][COM] */

    function setPausedState(bool paused) external onlyOwner {
        if (paused) { _pause(); } else { _unpause(); }
    }

    function setCallbackGasLimit(uint32 newCallbackGasLimit) external onlyOwner {
        _callbackGasLimit = newCallbackGasLimit;
    }

    function setRequestConfirmations(uint16 newRequestConfirmations)
        external
        onlyOwner
    {
        _requestConfirmations = newRequestConfirmations;
    }

    function setProbability(uint32 probabilityVector)
        external
        onlyOwner
    {
        _probabilityVector = probabilityVector;
    }

    function getProbability(ICard.CardRarity rarity)
        public
        view
        returns (uint8)
    {
        return uint8(0xff & (_probabilityVector >> (8 * uint8(rarity))));
    }

    function openBox(ICard.CardRarity rarity)
        external
        payable
        whenNotPaused
    {
        uint256 boxPrice = getBoxPrice(rarity);
        require(
            rarity == ICard.CardRarity.Common ||
            rarity == ICard.CardRarity.Rare ||
            rarity == ICard.CardRarity.Epic ||
            rarity == ICard.CardRarity.Legendary
        );
        require(msg.value == boxPrice,
                string(abi.encodePacked("Not enough funds ",
                                        Strings.toString(msg.value),
                                        " vs. ",
                                        Strings.toString(boxPrice))));
        (bool sent, /* memory data */) = payable(address(_card)).call{value: msg.value}("");
        //_card.transfer(msg.value);
        require(sent, "Failed to send Matic");
        uint256 requestId = COORDINATOR.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            _requestConfirmations,
            _callbackGasLimit,
            1
        );

        _requests[requestId] = Request(msg.sender, rarity);
    }

    function openBoxFree(ICard.CardRarity rarity)
        external
        onlyOwner
        whenNotPaused
    {
        require(
            rarity == ICard.CardRarity.Common ||
            rarity == ICard.CardRarity.Rare ||
            rarity == ICard.CardRarity.Epic ||
            rarity == ICard.CardRarity.Legendary
        );

        uint256 requestId = COORDINATOR.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            _requestConfirmations,
            _callbackGasLimit,
            1
        );

        _requests[requestId] = Request(msg.sender, rarity);
    }


    function getBoxPrice(ICard.CardRarity rarity) public view returns (uint256) {
        return (100 + getProbability(rarity)) * _card.cardPrice(rarity) / 100;
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        require(_requests[requestId].initiator != address(0x0), "request not found");
        if (randomWords[0] % 100 < getProbability(_requests[requestId].requestedRarity)) {
            _card.freeMint(_requests[requestId].initiator, ICard.CardRarity(uint(_requests[requestId].requestedRarity) + 1));
        } else {
            _card.freeMint(_requests[requestId].initiator, _requests[requestId].requestedRarity);
        }
    }

    constructor(
        uint64 subscriptionId,
        address vfrCoordinator,
        uint32 callBackGaslimit,
        bytes32 keyHash,
        Card card
    ) VRFConsumerBaseV2(vfrCoordinator) {
        s_keyHash = keyHash;
        _callbackGasLimit = callBackGaslimit;
        COORDINATOR = VRFCoordinatorV2Interface(vfrCoordinator);
        s_subscriptionId = subscriptionId;
        _requestConfirmations = 3;
        _card = card;
    }
}
