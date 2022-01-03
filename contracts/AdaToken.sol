pragma solidity ^0.7.0;

import "hardhat/console.sol";
interface ERC20Interface {
    function totalSupply() external view returns (uint256);
    function balanceOf(address tokenOwner) external view returns (uint256);
    function allowance(address tokenOwner, address spender) external view returns (uint256);
    function transfer(address to, uint256 tokens) external returns (bool success);
    function approve(address spender, uint256 tokens) external returns (bool success);
    function transferFrom(address from, address to, uint256 tokens) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 tokens);
    event Approval(address indexed tokenOwner, address indexed spender, uint256 tokens);
}


contract AdaToken is ERC20Interface {

    using SafeMath for uint256;

    string public symbol;
    string public  name;
    uint8 public decimals;

    uint private _tokensPerEth;
    uint private _totalSupply;

    mapping(address => uint) balances;
    mapping(address => mapping(address => uint)) allowed;

    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint) public nonces;
    
    constructor () {
        symbol = "AT";
        name = "AdaToken";
        decimals = 2;
        _totalSupply = 100000000000000000000;
        _tokensPerEth = 100;

        balances[msg.sender] = _totalSupply;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                keccak256(bytes(name)),
                keccak256(bytes('1')),
                _chainID(),
                address(this)
            )
        );
    }

    function tokensPerEth() external view returns (uint256 tokens) {
        return _tokensPerEth;
    }

    function totalSupply() external override view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address tokenOwner) external override view returns (uint256 balance) {
        return balances[tokenOwner];
    }

    function transfer(address to, uint256 tokens) external override returns (bool success) {
        require(to != address(0), "AdaToken: cannot transfer from the zero address");
        require(tokens <= balances[msg.sender], "Not enough balance to transfer");

        balances[msg.sender] = balances[msg.sender].sub(tokens);
        balances[to] = balances[to].add(tokens);

        emit Transfer(msg.sender, to, tokens);
        return true;
    }

    function _approve(address tokenOwner, address spender, uint256 tokens) private {
        allowed[tokenOwner][spender] = tokens;
        emit Approval(tokenOwner, spender, tokens);
    }

    function approve(address spender, uint256 tokens) external override returns (bool success) {
        _approve(msg.sender, spender, tokens);
        return true;
    }

    function transferFrom(address from, address to, uint256 tokens) external override returns (bool success) {
        require(from != address(0), "AdaToken: cannot transfer from a zero address");
        require(to != address(0), "AdaToken: cannot transfer to a zero address");
        require(tokens <= balances[from], "Not enough tokens to transfer");

        balances[from] = balances[from].sub(tokens);
        balances[to] = balances[to].add(tokens);
        
        allowed[from][msg.sender] = allowed[from][msg.sender].sub(tokens);

        emit Transfer(from, to, tokens);
        return true;
    }

    function allowance(address tokenOwner, address spender) external override view returns (uint256 remaining) {
        return allowed[tokenOwner][spender];
    }

    function _chainID() private pure returns (uint256) {
        uint256 chainID;
        assembly {
            chainID := chainid()
        }
        return chainID;
    }
    function permit(address tokenOwner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(deadline >= block.timestamp, 'AdaToken: EXPIRED PERMISSION');
        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_TYPEHASH, tokenOwner, spender, value, nonces[tokenOwner]++, deadline))
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == tokenOwner, 'INVALID_SIGNATURE');
        _approve(tokenOwner, spender, value);
    }

}

library SafeMath { 
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
      assert(b <= a);
      return a - b;
    }
    
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
      uint256 c = a + b;
      assert(c >= a);
      return c;
    }
}

