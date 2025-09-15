import { expect } from "chai";
import { ethers } from "hardhat";

describe("RevenueSplitter", () => {
  it("splits funds deterministically", async () => {
    const [owner, a1, a2] = await ethers.getSigners();
    const Split = await ethers.getContractFactory("RevenueSplitter");
    const split = await Split.deploy([a1.address, a2.address], [7000, 3000]); // bps
    await split.deployed();

    await owner.sendTransaction({ to: await split.getAddress(), value: ethers.parseEther("1") });
    await expect(split.distribute()).to.changeEtherBalances(
      [a1, a2],
      [ethers.parseEther("0.7"), ethers.parseEther("0.3")]
    );
  });
});