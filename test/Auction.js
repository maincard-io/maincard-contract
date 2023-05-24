const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

const Regular = 0;

describe("Auction tests", () => {
    let card, auction, maticAuction, maintoken;
    let admin, alice, bob, carl;

    let mintNewCard, placeCard, placeCardToMaticAuction,
                     takeCard, takeCardFromMaticAuction,
                     placeBet, placeBetToMaticAuction;

    before(async () => {
        [admin, alice, bob, carl] = await ethers.getSigners();

        const Card = await ethers.getContractFactory("Card");
        const Maintoken = await ethers.getContractFactory("FreeToken");
        const Auction = await ethers.getContractFactory("MaintokenAuction");
        const MaticAuction = await ethers.getContractFactory("MaticAuction")

        card = await upgrades.deployProxy(Card);
        maintoken = await Maintoken.deploy();
        auction = await upgrades.deployProxy(Auction);
        maticAuction = await upgrades.deployProxy(MaticAuction);

        await auction.setMaintokenAddress(maintoken.address);
        await maintoken.mint(alice.address, "10000000000000000000000000")
        await maintoken.mint(bob.address, "10000000000000000000000000")
        await maintoken.mint(carl.address, "10000000000000000000000000")

        const MINTER_ROLE = await card.MINTER_ROLE();
        await card.grantRole(MINTER_ROLE, admin.address);

        const PRICE_MANAGER_ROLE = await card.PRICE_MANAGER_ROLE();
        await card.grantRole(PRICE_MANAGER_ROLE, admin.address);

        const ARENA_CHANGER_ROLE = await card.ARENA_CHANGER_ROLE();
        await card.grantRole(ARENA_CHANGER_ROLE, admin.address);

        await card.setAuctionAddress(auction.address);

        await auction.setCardAddress(card.address);
        await maticAuction.setCardAddress(card.address);

        await auction.setCommission(5)
        await maticAuction.setCommission(4)

        await card.setTokenPrice("10000000000000000000", 0);
        await card.setTokenPrice("100000000000000000000", 1);
        await card.setTokenPrice("1000000000000000000000", 2);
        await card.setTokenPrice("10000000000000000000000", 3);

        mintNewCard = async (to) => {
            const buyTx = await card.connect(to).mint(Regular, { value: "10000000000000000000" });
            const effects = await buyTx.wait();
            expect(effects.events.filter(e => e.event === "Transfer")).length.above(0);
            return effects.events.filter(e => e.event === "Transfer")[0].args[2];
        };

        placeCard = async (cardId, signer, minPrice = "0", currency = "MCN") => {
            await card.connect(signer).approve(auction.address, cardId);
            await auction.connect(signer).placeCardToAuction(cardId, minPrice, currency);
        };

        placeCardToMaticAuction = async (cardId, signer, minPrice = "0", currency = "MATIC") => {
            await card.connect(signer).approve(maticAuction.address, cardId);
            await maticAuction.connect(signer).placeCardToAuction(cardId, minPrice, currency);
        }

        placeBet = async (cardId, signer, price, currency = "MCN") => {
            const betTx = await auction.connect(signer).placeBet(cardId, price, currency);
            await betTx.wait();
        };

        placeBetToMaticAuction = async (cardId, signer, price, currency = "MATIC") => {
            await maticAuction.connect(signer).placeBet(cardId, price, {value: price}, currency);
        }

        takeCard = async (cardId, signer) => {
            await auction.connect(signer).takeCard(cardId);
        };

        takeCardFromMaticAuction = async (cardId, signer) => {
            await maticAuction.connect(signer).takeCard(cardId);
        };

    });

    it("Bob can place card and take it if no bets in 48 hours", async () => {
        const cardId = await mintNewCard(bob);
        const cardOwner = await card.ownerOf(cardId);
        expect(cardOwner).to.be.equal(bob.address);

        await placeCard(cardId, bob);
        const currency = "MCN";
        const cardOwnerAfterSendingToAuc = await card.ownerOf(cardId);
        expect(cardOwnerAfterSendingToAuc).to.be.equal(auction.address, currency);

        // he can not take it immediately
        await expect(takeCard(cardId, bob, currency)).to.be.revertedWith("TooEarly");

        await ethers.provider.send('evm_increaseTime', [48 * 3600 + 5]);
        await ethers.provider.send('evm_mine');

        // now he can
        await takeCard(cardId, bob, currency)
        const cardOwnerAfterTakingFromAuc = await card.ownerOf(cardId, currency);
        expect(cardOwnerAfterTakingFromAuc).to.be.equal(bob.address);

        // And can place it again
        await placeCard(cardId, bob);
        const cardOwnerAfterSendingToAucSecondTime = await card.ownerOf(cardId, currency);
        expect(cardOwnerAfterSendingToAucSecondTime).to.be.equal(auction.address);
    });

    it("Alice can make a bet on Bobs card", async () => {
        const cardId = await mintNewCard(bob);
        await placeCard(cardId, bob, "100");

        await maintoken.connect(alice).approve(auction.address, 120)
        await maintoken.connect(carl).approve(auction.address, 125)

        await expect(placeBet(cardId, alice, "50")).to.be.revertedWith("TooFew");
        await placeBet(cardId, alice, "120");
        await expect(placeBet(cardId, carl, "115")).to.be.revertedWith("TooFew");
        await placeBet(cardId, carl, "125");

        // she cant take it immediately.
        await expect(takeCard(cardId, alice)).to.be.revertedWith("TooEarly");
        // bob cant take it back;
        await expect(takeCard(cardId, bob)).to.be.revertedWith("TooEarly");

        await ethers.provider.send('evm_increaseTime', [48 * 3600 + 5]);
        await ethers.provider.send('evm_mine');

        // even it bob tries to take it back, it is sent to carl
        const bobsBalanceBeforeTakingCard = await maintoken.balanceOf(bob.address)
        await takeCard(cardId, bob)
        const bobsBalanceAfterTakingCard = await maintoken.balanceOf(bob.address)
        expect(bobsBalanceAfterTakingCard.sub(bobsBalanceBeforeTakingCard).toString()).to.be.equal("118")
        const cardOwnerAfterTakingFromAuc = await card.ownerOf(cardId);
        expect(cardOwnerAfterTakingFromAuc).to.be.equal(carl.address);
    });

    it("Testing Auction with Matic", async () => {
        const cardId = await mintNewCard(bob);
        await placeCardToMaticAuction(cardId, bob, ethers.utils.parseEther("0.1"), currency);

        await expect(placeBetToMaticAuction(cardId, alice, ethers.utils.parseEther("0.05"), currency)).to.be.revertedWith("TooFew");
        const aliceBalanceBeforeBet = await alice.provider.getBalance(alice.address);
        await placeBetToMaticAuction(cardId, alice, ethers.utils.parseEther("0.12"));
        const aliceBalanceAfterBet = await alice.provider.getBalance(alice.address);
        expect(aliceBalanceAfterBet.sub(aliceBalanceBeforeBet).valueOf()).to.be.closeTo(-120000000000000000n, 1000000000000000n)

        await expect(placeBetToMaticAuction(cardId, carl, ethers.utils.parseEther("0.11"), currency = "MATIC")).to.be.revertedWith("TooFew");
        await placeBetToMaticAuction(cardId, carl, ethers.utils.parseEther("0.15"), currency = "MATIC");
        const aliceBalanceAfterRefund = await alice.provider.getBalance(alice.address);
        expect(aliceBalanceAfterRefund.sub(aliceBalanceBeforeBet).valueOf()).to.be.closeTo(0n, 2000000000000000n)

        await ethers.provider.send('evm_increaseTime', [48 * 3600 + 5]);
        await ethers.provider.send('evm_mine');

        // even it bob tries to take it back, it is sent to carl
        await takeCardFromMaticAuction(cardId, bob)
        const cardOwnerAfterTakingFromAuc = await card.ownerOf(cardId);
        expect(cardOwnerAfterTakingFromAuc).to.be.equal(carl.address);
    })
});
