const { ethers } = require('hardhat');
const { use, expect } = require('chai');
const { solidity } = require('ethereum-waffle');

use(solidity);

describe('Portfolio dApp', () => {

  let owner, addr1, addr2, addrs;
  let portfolioContract, tokenContract, AdaTokenFactory;
  let portfolioTokensSupply, tokensPerEth;

  beforeEach(async () => {
    // eslint-disable-next-line no-unused-vars
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy AdaToken contract
    AdaTokenFactory = await ethers.getContractFactory('AdaToken');
    tokenContract = await AdaTokenFactory.deploy();

    // Deploy Contract
    const PortfolioContract = await ethers.getContractFactory('Portfolio');
    portfolioContract = await PortfolioContract.deploy(tokenContract.address);

    await tokenContract.transfer(portfolioContract.address, ethers.utils.parseEther('100'));
    await portfolioContract.transferOwnership(owner.address);

    portfolioTokensSupply = await tokenContract.balanceOf(portfolioContract.address);
    tokensPerEth = await portfolioContract.adaTokensPerEth();
  });


  describe('Test depositTokens() method', () => {
      
    it('depositTokens reverted no eth sent', async () => {
      const amount = ethers.utils.parseEther('0');
      await expect(
        portfolioContract.connect(addr1).depositTokens({
          value: amount,
        }),
      ).to.be.reverted;
    });

    it('depositTokens reverted portfolio does not have enough tokens', async () => {
      const amount = ethers.utils.parseEther('101');
      await expect(
        portfolioContract.connect(addr1).depositTokens({
          value: amount,
        }),
      ).to.be.revertedWith('Not enough tokens in Portfolio balance');
    });

    it('depositTokens success!', async () => {
      const amount = ethers.utils.parseEther('1');

      // Check that the depositTokens process is successful and the event is emitted
      await expect(
        portfolioContract.connect(addr1).depositTokens({
          value: amount,
        }),
      )
        .to.emit(portfolioContract, 'DepositTokens')
        .withArgs(addr1.address, amount, amount.mul(tokensPerEth));

      // Check that the user's balance of token is 100
      const userTokenBalance = await tokenContract.balanceOf(addr1.address);
      const userTokenAmount = ethers.utils.parseEther('100');
      expect(userTokenBalance).to.equal(userTokenAmount);

      // Check that the portfolio's token balance is 900
      const portfolioTokenBalance = await tokenContract.balanceOf(portfolioContract.address);
      expect(portfolioTokenBalance).to.equal(portfolioTokensSupply.sub(userTokenAmount));

      // Check that the portfolio's ETH balance is 1
      const portfolioBalance = await ethers.provider.getBalance(portfolioContract.address);
      expect(portfolioBalance).to.equal(amount);
    });
  });

  describe('Test withdrawAll() method', () => {
    it('withdraw reverted because called by not the owner', async () => {
      await expect(portfolioContract.connect(addr1).withdrawAll()).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('withdraw reverted because called by not the owner', async () => {
      await expect(portfolioContract.connect(owner).withdrawAll()).to.be.revertedWith('Owner does not have enough balance to withdraw');
    });

    it('withdraw success', async () => {
      const ethOfTokenToBuy = ethers.utils.parseEther('1');

      // depositTokens operation
      await portfolioContract.connect(addr1).depositTokens({
        value: ethOfTokenToBuy,
      });

      // withdraw operation
      const txWithdraw = await portfolioContract.connect(owner).withdrawAll();

      // Check that the Portfolio's balance has 0 eth
      const portfolioBalance = await ethers.provider.getBalance(portfolioContract.address);
      expect(portfolioBalance).to.equal(0);

      // Check the the owner balance has changed of 1 eth
      await expect(txWithdraw).to.changeEtherBalance(owner, ethOfTokenToBuy);
    });
  });

  describe('Test withdrawTokens() method', () => {

    it('withdrawTokens reverted because tokenAmountToSell is 0', async () => {
      const amountToSell = ethers.utils.parseEther('0');
      await expect(portfolioContract.connect(addr1).withdrawTokens(amountToSell)).to.be.revertedWith(
        'Specify an amount of token greater than zero',
      );
    });

    it('withdrawTokens reverted because user does not have enough tokens', async () => {
      const amountToSell = ethers.utils.parseEther('1');
      await expect(portfolioContract.connect(addr1).withdrawTokens(amountToSell)).to.be.revertedWith(
        'Your balance is lower than the amount of tokens you want to withdraw',
      );
    });

    it('withdrawTokens reverted because not enough tokens', async () => {
      // User 1 buy
      const ethOfTokenToBuy = ethers.utils.parseEther('1');

      // depositTokens operation
      await portfolioContract.connect(addr1).depositTokens({
        value: ethOfTokenToBuy,
      });

      await portfolioContract.connect(owner).withdrawAll();

      const amountToSell = ethers.utils.parseEther('100');
      await expect(portfolioContract.connect(addr1).withdrawTokens(amountToSell)).to.be.revertedWith(
        'Insufficient funds to withdraw',
      );
    });

    it('withdrawTokens reverted because user has now approved transfer', async () => {
      // User 1 buy
      const ethOfTokenToBuy = ethers.utils.parseEther('1');

      // depositTokens operation
      await portfolioContract.connect(addr2).depositTokens({
        value: ethOfTokenToBuy,
      });

      let amountToSell = ethers.utils.parseEther('101')
      await expect(portfolioContract.connect(addr2).withdrawTokens(amountToSell)).to.be.revertedWith(
        'Your balance is lower than the amount of tokens you want to withdraw',
      );

    });

    it('withdrawTokens success', async () => {

      const ethOfTokenToBuy = ethers.utils.parseEther('1');

      // depositTokens operation
      await portfolioContract.connect(addr1).depositTokens({
        value: ethOfTokenToBuy,
      });

      const amountToSell = ethers.utils.parseEther('100');
      await tokenContract.connect(addr1).approve(portfolioContract.address, amountToSell);

      // check that the Portfolio can transfer the amount of tokens we want to sell
      const portfolioAllowance = await tokenContract.allowance(addr1.address, portfolioContract.address);
      expect(portfolioAllowance).to.equal(amountToSell);

      const sellTx = await portfolioContract.connect(addr1).withdrawTokens(amountToSell);

      // Check that the portfolio's token balance is 1000
      const portfolioTokenBalance = await tokenContract.balanceOf(portfolioContract.address);
      expect(portfolioTokenBalance).to.equal(ethers.utils.parseEther('100'));

      // Check that the user's token balance is 0
      const userTokenBalance = await tokenContract.balanceOf(addr1.address);
      expect(userTokenBalance).to.equal(0);

      // Check that the user's ETH balance is 1
      const userEthBalance = ethers.utils.parseEther('1');
      await expect(sellTx).to.changeEtherBalance(addr1, userEthBalance);
    });
  });
});