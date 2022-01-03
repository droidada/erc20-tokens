const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('AdaToken contract', ()=> {
    let AdaTokenFactory, token, owner, addr1, addr2;

    beforeEach(async ()=> {
        AdaTokenFactory = await ethers.getContractFactory('AdaToken')
        token = await AdaTokenFactory.deploy();
        [owner, addr1, addr2, _]= await ethers.getSigners();
    });

    describe('Deployment', async function() {

        it('Should assign the total supply of tokens to the owner', async function() {
            const ownerBalance = await token.balanceOf(owner.address);
            expect(await token.totalSupply()).to.equal(ownerBalance);
        })
    })

    describe("Assign total supply ", function () {
        it("Deployment should assign the total supply of tokens to the owner", async function () {

            const ownerBalance = await token.balanceOf(owner.address);
            expect(await token.totalSupply()).to.equal(ownerBalance);
        });
    });


    describe("Transactions", function () {

        it("Should transfer tokens between accounts", async function () {
            // Transfer 50 tokens from owner to addr1
            await token.transfer(addr1.address, 50);
            const addr1Balance = await token.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(50);

            // Transfer 50 tokens from addr1 to addr2
            // We use .connect(signer) to send a transaction from another account
            await token.connect(addr1).transfer(addr2.address, 50);
            const addr2Balance = await token.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(50);
        });

        it("Should fail if sender doesn’t have enough tokens", async function () {
            const initialOwnerBalance = await token.balanceOf(owner.address);

            await expect(token.connect(addr1).transfer(owner.address, 1)).to.be.reverted;
            expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
        });

        it("Should update balances after transfers", async function () {
            const initialOwnerBalance = await token.balanceOf(owner.address);
            console.log("initial balance here is ", initialOwnerBalance)
            // Transfer 100 tokens from owner to addr1.
            await token.transfer(addr1.address, ethers.utils.parseEther('100'));

            // Transfer another 50 tokens from owner to addr2.
            await token.transfer(addr2.address, ethers.utils.parseEther('50'));

            // Check balances.
            const finalOwnerBalance = await token.balanceOf(owner.address);
            const expectedBalance = initialOwnerBalance - ethers.utils.parseEther('150');
            expect(finalOwnerBalance.toString()).to.equal(expectedBalance.toString());

            const addr1Balance = await token.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(ethers.utils.parseEther('100'));

            const addr2Balance = await token.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(ethers.utils.parseEther('50'));
        });
 
    });

})

