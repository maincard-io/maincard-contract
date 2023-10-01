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

    event NewBet(
        address user,
        uint256 eventId,
        uint256 cardId,
        MatchResult choiceId,
        uint256 betId,
        uint256 potentialRewardMaintokens
    );
    event NewCall(
        address creator,
        uint256 eventId,
        uint256 cardId,
        ICard.CardRarity rarity,
        uint256 callId,
        MatchResult choiceId
    );
    event NewCall_v2(
        address creator,
        uint256 eventId,
        uint256 cardId,
        ICard.CardRarity rarity,
        uint256 callId,
        MatchResult choiceId,
        uint256 potentialRewardMaintokens
    );
    event CallAccepted(uint256 callId, address wallet, uint256 cardId);
    event CallAccepted_v2(
        uint256 callId,
        address wallet,
        uint256 cardId,
        MatchResult choiceId
    );
    event CardTakenFromBet(
        uint256 cardId,
        uint256 betId,
        uint256 maintokensReceived,
        bool takenAfterMatch
    );
    event CardTakenFromCall(uint256 cardId, address taker, uint256 callId);

    event EventCreated(uint256 eventId);
    event EventResultChanged(uint256 eventId, MatchResult result);
    // Events CallExpired/CallCompleted not needed at the moment.

    ICard card;
    mapping(uint256 => EventInfo) public eventInfos; // eventId -> EventInfo
    mapping(uint256 => BetInfo) public bets; // cardId -> BetInfo
    mapping(address => uint256[]) public betsByUser; // user->index->cardId
    mapping(address => mapping(uint256 => ICard.CardRarity[])) rarities; // NOT IN USE: user->eventId->rarity[], used to be used for not allowing 2 common cards to same event
    MainToken maintoken;

    CallInfo[] public calls;
    uint256 _betId;
    mapping(address => uint256[]) public callsByUser; // user->index->callId
    mapping(address => uint256) public gasFreeOpCounter;
    mapping(address => mapping(uint256 => uint256)) cardsOnABet; // user->eventId->counter

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
        require(!_eventExists(eventId), "AX");
        require(betsAcceptedUntilTs > block.timestamp, "EIP");
        eventInfos[eventId] = EventInfo(
            betsAcceptedUntilTs,
            descriptionHash,
            MatchResult.MatchIsInProgress
        );
        require(_eventExists(eventId), "E0");
        emit EventCreated(eventId);
    }

    function updateEvent(
        uint256 eventId,
        uint256 betsAcceptedUntilTs
    ) public onlyOwner {
        require(_eventExists(eventId), "ENE");
        require(
            eventInfos[eventId].result == MatchResult.MatchIsInProgress,
            "NIP"
        );
        eventInfos[eventId].betsAcceptedUntilTs = betsAcceptedUntilTs;
    }

    function _eventExists(uint256 eventId) internal view returns (bool) {
        return
            eventInfos[eventId].descriptionHash !=
            0x0000000000000000000000000000000000000000000000000000000000000000;
    }

    function eventExists(uint256 eventId) external view returns (bool) {
        return _eventExists(eventId);
    }

    function _validateBet(
        uint256 eventId,
        uint256 cardId,
        MatchResult choiceId,
        address txSigner
    ) internal view {
        require(
            card.ownerOf(cardId) == txSigner,
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
            choiceId == MatchResult.FirstWon ||
                choiceId == MatchResult.Draw ||
                choiceId == MatchResult.SecondWon,
            "Wrong choice"
        );
        require(cardsOnABet[txSigner][eventId] < 10, "Too much cards");
    }

    function makeBet(
        uint256 eventId,
        uint256 cardId,
        MatchResult choiceId
    ) public override {
        _makeBetCore(eventId, cardId, choiceId, msg.sender);
    }

    function makeBetsGasFree(
        uint256[] calldata eventIds,
        uint256[] calldata cardIds,
        MatchResult[] calldata choiceIds,
        address caller,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        bytes memory originalMessage = abi.encodePacked(
            gasFreeOpCounter[caller]
        );
        for (uint i = 0; i < eventIds.length; i++) {
            bytes memory encodedData = abi.encodePacked(
                eventIds[i],
                cardIds[i],
                choiceIds[i]
            );
            originalMessage = abi.encodePacked(originalMessage, encodedData);
        }
        bytes32 prefixedHashMessage = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(originalMessage)
            )
        );
        address signer = ecrecover(prefixedHashMessage, _v, _r, _s);
        require(signer == caller, "snec");
        ++gasFreeOpCounter[caller];
        for (uint256 i = 0; i < eventIds.length; ++i) {
            require(card.ownerOf(cardIds[i]) == signer, "nyc");
            _makeBetCore(eventIds[i], cardIds[i], choiceIds[i], signer);
        }
    }

    function _makeBetCore(
        uint256 eventId,
        uint256 cardId,
        MatchResult choiceId,
        address cardOwner
    ) internal {
        _validateBet(eventId, cardId, choiceId, cardOwner);

        bets[cardId] = BetInfo(eventId, choiceId, cardOwner, _betId);
        betsByUser[cardOwner].push(cardId);
        card.safeTransferFrom(cardOwner, address(this), cardId);
        ++cardsOnABet[cardOwner][eventId];

        emit NewBet(
            cardOwner,
            eventId,
            cardId,
            choiceId,
            _betId,
            card.rewardMaintokens(cardId)
        );
        unchecked {
            ++_betId;
        }
    }

    function massMakeBet(
        uint256[] calldata eventId,
        uint256[] calldata cardId,
        MatchResult[] calldata choiceId
    ) external {
        require(
            eventId.length == cardId.length && cardId.length == choiceId.length,
            "bl"
        );
        for (uint256 i = 0; i < eventId.length; ++i) {
            makeBet(eventId[i], cardId[i], choiceId[i]);
        }
    }

    function setEventResult(
        uint256 eventId,
        MatchResult resultChoiceId
    ) public override onlyOwner {
        // we used to have require(eventInfos[eventId].result == InProgress) here,
        // but faced a number of situations where results were updated.
        // Looks like it is what is it is. We have to accept that the world around
        // is not a pure functional programming.
        eventInfos[eventId].result = resultChoiceId;
        emit EventResultChanged(eventId, resultChoiceId);
    }

    function takeCard(uint256 cardId) public override {
        address originalOwner = bets[cardId].cardOwner;
        uint256 eventId = bets[cardId].eventId;
        MatchResult matchResult = eventInfos[eventId].result;
        if (matchResult != MatchResult.MatchIsInProgress) {
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
        } else if (block.timestamp <= eventInfos[eventId].betsAcceptedUntilTs) {
            // taking before the match begins.
            require(originalOwner == msg.sender, "Not Yours");
            _takeCard(cardId, PredictionResult.NotApplicable);
        } else {
            revert("Match is in progress");
        }
    }

    function massTakeCard(
        uint256 eventId,
        uint256[] calldata cardIds
    ) external {
        for (uint256 i = 0; i < cardIds.length; ++i) {
            BetInfo storage betInfo = bets[cardIds[i]];
            require(betInfo.eventId == eventId, "EventID mismatch");
            takeCard(cardIds[i]);
        }
    }

    // nothing is wrong with takeCard, it is safe actually. This method just makes it more CAS-like.
    function takeCardSafe(
        uint256 cardId,
        uint256 betId,
        bool onlyIfEventCompleted
    ) external {
        BetInfo storage betInfo = bets[cardId];
        require(
            betInfo.eventId != 0 && card.ownerOf(cardId) == address(this),
            "Card is not on Bet"
        );
        require(betInfo.betId == betId, "BetID mismatch");
        if (onlyIfEventCompleted) {
            require(
                eventInfos[betInfo.eventId].result !=
                    MatchResult.MatchIsInProgress,
                "Match is still in progress"
            );
        }
        takeCard(cardId);
    }

    function _takeCard(uint256 cardId, PredictionResult result) internal {
        address originalOwner = bets[cardId].cardOwner;
        uint256 betId = bets[cardId].betId;
        uint64 eventDate = uint64(
            eventInfos[bets[cardId].eventId].betsAcceptedUntilTs
        );
        if (cardsOnABet[originalOwner][bets[cardId].eventId] > 0) {
            --cardsOnABet[originalOwner][bets[cardId].eventId];
        }
        delete bets[cardId];

        uint256 myBetCount = betsByUser[originalOwner].length;
        if (myBetCount > 1) {
            for (uint256 i = 0; i < myBetCount - 1; ) {
                if (betsByUser[originalOwner][i] == cardId) {
                    betsByUser[originalOwner][i] = betsByUser[originalOwner][
                        myBetCount - 1
                    ];
                    betsByUser[originalOwner][myBetCount - 1] = cardId;
                    break;
                }
                unchecked {
                    ++i;
                }
            }
        }
        require(
            betsByUser[originalOwner][myBetCount - 1] == cardId,
            "Internal error"
        );
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

    function betsByAddressAndIndex(
        address owner,
        uint256 offset
    )
        external
        view
        returns (
            BetInfo[10] memory,
            uint256[10] memory,
            MatchResult[10] memory,
            uint256[10] memory
        )
    {
        BetInfo[10] memory usersBets;
        uint256[10] memory cardIds;
        MatchResult[10] memory results;
        uint256[10] memory betsAcceptedUntils;
        uint256 lastIndex = offset + 10;
        if (lastIndex > betsByUser[owner].length) {
            lastIndex = betsByUser[owner].length;
        }
        for (uint256 i = offset; i < lastIndex; ++i) {
            cardIds[i - offset] = betsByUser[owner][i];
            usersBets[i - offset] = bets[cardIds[i - offset]];
            results[i - offset] = eventInfos[usersBets[i - offset].eventId]
                .result;
            betsAcceptedUntils[i - offset] = eventInfos[
                usersBets[i - offset].eventId
            ].betsAcceptedUntilTs;
        }
        return (usersBets, cardIds, results, betsAcceptedUntils);
    }

    function callsByAddressCount(
        address owner
    ) external view returns (uint256) {
        return callsByUser[owner].length;
    }

    function callsByAddressAndIndex(
        address owner,
        uint256 offset
    )
        external
        view
        returns (
            uint256[10] memory callIds,
            uint256[10] memory,
            MatchResult[10] memory,
            MatchResult[10] memory,
            uint256[10] memory cardIds
        )
    {
        uint256[10] memory eventIds;
        MatchResult[10] memory choices;
        MatchResult[10] memory results;
        uint256 lastIndex = offset + 10;
        if (lastIndex > callsByUser[owner].length) {
            lastIndex = callsByUser[owner].length;
        }
        for (uint256 i = offset; i < lastIndex; ++i) {
            uint256 callId = callsByUser[owner][i];
            bool ownerIsFirst = calls[callId].firstParticipantAddress == owner;
            uint256 index = i - offset;
            callIds[index] = callId;
            eventIds[index] = calls[callId].eventId;
            cardIds[index] = ownerIsFirst
                ? calls[callId].firstParticipantCard
                : calls[callId].secondParticipantCard;
            choices[index] = ownerIsFirst
                ? calls[callId].choice
                : invertChoice(calls[callId].choice);
            results[index] = eventInfos[eventIds[index]].result;
        }
        return (callIds, eventIds, choices, results, cardIds);
    }

    function _validateCall(
        uint256 eventId,
        uint256 cardId,
        MatchResult choiceId,
        address txSigner
    ) internal view {
        require(
            choiceId == MatchResult.FirstWon ||
                choiceId == MatchResult.SecondWon,
            "You can only bet on winning of one team"
        );
        _validateBet(eventId, cardId, choiceId, txSigner);
    }

    function createCall(
        uint256 eventId,
        uint256 cardId,
        MatchResult choiceId
    ) external {
        _createCallCore(msg.sender, eventId, cardId, choiceId);
    }

    function createCallGasFree(
        uint256 eventId,
        uint256 cardId,
        MatchResult choiceId,
        address caller,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        bytes memory originalMessage = abi.encodePacked(
            gasFreeOpCounter[caller],
            eventId,
            cardId,
            choiceId
        );
        bytes32 prefixedHashMessage = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(originalMessage)
            )
        );
        address signer = ecrecover(prefixedHashMessage, _v, _r, _s);
        require(signer == caller, "snec");
        ++gasFreeOpCounter[caller];
        _createCallCore(signer, eventId, cardId, choiceId);
    }

    function _createCallCore(
        address sender,
        uint256 eventId,
        uint256 cardId,
        MatchResult choiceId
    ) internal {
        // Here is important to understand that the card could be approved by client to be used
        // in Arena contract. But we don't want anyone to be able to put someone else's card to a call.
        _validateCall(eventId, cardId, choiceId, sender);
        calls.push(
            CallInfo(
                eventId,
                choiceId,
                sender,
                cardId,
                address(0x0),
                0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
            )
        );
        card.safeTransferFrom(sender, address(this), cardId);
        callsByUser[sender].push(calls.length - 1);
        emit NewCall(
            sender,
            eventId,
            cardId,
            card.getRarity(cardId),
            calls.length - 1,
            choiceId
        );
        emit NewCall_v2(
            sender,
            eventId,
            cardId,
            card.getRarity(cardId),
            calls.length - 1,
            choiceId,
            card.rewardMaintokens(cardId)
        );
    }

    function acceptCall(uint256 callId, uint256 cardId) external {
        _acceptCallCore(callId, cardId, msg.sender);
    }

    function _acceptCallCore(
        uint256 callId,
        uint256 cardId,
        address sender
    ) internal {
        CallInfo storage thisCall = calls[callId];
        _validateCall(thisCall.eventId, cardId, thisCall.choice, sender);
        require(
            thisCall.firstParticipantAddress != address(0x0) &&
                thisCall.secondParticipantAddress == address(0x0),
            "Call does not exist or accepted"
        );
        require(
            thisCall.firstParticipantAddress != sender,
            "Can't accept your own call"
        );
        require(
            card.getRarity(cardId) ==
                card.getRarity(thisCall.firstParticipantCard),
            "Call should have same cards"
        );
        thisCall.secondParticipantAddress = sender;
        thisCall.secondParticipantCard = cardId;
        card.safeTransferFrom(sender, address(this), cardId);
        callsByUser[sender].push(callId);
        emit CallAccepted(callId, sender, cardId);
        emit CallAccepted_v2(
            callId,
            sender,
            cardId,
            invertChoice(thisCall.choice)
        );
    }

    function acceptCall(
        uint256 callId,
        uint256 cardId,
        MatchResult choice
    ) external {
        CallInfo storage thisCall = calls[callId];
        require(choice == invertChoice(thisCall.choice), "Wrong Choice");
        _acceptCallCore(callId, cardId, msg.sender);
    }

    function acceptCallGasFree(
        uint256 callId,
        uint256 cardId,
        MatchResult choice,
        address caller,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        bytes memory originalMessage = abi.encodePacked(
            gasFreeOpCounter[caller],
            callId,
            cardId,
            choice
        );
        bytes32 prefixedHashMessage = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(originalMessage)
            )
        );
        address signer = ecrecover(prefixedHashMessage, _v, _r, _s);
        require(signer == caller, "snec");
        ++gasFreeOpCounter[caller];
        CallInfo storage thisCall = calls[callId];
        require(choice == invertChoice(thisCall.choice), "Wrong Choice");
        _acceptCallCore(callId, cardId, signer);
    }

    function invertChoice(MatchResult r) internal pure returns (MatchResult) {
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
        thisCall
            .firstParticipantCard = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        address secondParticipantAddress = thisCall.secondParticipantAddress;
        thisCall.secondParticipantAddress = address(0x0);
        uint256 secondParticipantCard = thisCall.secondParticipantCard;
        thisCall
            .secondParticipantCard = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        uint64 fakeEventDate = 0; // As we don't use freezing for calls

        if (
            eventInfos[thisCall.eventId].result == MatchResult.Draw ||
            eventInfos[thisCall.eventId].result == MatchResult.MatchCancelled ||
            secondParticipantAddress == address(0x0)
        ) {
            emit CardTakenFromCall(
                firstParticipantCard,
                firstParticipantAddress,
                callId
            );
            card.safeTransferFrom(
                address(this),
                firstParticipantAddress,
                firstParticipantCard,
                abi.encode(PredictionResult.NotApplicable, fakeEventDate)
            );

            if (secondParticipantAddress != address(0x0)) {
                emit CardTakenFromCall(
                    secondParticipantCard,
                    secondParticipantAddress,
                    callId
                );
                card.safeTransferFrom(
                    address(this),
                    secondParticipantAddress,
                    secondParticipantCard,
                    abi.encode(PredictionResult.NotApplicable, fakeEventDate)
                );
            }
        } else if (
            (eventInfos[thisCall.eventId].result == thisCall.choice) ||
            (eventInfos[thisCall.eventId].result ==
                invertChoice(thisCall.choice))
        ) {
            address winner = (eventInfos[thisCall.eventId].result ==
                thisCall.choice)
                ? firstParticipantAddress
                : secondParticipantAddress;
            emit CardTakenFromCall(firstParticipantCard, winner, callId);
            emit CardTakenFromCall(secondParticipantCard, winner, callId);
            card.safeTransferFrom(
                address(this),
                winner,
                firstParticipantCard,
                abi.encode(PredictionResult.NotApplicable, fakeEventDate)
            );
            card.safeTransferFrom(
                address(this),
                winner,
                secondParticipantCard,
                abi.encode(PredictionResult.NotApplicable, fakeEventDate)
            );

            uint256 reward = winner == firstParticipantAddress
                ? card.rewardMaintokens(firstParticipantCard)
                : card.rewardMaintokens(secondParticipantCard);
            maintoken.mint(winner, reward);
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

    function getMyCallCards(
        address user
    ) public view returns (uint256[] memory) {
        uint256[] storage userCalls = callsByUser[user];
        uint256[] memory cardIds = new uint256[](userCalls.length);
        for (uint256 i = 0; i < userCalls.length; ++i) {
            cardIds[i] = calls[userCalls[i]].firstParticipantAddress == user
                ? calls[userCalls[i]].firstParticipantCard
                : calls[userCalls[i]].secondParticipantCard;
        }
        return cardIds;
    }

    function onERC721Received(
        address /* operator */,
        address /* from */,
        uint256 /* tokenId */,
        bytes calldata /* data */
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
