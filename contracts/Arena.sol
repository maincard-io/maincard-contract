// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./IArena.sol";
import "./ICard.sol";
import "./MainToken.sol";

contract Arena is IArena, OwnableUpgradeable {
    struct EventInfo {
        uint256 betsAcceptedUntilTs;
        bytes32 descriptionHash;
        MatchResult result;
    }
    struct BetInfo {
        uint256 eventId;
        MatchResult choice;
        address cardOwner;
        uint256 betId;
    }

    struct CallInfo {
        uint256 eventId;
        MatchResult choice;
        address firstParticipantAddress;
        uint256 firstParticipantCard;
        address secondParticipantAddress;
        uint256 secondParticipantCard;
    }

    event NewBet(address user, uint256 eventId, uint256 cardId, MatchResult choiceId, uint256 betId, uint256 potentialRewardMaintokens);
    event NewCall(address creator, uint256 eventId, uint256 cardId, ICard.CardRarity rarity, uint256 callId, MatchResult choiceId);
    event CallAccepted(uint256 callId, address wallet, uint256 cardId);
    event CardTakenFromBet(uint256 cardId, uint256 betId, uint256 maintokensReceived, bool takenAfterMatch);
    event CardTakenFromCall(uint256 cardId, address taker, uint256 callId);
    // Events CallExpired/CallCompleted not needed at the moment.

    ICard card;
    mapping(uint256 => EventInfo) public eventInfos;  // eventId -> EventInfo
    mapping(uint256 => BetInfo) public bets; // cardId -> BetInfo
    mapping(address => uint256[]) public betsByUser; // user->index->cardId
    mapping(address => mapping(uint256 => ICard.CardRarity[])) rarities; // user->eventId->rarity[]
    MainToken maintoken;

    CallInfo[] public calls;
    uint256 _betId;

    function initialize() public initializer {
        __Ownable_init();
    }

    function setCardAddress(ICard _card) public onlyOwner {
        card = _card;
    }

    function setMainToken(MainToken _maintoken) public onlyOwner {
        maintoken = _maintoken;
    }    

    function createEvent(
        uint256 eventId,
        uint256 betsAcceptedUntilTs,
        bytes32 descriptionHash
    ) public override onlyOwner {
        require(!_eventExists(eventId), "Event already exists");
        require(betsAcceptedUntilTs > block.timestamp, "Event is in the past");
        eventInfos[eventId] = EventInfo(
            betsAcceptedUntilTs,
            descriptionHash,
            MatchResult.MatchIsInProgress
        );
        require(_eventExists(eventId));
    }

    function _eventExists(uint256 eventId) internal view returns (bool) {
        return
            eventInfos[eventId].descriptionHash !=
            0x0000000000000000000000000000000000000000000000000000000000000000;
    }
    function eventExists(uint256 eventId) external view returns (bool) {
        return _eventExists(eventId);
    }

    function _validateBet(uint256 eventId, uint256 cardId, MatchResult choiceId) internal view {
        require(
            card.ownerOf(cardId) == msg.sender,
            "You can not bet by not your card"
        );
        require(
            block.timestamp < eventInfos[eventId].betsAcceptedUntilTs,
            "Too late"
        );
        require(
            eventInfos[eventId].result == MatchResult.MatchIsInProgress,
            "Match is finished or cancelled"
        );
        require(
            card.livesRemaining(cardId) > 0,
            "You can not bet with a card with 0 lives remaining"
        );
        require(
            choiceId == MatchResult.FirstWon || choiceId == MatchResult.SecondWon,
            "You can only bet on winning of one team"
        );
    }

    function makeBet(
        uint256 eventId,
        uint256 cardId,
        MatchResult choiceId
    ) public override {
        _validateBet(eventId, cardId, choiceId);
        ICard.CardRarity thisCardRarity = card.getRarity(cardId);
        if (thisCardRarity == ICard.CardRarity.Common || thisCardRarity == ICard.CardRarity.Rare) {
            uint32 amountOfLowLevelCards = 0;
            for (uint32 i = 0; i < rarities[msg.sender][eventId].length; ++i) {
                ICard.CardRarity rarity = rarities[msg.sender][eventId][i];
                if (rarity == ICard.CardRarity.Common || rarity == ICard.CardRarity.Rare) {
                    ++amountOfLowLevelCards;
                }
            }
            require(amountOfLowLevelCards == 0, "You can have only one Common or Rare card on the arena");
        }

        bets[cardId] = BetInfo(eventId, choiceId, msg.sender, _betId);
        betsByUser[msg.sender].push(cardId);
        rarities[msg.sender][eventId].push(thisCardRarity);
        card.safeTransferFrom(msg.sender, address(this), cardId);

        emit NewBet(msg.sender, eventId, cardId, choiceId, _betId, card.rewardMaintokens(cardId));
        unchecked { ++_betId; }
    }

    function setEventResult(uint256 eventId, MatchResult resultChoiceId)
        public
        override
        onlyOwner
    {
        eventInfos[eventId].result = resultChoiceId;
    }

    function takeCard(uint256 cardId) public override {
        uint256 eventId = bets[cardId].eventId;
        address originalOwner = bets[cardId].cardOwner;
        MatchResult matchResult = eventInfos[eventId].result;
        if (block.timestamp <= eventInfos[eventId].betsAcceptedUntilTs) {
            // taking before the match begins.
            _takeCard(cardId, PredictionResult.NotApplicable);
            for (uint32 i = 0; i < rarities[originalOwner][eventId].length - 1; ++i) {
                ICard.CardRarity rarity = rarities[originalOwner][eventId][i];
                if (rarity == card.getRarity(cardId)) {
                    rarities[originalOwner][eventId][i] = rarities[originalOwner][eventId][rarities[originalOwner][eventId].length - 1];
                    break;
                }
            }
            rarities[originalOwner][eventId].pop();
        } else if (matchResult != MatchResult.MatchIsInProgress) {
            _takeCard(
                cardId,
                (matchResult == MatchResult.MatchCancelled)
                    ? PredictionResult.NotApplicable
                    : (
                        (matchResult == bets[cardId].choice)
                            ? PredictionResult.Success
                            : PredictionResult.Failure
                    )
            );
        } else {
            revert("Match is in progress");
        }
    }

    // nothing is wrong with takeCard, it is safe actually. This method just makes it more CAS-like.
    function takeCardSafe(uint256 cardId, uint256 betId, bool onlyIfEventCompleted) external {
        BetInfo storage betInfo = bets[cardId];
        require(betInfo.eventId != 0 && card.ownerOf(cardId) == address(this), "Card is not on Bet");
        require(betInfo.betId == betId, "BetID mismatch");
        if (onlyIfEventCompleted) {
            require(eventInfos[betInfo.eventId].result != MatchResult.MatchIsInProgress, "Match is still in progress");
        }
        takeCard(cardId);
    }

    function _takeCard(uint256 cardId, PredictionResult result) internal {
        address originalOwner = bets[cardId].cardOwner;
        uint256 betId = bets[cardId].betId;
        uint64 eventDate = uint64(eventInfos[bets[cardId].eventId].betsAcceptedUntilTs);
        delete bets[cardId];

        uint256 myBetCount = betsByUser[originalOwner].length;
        if (myBetCount > 1) {
            for (uint256 i = 0; i < myBetCount-1; ) {
                if (betsByUser[originalOwner][i] == cardId) {
                    betsByUser[originalOwner][i] = betsByUser[originalOwner][myBetCount-1];
                    betsByUser[originalOwner][myBetCount-1] = cardId;
                    break;
                }
                unchecked { ++i; }
            }
        }
        require(betsByUser[originalOwner][myBetCount-1] == cardId, "Internal error");
        betsByUser[originalOwner].pop();

        card.safeTransferFrom(
            address(this),
            originalOwner,
            cardId,
            abi.encode(result, eventDate)
        );

        if (result == PredictionResult.Success) {
            uint256 reward = card.rewardMaintokens(cardId);
            maintoken.mint(originalOwner, reward);
            emit CardTakenFromBet(cardId, betId, reward, true);
        } else if (result == PredictionResult.Failure) {
            emit CardTakenFromBet(cardId, betId, 0, true);
        } else if (result == PredictionResult.NotApplicable) {
            emit CardTakenFromBet(cardId, betId, 0, false);
        }
    }

    function betsByAddressCount(address owner) external view returns (uint256) {
        return betsByUser[owner].length;
    }
    function betsByAddressAndIndex(address owner, uint256 offset) external view returns (BetInfo[10] memory, uint256[10] memory, MatchResult[10] memory) {
        BetInfo[10] memory usersBets;
        uint256[10] memory cardIds;
        MatchResult[10] memory results;
	    uint256 lastIndex = offset + 10;
        if (lastIndex > betsByUser[owner].length) {
            lastIndex = betsByUser[owner].length;
        }
        for (uint256 i = offset; i < lastIndex; ++i) {
            cardIds[i-offset] = betsByUser[owner][i];
            usersBets[i-offset] = bets[cardIds[i-offset]];
            results[i-offset] = eventInfos[usersBets[i-offset].eventId].result;
        }
        return (usersBets, cardIds, results);
    }

    function createCall(uint256 eventId, uint256 cardId, MatchResult choiceId) public {
        // Here is important to understand that the card could be approved by client to be used
        // in Arena contract. But we don't want anyone to be able to put someone else's card to a call.
        _validateBet(eventId, cardId, choiceId);
        calls.push(CallInfo(eventId, choiceId, msg.sender, cardId, address(0x0), 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff));
        card.safeTransferFrom(msg.sender, address(this), cardId);
        emit NewCall(msg.sender, eventId, cardId, card.getRarity(cardId), calls.length - 1, choiceId);
    }

    function acceptCall(uint256 callId, uint256 cardId) public {
        CallInfo storage thisCall = calls[callId];
        _validateBet(thisCall.eventId, cardId, thisCall.choice);
        require(thisCall.firstParticipantAddress != address(0x0) && thisCall.secondParticipantAddress == address(0x0), "Call does not exist or accepted");
        require(card.getRarity(cardId) == card.getRarity(thisCall.firstParticipantCard), "Call should have same cards");
        thisCall.secondParticipantAddress = msg.sender;
        thisCall.secondParticipantCard = cardId;
        card.safeTransferFrom(msg.sender, address(this), cardId);
        emit CallAccepted(callId, msg.sender, cardId);
    }

    function invertChoice(MatchResult r) pure internal returns(MatchResult) {
        if (r == MatchResult.FirstWon) return MatchResult.SecondWon;
        if (r == MatchResult.SecondWon) return MatchResult.FirstWon;
        revert("Irreversable choice");
    }

    function claimCall(uint256 callId) public {
        CallInfo storage thisCall = calls[callId];
        if (eventInfos[thisCall.eventId].result == MatchResult.Draw || eventInfos[thisCall.eventId].result == MatchResult.MatchCancelled || thisCall.secondParticipantAddress == address(0x0)) {
            if (msg.sender == thisCall.firstParticipantAddress) {
                thisCall.firstParticipantAddress = address(0x0);
                card.safeTransferFrom(address(this), msg.sender, thisCall.firstParticipantCard, abi.encode(PredictionResult.NotApplicable));
                emit CardTakenFromCall(thisCall.firstParticipantCard, msg.sender, callId);
                thisCall.firstParticipantCard = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
            } else if (msg.sender == thisCall.secondParticipantAddress) {
                thisCall.secondParticipantAddress = address(0x0);
                emit CardTakenFromCall(thisCall.secondParticipantCard, msg.sender, callId);
                card.safeTransferFrom(address(this), msg.sender, thisCall.secondParticipantCard, abi.encode(PredictionResult.NotApplicable));
                thisCall.secondParticipantCard = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
            }
        } else if (
            (eventInfos[thisCall.eventId].result == thisCall.choice && msg.sender == thisCall.firstParticipantAddress) ||
            (eventInfos[thisCall.eventId].result == invertChoice(thisCall.choice) && msg.sender == thisCall.secondParticipantAddress)
        ) {
            thisCall.firstParticipantAddress = address(0x0);
            thisCall.secondParticipantAddress = address(0x0);
            emit CardTakenFromCall(thisCall.firstParticipantCard, msg.sender, callId);
            emit CardTakenFromCall(thisCall.secondParticipantCard, msg.sender, callId);
            card.safeTransferFrom(address(this), msg.sender, thisCall.firstParticipantCard, abi.encode(PredictionResult.NotApplicable));
            card.safeTransferFrom(address(this), msg.sender, thisCall.secondParticipantCard, abi.encode(PredictionResult.NotApplicable));
            thisCall.firstParticipantCard = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
            thisCall.secondParticipantCard = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        } else {
            revert("Call is not claimable");
        }
    }

    function onERC721Received(
        address, /* operator */
        address, /* from */
        uint256, /* tokenId */
        bytes calldata /* data */
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
