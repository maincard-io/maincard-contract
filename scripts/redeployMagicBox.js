const { ethers, upgrades } = require("hardhat");
const getNamedAccount = require("./DEPLOYMENTS.js")

async function main() {
  const [admin] = await ethers.getSigners();
  console.log("Admin: ", admin);
  
  const cardProxy = getNamedAccount("cardProxy")

  const CARD_DEPLOYED = true;
  const MAGICBOX_DEPLOYED = false;

  const Card = await ethers.getContractFactory("Card");
  const card = await (!CARD_DEPLOYED ? upgrades.deployProxy(Card) : Card.attach(cardProxy));
  console.log("Card attached to:", card.address);

  const MagicBox = await ethers.getContractFactory("MagicBox");
  const magicBox = await (!MAGICBOX_DEPLOYED ?
                          MagicBox.deploy(getNamedAccount("vrfSubscriptionId"),
                                          getNamedAccount("vrfCoordinator"),
                                          400000,
                                          getNamedAccount("vrfKeyHash"),
                                          card.address) :
                          MagicBox.attach(getNamedAccount("magicBox")));
  await magicBox.deployed();
  console.log("MagicBox deployed to:", magicBox.address);

  const MINTER_ROLE = await card.MINTER_ROLE();

  const setProbabilityTx = await magicBox.setProbability(0x03030302);
  await setProbabilityTx.wait()

  const grantMinterToMagicBox = await card.grantRole(MINTER_ROLE, magicBox.address);
  await grantMinterToMagicBox.wait()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
