// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import "./Card.sol";
import "./MainToken.sol";

contract Auction is OwnableUpgradeable, IERC721ReceiverUpgradeable {
    event NewBet(address bettor, uint256 cardId, uint256 amount);

    struct AuctionInfo {
        address creator;
        uint256 betsAcceptedUntilTs;
        uint256 startingPrice;
        uint256 bestBet;
        address bestBettor;
    }
    struct MyBet {
        uint256 cardId;
        uint256 betsAcceptedUntilTs;  // works as auction's uuid, so that if bets[cardId] has a different betsAcceptedUntilTs - it is a different auction.
        uint256 amount;
        uint256 startingPrice;
    }
    mapping(uint256 => AuctionInfo) public bets;
    mapping(address => uint256[]) auctionsByUser;
    Card card;
    MainToken maintoken;
    mapping(address => MyBet[]) myBets;
    uint8 _commission;
    uint256 auctionId;
    mapping(uint256 => uint256) auctionIdByCardId;

    event AuctionCreated(uint256 auctionId, uint256 cardId);
    event AuctionCompleted(uint256 auctionId, uint256 cardId, address newOwner);

    function initialize() public initializer {
        __Ownable_init();
    }

    function setCardAddress(Card _card) external onlyOwner {
        card = _card;
    }
    function setMaintokenAddress(MainToken _maintoken) external onlyOwner {
        maintoken = _maintoken;
    }
    function setCommission(uint8 commission) external onlyOwner {
        _commission = commission;
    }

    function placeCardToAuction(uint256 cardId, uint256 startingPrice) public {
        card.safeTransferFrom(msg.sender, address(this), cardId);
        AuctionInfo storage thisAuction = bets[cardId];
        thisAuction.betsAcceptedUntilTs = block.timestamp + 48 * 3600;
        thisAuction.startingPrice = startingPrice;
        thisAuction.bestBet = 0;
        thisAuction.bestBettor = address(0x0);
        thisAuction.creator = msg.sender;
        auctionsByUser[msg.sender].push(cardId);
        ++auctionId;
        auctionIdByCardId[cardId] = auctionId;
        emit AuctionCreated(auctionId, cardId);
    }

    function placeBet(uint256 cardId, uint256 amount) public {
        AuctionInfo storage thisAuction = bets[cardId];
        require(block.timestamp <= thisAuction.betsAcceptedUntilTs, "TooLate");
        require(amount > thisAuction.startingPrice && amount > thisAuction.bestBet, "TooFew");
        if (thisAuction.bestBettor != address(0x0)) {
            require(maintoken.transfer(thisAuction.bestBettor, thisAuction.bestBet));
        }
        require(maintoken.transferFrom(msg.sender, address(this), amount));
        thisAuction.bestBet = amount;
        thisAuction.bestBettor = msg.sender;

        emit NewBet(msg.sender, cardId, amount);

        trimMyBets(msg.sender);
        myBets[msg.sender].push(MyBet(cardId, thisAuction.betsAcceptedUntilTs, amount, thisAuction.startingPrice));
    }

    function takeCard(uint256 cardId) public {
        AuctionInfo storage thisAuction = bets[cardId];
        require(block.timestamp > thisAuction.betsAcceptedUntilTs, "TooEarly");
        thisAuction.betsAcceptedUntilTs = 0;
        address receiver = thisAuction.bestBettor == address(0x0) ? thisAuction.creator : thisAuction.bestBettor;

        for (uint256 index = 0; index < auctionsByUser[thisAuction.creator].length - 1; ++index) {
            if (auctionsByUser[thisAuction.creator][index] == cardId) {
                auctionsByUser[thisAuction.creator][index] = auctionsByUser[thisAuction.creator][auctionsByUser[thisAuction.creator].length - 1]; 
                auctionsByUser[thisAuction.creator][auctionsByUser[thisAuction.creator].length - 1] = cardId;
            }
        }
        require(auctionsByUser[thisAuction.creator][auctionsByUser[thisAuction.creator].length - 1] == cardId, "InternalError");
        auctionsByUser[thisAuction.creator].pop();

        card.safeTransferFrom(address(this), receiver, cardId);
        require(maintoken.transfer(thisAuction.creator, thisAuction.bestBet * (100 - _commission) / 100));
        thisAuction.bestBet = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        thisAuction.startingPrice = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        thisAuction.bestBettor = address(0x0);
        thisAuction.creator = address(0x0);

        emit AuctionCompleted(auctionIdByCardId[cardId], cardId, receiver);
    }

    function auctionsForUser(address user, uint256 offset) view public returns (uint256[10] memory cardIds, uint256[10] memory bestBets, uint256[10] memory untils, uint256[10] memory startingPrices) {
        uint256 lastElement = offset + 10;
        if (lastElement > auctionsByUser[user].length) {
            lastElement = auctionsByUser[user].length;
        }
        for (uint256 index = offset; index < lastElement; ++index) {
            require(bets[auctionsByUser[user][index]].creator == user, "InternalError2");
            cardIds[index-offset] = auctionsByUser[user][index];
            bestBets[index-offset] = bets[cardIds[index-offset]].bestBet;
            untils[index-offset] = bets[cardIds[index-offset]].betsAcceptedUntilTs;
            startingPrices[index-offset]= bets[cardIds[index-offset]].startingPrice;
        }
    }

    function betsForUser(address user, uint256 offset) view public returns (uint256[10] memory cardIds, uint256[10] memory amounts, uint256[10] memory untils, uint256[10] memory startingPrices) {
        uint256 lastElement = offset + 10;
        if (lastElement > myBets[user].length) {
            lastElement = myBets[user].length;
        }
        for (uint256 index = offset; index < lastElement; ++index) {
            cardIds[index-offset] = myBets[user][index].cardId;
            amounts[index-offset] = myBets[user][index].amount;
            untils[index-offset] = myBets[user][index].betsAcceptedUntilTs;
            startingPrices[index-offset]= myBets[user][index].startingPrice;
        }
    }

    function trimMyBets(address user) public {
        if (myBets[user].length > 50) {
            uint256 itemsToRemove = 10;
            for (uint256 i = itemsToRemove; i < myBets[user].length; ++i) {
                myBets[user][i - itemsToRemove] = myBets[user][i];
            }
            for (uint256 i = 0; i < itemsToRemove; ++i) {
                myBets[user].pop();
            }
        }
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) public pure returns(bytes4) {
        return
             bytes4(
                keccak256("onERC721Received(address,address,uint256,bytes)")
             );
    }
}
