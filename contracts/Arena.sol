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
    event CallAccepted_v2(uint256 callId, address wallet, uint256 cardId, MatchResult choiceId);
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
    mapping(address => uint256[]) public callsByUser;  // user->index->cardId

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
            choiceId == MatchResult.FirstWon || choiceId == MatchResult.Draw || choiceId == MatchResult.SecondWon,
            "Wrong choice"
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

    function massMakeBet(uint256[] calldata eventId, uint256[] calldata cardId, MatchResult[] calldata choiceId) external {
        require(eventId.length == cardId.length && cardId.length == choiceId.length, "bl");
        for (uint256 i = 0; i < eventId.length; ++i) {
            makeBet(eventId[i], cardId[i], choiceId[i]);
        }
    }

    function setEventResult(uint256 eventId, MatchResult resultChoiceId)
        public
        override
        onlyOwner
    {
        eventInfos[eventId].result = resultChoiceId;
    }

    function takeCard(uint256 cardId) public override {
        address originalOwner = bets[cardId].cardOwner;
        uint256 eventId = bets[cardId].eventId;
        MatchResult matchResult = eventInfos[eventId].result;
        if (block.timestamp <= eventInfos[eventId].betsAcceptedUntilTs) {
            // taking before the match begins.
            require(originalOwner == msg.sender, "Not Yours");
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

    function massTakeCard(uint256 eventId, uint256[] calldata cardIds) external {
        for (uint256 i = 0; i < cardIds.length; ++i) {
            BetInfo storage betInfo = bets[cardIds[i]];
            require (betInfo.eventId == eventId, "EventID mismatch");
            takeCard(cardIds[i]);
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
    function betsByAddressAndIndex(address owner, uint256 offset) external view returns (BetInfo[10] memory, uint256[10] memory, MatchResult[10] memory, uint256[10] memory) {
        BetInfo[10] memory usersBets;
        uint256[10] memory cardIds;
        MatchResult[10] memory results;
        uint256[10] memory betsAcceptedUntils;
	    uint256 lastIndex = offset + 10;
        if (lastIndex > betsByUser[owner].length) {
            lastIndex = betsByUser[owner].length;
        }
        for (uint256 i = offset; i < lastIndex; ++i) {
            cardIds[i-offset] = betsByUser[owner][i];
            usersBets[i-offset] = bets[cardIds[i-offset]];
            results[i-offset] = eventInfos[usersBets[i-offset].eventId].result;
            betsAcceptedUntils[i-offset] = eventInfos[usersBets[i-offset].eventId].betsAcceptedUntilTs;
        }
        return (usersBets, cardIds, results, betsAcceptedUntils);
    }

    function callsByAddressCount(address owner) external view returns (uint256) {
        return callsByUser[owner].length;
    }
    function callsByAddressAndIndex(address owner, uint256 offset) external view returns (uint256[10] memory, uint256[10] memory, MatchResult[10] memory, MatchResult[10] memory) {
        uint256[10] memory cardIds;
        uint256[10] memory eventIds;
        MatchResult[10] memory choices;
        MatchResult[10] memory results;
	    uint256 lastIndex = offset + 10;
        if (lastIndex > callsByUser[owner].length) {
            lastIndex = callsByUser[owner].length;
        }
        for (uint256 i = offset; i < lastIndex; ++i) {
            cardIds[i-offset] = callsByUser[owner][i];
            eventIds[i-offset] = calls[cardIds[i-offset]].eventId;
            choices[i-offset] = 
                (calls[cardIds[i-offset]].firstParticipantAddress == owner && 
                    calls[cardIds[i-offset]].firstParticipantCard == cardIds[i-offset])
                ? calls[cardIds[i-offset]].choice
                : invertChoice(calls[cardIds[i-offset]].choice);
            results[i-offset] = eventInfos[eventIds[i-offset]].result;
        }
        return (cardIds, eventIds, choices, results);
    }

    function _validateCall(uint256 eventId, uint256 cardId, MatchResult choiceId) internal view {
        require(
            choiceId == MatchResult.FirstWon || choiceId == MatchResult.SecondWon,
            "You can only bet on winning of one team"
        );
        _validateBet(eventId, cardId, choiceId);
    }

    function createCall(uint256 eventId, uint256 cardId, MatchResult choiceId) external {
        // Here is important to understand that the card could be approved by client to be used
        // in Arena contract. But we don't want anyone to be able to put someone else's card to a call.
        _validateCall(eventId, cardId, choiceId);
        calls.push(CallInfo(eventId, choiceId, msg.sender, cardId, address(0x0), 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff));
        card.safeTransferFrom(msg.sender, address(this), cardId);
        callsByUser[msg.sender].push(calls.length - 1);
        emit NewCall(msg.sender, eventId, cardId, card.getRarity(cardId), calls.length - 1, choiceId);
    }

    function acceptCall(uint256 callId, uint256 cardId) external {
        CallInfo storage thisCall = calls[callId];
        _validateCall(thisCall.eventId, cardId, thisCall.choice);
        require(thisCall.firstParticipantAddress != address(0x0) && thisCall.secondParticipantAddress == address(0x0), "Call does not exist or accepted");
        require(card.getRarity(cardId) == card.getRarity(thisCall.firstParticipantCard), "Call should have same cards");
        thisCall.secondParticipantAddress = msg.sender;
        thisCall.secondParticipantCard = cardId;
        card.safeTransferFrom(msg.sender, address(this), cardId);
        callsByUser[msg.sender].push(callId);
        emit CallAccepted(callId, msg.sender, cardId);
        emit CallAccepted_v2(callId, msg.sender, cardId, invertChoice(thisCall.choice));
    }

    function invertChoice(MatchResult r) pure internal returns(MatchResult) {
        if (r == MatchResult.FirstWon) return MatchResult.SecondWon;
        if (r == MatchResult.SecondWon) return MatchResult.FirstWon;
        revert("Irreversable choice");
    }

    function claimCall(uint256 callId) public {
        CallInfo storage thisCall = calls[callId];
        _removeCallFromUser(thisCall.firstParticipantAddress, callId);
        if (thisCall.secondParticipantAddress != address(0x0)) {
            _removeCallFromUser(thisCall.secondParticipantAddress, callId);
        }
        address firstParticipantAddress = thisCall.firstParticipantAddress;
        thisCall.firstParticipantAddress = address(0x0);
        uint256 firstParticipantCard = thisCall.firstParticipantCard;
        thisCall.firstParticipantCard = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        address secondParticipantAddress = thisCall.secondParticipantAddress;
        thisCall.secondParticipantAddress = address(0x0);
        uint256 secondParticipantCard = thisCall.secondParticipantCard;
        thisCall.secondParticipantCard = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

        if (eventInfos[thisCall.eventId].result == MatchResult.Draw || eventInfos[thisCall.eventId].result == MatchResult.MatchCancelled || thisCall.secondParticipantAddress == address(0x0)) {
            emit CardTakenFromCall(firstParticipantCard, firstParticipantAddress, callId);
            card.safeTransferFrom(address(this), firstParticipantAddress, firstParticipantCard, abi.encode(PredictionResult.NotApplicable));

            if (secondParticipantAddress != address(0x0)) {
                emit CardTakenFromCall(secondParticipantCard, secondParticipantAddress, callId);
                card.safeTransferFrom(address(this), secondParticipantAddress, secondParticipantCard, abi.encode(PredictionResult.NotApplicable));
            }
        } else if (
            (eventInfos[thisCall.eventId].result == thisCall.choice) ||
            (eventInfos[thisCall.eventId].result == invertChoice(thisCall.choice))
        ) {
            address winner = (eventInfos[thisCall.eventId].result == thisCall.choice) ? firstParticipantAddress : secondParticipantAddress;
            emit CardTakenFromCall(firstParticipantCard, winner, callId);
            emit CardTakenFromCall(secondParticipantCard, winner, callId);
            card.safeTransferFrom(address(this), winner, firstParticipantCard, abi.encode(PredictionResult.NotApplicable));
            card.safeTransferFrom(address(this), winner, secondParticipantCard, abi.encode(PredictionResult.NotApplicable));
        } else {
            revert("Call is not claimable");
        }
    }

    function _removeCallFromUser(address user, uint256 callId) internal {
        uint256[] storage userCalls = callsByUser[user];
        for (uint256 i = 0; i < userCalls.length; ++i) {
            if (userCalls[i] == callId) {
                userCalls[i] = userCalls[userCalls.length - 1];
                userCalls.pop();
                return;
            }
        }
        revert("Call not found");
    }

    function getMyCallCards(address user) public view returns (uint256[] memory) {
        uint256[] storage userCalls = callsByUser[user];
        uint256[] memory cardIds = new uint256[](userCalls.length);
        for (uint256 i = 0; i < userCalls.length; ++i) {
            cardIds[i] = calls[userCalls[i]].firstParticipantAddress == user ? calls[userCalls[i]].firstParticipantCard : calls[userCalls[i]].secondParticipantCard;
        }
        return cardIds;
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
