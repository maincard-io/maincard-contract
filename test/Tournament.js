const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { ethers, upgrades } = require("hardhat");


describe("Tournament Tests", () => {
    async function deployContracts() {
        const [owner, manager, backend] = await hre.ethers.getSigners();
        const alice = ethers.Wallet.createRandom();

        const Card = await hre.ethers.getContractFactory("Card");
        const card = await upgrades.deployProxy(Card);

        const MainCardToken = await hre.ethers.getContractFactory("MainToken");
        const mainCardToken = await upgrades.deployProxy(MainCardToken);

        const Tournament = await ethers.getContractFactory("Tournament");
        const tournament = await upgrades.deployProxy(Tournament, [
            mainCardToken.address, card.address
        ]);

        await card.grantRole(await card.MINTER_ROLE(), manager.address)
        await tournament.grantRole(await tournament.TOURNAMENT_MANAGER_ROLE(), manager.address)
        await mainCardToken.grantRole(await mainCardToken.MINTER_ROLE(), manager.address)

        await mainCardToken.connect(manager).mint(alice.address, 100_000_000_000_000_000_000n);

        const mintCardToAlice = async (rarity) => {
            const mintNonce = await card._freeMintNonce();
            const tx = await card.connect(manager).freeMint2(alice.address, rarity, mintNonce);
            const effects = await tx.wait()
            const ncm = effects.events.filter(e => e.event === 'NewCardMinted')
            expect(ncm).has.lengthOf(1)
            return ncm[0].args.cardId
        }

        const createTournament = async(tournamentId, fee, minRequiredRarity, requiredCardsAmount) => {
            await tournament.connect(manager).setTournamentRules(tournamentId, fee, minRequiredRarity, requiredCardsAmount)
        }

        const sendCardsToTournament = async(tournamentId, fee, cardIds) => {
            // This is done on a frontend.
            const perminMainTokensMsg = ethers.utils.arrayify(
                ethers.utils.keccak256(
                    ethers.utils.solidityPack(
                        [
                            "uint256", "address", "uint256"
                        ],
                        [
                            await mainCardToken.permitOpsCounter(alice.address),
                            tournament.address,
                            fee
                        ])
                )
            )
            const tokenPermitSignature = ethers.utils.splitSignature(await alice.signMessage(perminMainTokensMsg))

            const placeCardsMsg = ethers.utils.arrayify(
                ethers.utils.keccak256(
                    ethers.utils.solidityPack(
                        // Schema:
                        ["uint256"]
                            // as manu uint256 as much cardIds
                            .concat(Array(cardIds.length).fill("uint256"))
                            // tournamentId
                            .concat(["uint256"]),

                        // Data
                        [await tournament._gasFreeOpCounter(alice.address)]
                            .concat(cardIds)
                            .concat([tournamentId])
                    )
                )
            )
            const placeCardsSignature = ethers.utils.splitSignature(await alice.signMessage(placeCardsMsg))

            // Backend
            await mainCardToken.connect(backend).permit(
                tournament.address,
                alice.address,
                fee,
                tokenPermitSignature.v, tokenPermitSignature.r, tokenPermitSignature.s
            )
            await tournament.connect(backend).registerForTournamentGasFree(
                cardIds, tournamentId, alice.address,
                placeCardsSignature.v, placeCardsSignature.r, placeCardsSignature.s
            )
        }

        return { owner, manager, card, mainCardToken, tournament, mintCardToAlice, createTournament, sendCardsToTournament };
    }

    it("Can be deployed", async () => {
        const { tournament, mintCardToAlice, createTournament, sendCardsToTournament } = await loadFixture(deployContracts);
        const cardId1 = await mintCardToAlice(0)
        const cardId2 = await mintCardToAlice(0)

        await createTournament(1, 1_000n, 0n, 2n)
        await sendCardsToTournament(1, 1_000n, [cardId1, cardId2])
    })
})