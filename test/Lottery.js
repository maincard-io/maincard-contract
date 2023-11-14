const { expect } = require("chai");
const { ethers } = require("hardhat");

// Функция для подписания сообщений
async function signTicketPurchase(signer, ticketPrice, opCounter) {
    const messageHash = ethers.utils.solidityKeccak256(["uint256", "uint256"], [ticketPrice, opCounter]);
    const ethSignedMessageHash = ethers.utils.hashMessage(ethers.utils.arrayify(messageHash));
    const signature = await signer.signMessage(ethers.utils.arrayify(ethSignedMessageHash));
    return ethers.utils.splitSignature(signature);
}

describe("Lottery Contract", function () {
    let MainToken;
    let mainToken;
    let Lottery;
    let lottery;
    let owner;
    let alice;

    beforeEach(async function () {

        [owner, alice] = await ethers.getSigners();
        MainToken = await ethers.getContractFactory("MainToken");
        mainToken = await MainToken.deploy();
        await mainToken.deployed();
        await mainToken.initialize();

        Lottery = await ethers.getContractFactory("Lottery");
        lottery = await Lottery.deploy(mainToken.address);
        await lottery.deployed();
    });

    it("Should allow a user to buy a ticket gas free", async () => {
        const ticketPrice = ethers.utils.parseEther("50");
        const opCounter = await lottery.gasFreeOpCounter(alice.address);

        await mainToken.connect(alice).approve(lottery.address, ticketPrice);

        const { v, r, s } = await signTicketPurchase(alice, ticketPrice, opCounter);
        await lottery.connect(alice).buyTicketGasFree(ticketPrice, opCounter, v, r, s);

        const tickets = await lottery.ticketsBought(alice.address);
        expect(tickets).to.equal(1);
    });

    it("Should fail if not enough tokens are approved for gas-free ticket purchase", async () => {
        const ticketPrice = ethers.utils.parseEther("50");
        const opCounter = await lottery.gasFreeOpCounter(alice.address);

        await mainToken.connect(alice).approve(lottery.address, ethers.utils.parseEther("10"));

        const { v, r, s } = await signTicketPurchase(alice, ticketPrice, opCounter);
        await expect(
            lottery.connect(alice).buyTicketGasFree(ticketPrice, opCounter, v, r, s)
        ).to.be.revertedWith("Transfer failed or not enough tokens approved");
    });
});
