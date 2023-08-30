const { ethers, upgrades } = require("hardhat");
const getNamedAccount = require("./DEPLOYMENTS.js")

async function main() {
  const [admin] = await ethers.getSigners();
  console.log("Admin: ", admin);

  const Card = await ethers.getContractFactory("Card");
  const cardProxy = getNamedAccount("cardProxy");
  const card = Card.attach(cardProxy);

  for (let i = 0; i <= 3; ++i) {
    const setUpgradePriceTx = await card.setTokenUpgradePrice(getNamedAccount(`tokenUpgradePrice${i}`), i);
    await setUpgradePriceTx.wait()
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
