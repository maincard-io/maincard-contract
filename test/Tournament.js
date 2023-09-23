const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")


describe("Tournament Tests", () => {
    async function deployContracts() {
        const [owner, manager] = await hre.ethers.getSigners();

        const Card = await hre.ethers.getContractFactory("Card");
        const card = await upgrades.deployProxy(Card);

        const MainCardToken = await hre.ethers.getContractFactory("MainToken");
        const mainCardToken = await upgrades.deployProxy(MainCardToken);

        const Tournament = await ethers.getContractFactory("Tournament");
        const tournament = await upgrades.deployProxy(Tournament, [
            mainCardToken.address, card.address
        ]);

        await card.grantRole(await card.MINTER_ROLE(), manager.address)

        return { owner, manager, card, mainCardToken };
    }

    it("Can be deployed", async () => {
        await loadFixture(deployContracts);
    })
})