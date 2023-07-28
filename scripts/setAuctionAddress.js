const { ethers, upgrades } = require("hardhat");
const getNamedAccount = require("./DEPLOYMENTS.js")

async function main() {
  const [admin] = await ethers.getSigners();
  console.log("Admin: ", admin);

  const Card = await ethers.getContractFactory("Card");

  const cardProxy = getNamedAccount("cardProxy")
  const auctionProxy = getNamedAccount("auctionProxy")

  const card = Card.attach(cardProxy)

  console.log(`Setting card[${card.address}].acution = ${auctionProxy}`);
  const tx = await card.setAuctionAddress(auctionProxy)
  await tx.wait()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
