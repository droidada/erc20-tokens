pragma solidity ^0.7.0;

import "./AdaToken.sol";
//import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20, ERC20Permit} from "@soliditylabs/erc20-permit/contracts/ERC20Permit.sol";

contract WeaponsToken is ERC20Permit {

    uint private _tokensPerEth;
    constructor() ERC20("Weapons Token", "WEPT") {
        _mint(msg.sender, 1000 * 10 ** 18);
        _tokensPerEth = 50;
    }

    function tokensPerEth() external view returns (uint) {
        return _tokensPerEth;
    }
}

contract Portfolio is Ownable {

    AdaToken adaToken;

    // token price for ETH
    uint public adaTokensPerEth;

    // Event that log buy operation
    event DepositTokens(address buyer, uint256 amountOfETH, uint256 amountOfTokens);
    event WithdrawTokens(address seller, uint256 amountOfTokens, uint256 amountOfETH);
    event WithdrawAllTokens(address seller, uint256 amountOfTokens);

    constructor(address adaTokenAddress) {
        adaToken = AdaToken(adaTokenAddress);
        adaTokensPerEth = adaToken.tokensPerEth();
    }

    function depositTokens() external payable returns (uint256 tokenAmount) {
        require(msg.value > 0, "Send ETH to deposit some tokens");

        uint256 amountToDeposit = msg.value * adaTokensPerEth;

        // check if the Portfolio Contract has enough amount of tokens for the transaction
        uint256 portfolioBalance = adaToken.balanceOf(address(this));
        require(portfolioBalance >= amountToDeposit, "Not enough tokens in Portfolio balance");

        // Transfer token to the msg.sender
        (bool sent) = adaToken.transfer(msg.sender, amountToDeposit);
        require(sent, "Failed to transfer token to user");

        // emit the event
        emit DepositTokens(msg.sender, msg.value, amountToDeposit);

        return amountToDeposit;
    }


    function withdrawTokens(uint256 amountToWithdraw) external {        
        require(amountToWithdraw > 0, "Specify an amount of token greater than zero");

        uint256 userBalance = adaToken.balanceOf(msg.sender);
        require(userBalance >= amountToWithdraw, "Your balance is lower than the amount of tokens you want to withdraw");

        // Check that the Portfolio's balance is enough to do the swap
        uint256 amountOfETHToTransfer = amountToWithdraw / adaTokensPerEth;
        uint256 ownerETHBalance = address(this).balance;
        require(ownerETHBalance >= amountOfETHToTransfer, "Insufficient funds to withdraw");

        (bool sent) = adaToken.transferFrom(msg.sender, address(this), amountToWithdraw);
        require(sent, "Failed to transfer tokens from user to portfilio");

        (sent,) = msg.sender.call{value: amountOfETHToTransfer}("");
        require(sent, "Failed to send ETH to the user");

        emit WithdrawTokens(msg.sender, amountOfETHToTransfer, amountToWithdraw);
    }


    function withdrawAll() external onlyOwner {
        uint256 ownerBalance = address(this).balance;
        require(ownerBalance > 0, "Owner does not have enough balance to withdraw");

        (bool sent,) = msg.sender.call{value: address(this).balance}("");
        require(sent, "Failed to send user balance back to the owner");

        emit WithdrawAllTokens(msg.sender, ownerBalance);
    }

}

