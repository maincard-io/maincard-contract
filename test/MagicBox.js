const { expect, assert } = require("chai");
const { BigNumber } = require("ethers");
const { ethers, upgrades } = require("hardhat");


describe("MagicBox tests", function () {
    before(async () => {
        const [admin, alice, bob] = await ethers.getSigners();
        this.alice = alice;

        const VRFCoordinatorMock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
        this.vrfCoordinatorMock = await VRFCoordinatorMock.deploy(0, 0);
        this.vrfCoordinatorMock = await this.vrfCoordinatorMock.deployed();

        const subIdTx = await this.vrfCoordinatorMock.createSubscription();
        const subIdEffects = await subIdTx.wait()
        const subId = subIdEffects.events.filter(e=>e.event === "SubscriptionCreated")[0].args[0];
        await this.vrfCoordinatorMock.fundSubscription(subId, "10000000000000000000000");

        const Card = await ethers.getContractFactory("Card");
        this.card = await upgrades.deployProxy(Card);
        const PRICE_MANAGER_ROLE = await this.card.PRICE_MANAGER_ROLE();
        await this.card.grantRole(PRICE_MANAGER_ROLE, admin.address);
        await this.card.setTokenPrice("10000000000000000000", 0);

        const MagicBox = await ethers.getContractFactory("MagicBox");
        this.magicBox = await MagicBox.deploy(subId, this.vrfCoordinatorMock.address, 400000,
            "0x0000000000000000000000000000000000000000000000000000000000000000", this.card.address);
        this.magicBox = await this.magicBox.deployed();
        await this.magicBox.setProbability(0x03030302);

        const MINTER_ROLE = await this.card.MINTER_ROLE();
        await this.card.grantRole(MINTER_ROLE, this.magicBox.address);
        await this.card.grantRole(MINTER_ROLE, admin.address);

        await this.vrfCoordinatorMock.addConsumer(subId, this.magicBox.address);

        this.sendRequestToBuyCard = async (rarity, value) => {
            const tx = await this.magicBox.openBox(rarity, {value});
            const effects = await tx.wait();

            const abi = [
                "event RandomWordsRequested(bytes32 indexed keyHash, uint256 requestId, uint256 preSeed, uint64 indexed subId, uint16 minimumRequestConfirmations, uint32 callbackGasLimit, uint32 numWords, address indexed sender)",
            ];
            const iface = new ethers.utils.Interface(abi);
            const logs = effects.logs.filter(e => e.topics[0] === "0x63373d1c4696214b898952999c9aaec57dac1ee2723cec59bea6888f489a9772");
            expect(logs).to.have.length(1);
            const logParsed = iface.parseLog(logs[0]);
            return logParsed.args.requestId;
        };

        this.fulfillRequest = async (requestId, randomWord) => {
            const tx = await this.vrfCoordinatorMock.fulfillRandomWordsWithOverride(
                requestId, this.magicBox.address, [randomWord]);
            const effects = await tx.wait();
            const fulfillLogs = effects.events.filter(e=>e.event === "RandomWordsFulfilled");
            expect(fulfillLogs).to.have.length(1);
            expect(fulfillLogs[0].args[3]).to.be.true;

            const abi = [
                "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
            ];
            const iface = new ethers.utils.Interface(abi);
            const transferLogs = effects.events.filter(e=>
                e.address === this.card.address &&
                e.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
            ).map(e=>iface.parseLog(e));
            expect(transferLogs).to.have.length(1);
            return transferLogs[0].args[2];
        };
    });

    it("Test unlucky", async () => {
        const requestId = await this.sendRequestToBuyCard(0, "10200000000000000000");
        const receivedCardId = await this.fulfillRequest(requestId, 99);
        expect(await this.card.getRarity(receivedCardId)).to.be.equal(0);
    });
    
    it("Test lucky", async () => {
        const requestId = await this.sendRequestToBuyCard(0, "10200000000000000000");
        const receivedCardId = await this.fulfillRequest(requestId, 1);
        expect(await this.card.getRarity(receivedCardId)).to.be.equal(1);
    });

    it("Test not enough funds", async () => {
        await expect(this.sendRequestToBuyCard(0, "10100000000000000000")).to.be.reverted;
    });

    it("Test unlucky with openBoxFree", async () => {
        // const requestId = await this.magicBox.openBoxFree(0);
        // const receivedCardId = await this.fulfillRequest(requestId, 99);
        // expect(await this.card.getRarity(receivedCardId)).to.be.equal(0);
    });

    it("Test lucky with openBoxFree", async () => {
        // const requestId = await this.magicBox.openBoxFree(0);
        // const receivedCardId = await this.fulfillRequest(requestId, 1);
        // expect(await this.card.getRarity(receivedCardId)).to.be.equal(1);
    });
});
