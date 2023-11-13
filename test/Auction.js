const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

const Regular = 0;

describe("Auction tests", () => {
    let card, auction, maticAuction, maintoken, oldAuction;
    let admin, alice, bob, carl;

    let mintNewCard, placeCard, placeCardToMaticAuction,
        takeCard, takeCardFromMaticAuction,
        placeBet, placeBetToMaticAuction;

    before(async () => {
        [admin, alice, bob, carl] = await ethers.getSigners();

        const Card = await ethers.getContractFactory("Card");
        const Maintoken = await ethers.getContractFactory("FreeToken");
        const Auction = await ethers.getContractFactory("MaintokenAuction");
        const MaticAuction = await ethers.getContractFactory("MaticAuction");
        const OldAuction = await ethers.getContractFactory("Auction");

        card = await upgrades.deployProxy(Card);
        maintoken = await Maintoken.deploy();
        auction = await upgrades.deployProxy(Auction);
        maticAuction = await upgrades.deployProxy(MaticAuction);
        oldAuction = await upgrades.deployProxy(OldAuction);

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

        await card.setControlAddresses(ethers.constants.AddressZero, maintoken.address, auction.address);

        await auction.setCardAddress(card.address);
        await maticAuction.setCardAddress(card.address);
        await oldAuction.setCardAddress(card.address);

        await auction.setCommission(5)
        await maticAuction.setCommission(4)
        await oldAuction.setCommission(5)

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

        placeCard = async (cardId, signer, minPrice = "0") => {
            await card.connect(signer).approve(auction.address, cardId);
            await auction.connect(signer).placeCardToAuction(cardId, minPrice);
        };

        placeCardToMaticAuction = async (cardId, signer, minPrice = "0") => {
            await card.connect(signer).approve(maticAuction.address, cardId);
            await maticAuction.connect(signer).placeCardToAuction(cardId, minPrice);
        }

        placeBet = async (cardId, signer, price) => {
            const betTx = await auction.connect(signer).placeBet(cardId, price);
            await betTx.wait();
        };

        placeBetToMaticAuction = async (cardId, signer, price) => {
            await maticAuction.connect(signer).placeBet(cardId, price, { value: price });
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
        const cardOwnerAfterSendingToAuc = await card.ownerOf(cardId);
        expect(cardOwnerAfterSendingToAuc).to.be.equal(auction.address);

        // he can not take it immediately
        await expect(takeCard(cardId, bob)).to.be.revertedWith("TooEarly");

        await ethers.provider.send('evm_increaseTime', [48 * 3600 + 5]);
        await ethers.provider.send('evm_mine');

        // now he can
        await takeCard(cardId, bob)
        const cardOwnerAfterTakingFromAuc = await card.ownerOf(cardId);
        expect(cardOwnerAfterTakingFromAuc).to.be.equal(bob.address);

        // And can place it again
        await placeCard(cardId, bob);
        const cardOwnerAfterSendingToAucSecondTime = await card.ownerOf(cardId);
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
    

    it("Testing Auction with Matic with decimals", async () => {
        const cardId = await mintNewCard(bob);
        await placeCardToMaticAuction(cardId, bob, ethers.utils.parseEther("0.1"));
    
        await expect(placeBetToMaticAuction(cardId, alice, ethers.utils.parseEther("0.05"))).to.be.revertedWith("TooFew");
    
        const aliceBalanceBeforeBet = await alice.provider.getBalance(alice.address);
        await placeBetToMaticAuction(cardId, alice, ethers.utils.parseEther("0.12"), { value: ethers.utils.parseEther("0.12") });
        const aliceBalanceAfterBet = await alice.provider.getBalance(alice.address);
    
        // Using BigNumber for precise calculation and comparison
        expect(aliceBalanceBeforeBet.sub(aliceBalanceAfterBet)).to.be.closeTo(ethers.utils.parseEther("0.12"), ethers.utils.parseEther("0.001"));
    
        await expect(placeBetToMaticAuction(cardId, carl, ethers.utils.parseEther("0.11"))).to.be.revertedWith("TooFew");
        await placeBetToMaticAuction(cardId, carl, ethers.utils.parseEther("0.15"));
    
        const aliceBalanceAfterRefund = await alice.provider.getBalance(alice.address);
        // Alice's balance should be approximately restored after the refund, considering gas costs
        expect(aliceBalanceAfterRefund).to.be.closeTo(aliceBalanceBeforeBet, ethers.utils.parseEther("0.002"));
    
        await ethers.provider.send('evm_increaseTime', [48 * 3600 + 5]);
        await ethers.provider.send('evm_mine');
    
        // Even if Bob tries to take it back, it is sent to Carl
        await takeCardFromMaticAuction(cardId, bob);
        const cardOwnerAfterTakingFromAuc = await card.ownerOf(cardId);
        expect(cardOwnerAfterTakingFromAuc).to.be.equal(carl.address);
    });
    

    it("Supports gasless ops", async () => {
        const cardId = await mintNewCard(bob);
        const gaslessMan = ethers.Wallet.createRandom();
        await card.connect(bob).functions['safeTransferFrom(address,address,uint256)'](bob.address, gaslessMan.address, cardId);

        // This is done on a frontend
        const sendToAuctionMessage = ethers.utils.arrayify(
            ethers.utils.keccak256(
                ethers.utils.solidityPack(
                    [
                        "uint256", "uint256", "uint256"
                    ],
                    [
                        cardId,
                        "10",
                        await auction.gasFreeOpCounter(gaslessMan.address),
                    ])
            )
        )
        const signatureInfo = ethers.utils.splitSignature(await gaslessMan.signMessage(sendToAuctionMessage))

        // then eventId, tokenId, choice, and signatureInfo is sent to backend
        // and placed by someone
        await auction.placeCardToAuctionGasFree(
            cardId, 10,
            gaslessMan.address,
            signatureInfo.v, signatureInfo.r, signatureInfo.s
        )

        expect(await card.ownerOf(cardId)).to.be.eq(auction.address)
    })

    it("Old auction supports gasless ops", async () => {
        const cardId = await mintNewCard(bob);
        const gaslessMan = ethers.Wallet.createRandom();
        await card.connect(bob).functions['safeTransferFrom(address,address,uint256)'](bob.address, gaslessMan.address, cardId);

        // This is done on a frontend
        const sendToAuctionMessage = ethers.utils.arrayify(
            ethers.utils.keccak256(
                ethers.utils.solidityPack(
                    [
                        "uint256", "uint256", "uint256"
                    ],
                    [
                        cardId,
                        "10",
                        await oldAuction.gasFreeOpCounter(gaslessMan.address),
                    ])
            )
        )
        const signatureInfo = ethers.utils.splitSignature(await gaslessMan.signMessage(sendToAuctionMessage))

        await card.setControlAddresses(ethers.constants.AddressZero, maintoken.address, oldAuction.address);
        

        // then eventId, tokenId, choice, and signatureInfo is sent to backend
        // and placed by someone
        await oldAuction.placeCardToAuctionGasFree(
            cardId, 10,
            gaslessMan.address,
            signatureInfo.v, signatureInfo.r, signatureInfo.s
        )

        expect(await card.ownerOf(cardId)).to.be.eq(oldAuction.address)
    })
});
