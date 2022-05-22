// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MockERC721 is ERC721Enumerable, Ownable {
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    /**
     * Public so that we can test
     */
    function mint(address user, uint256[] calldata ids) public {
        uint256 i;

        for (i; i < ids.length; i++) {
            _mint(user, ids[i]);
        }
    }

    /**
     * Public so that we can test
     */
    function mintWithValue(address user, uint256[] calldata ids, uint256 value) payable public {
        require(msg.value == value, string(abi.encodePacked("bad value: ", Strings.toString(value))));
        uint256 i;

        for (i; i < ids.length; i++) {
            _mint(user, ids[i]);
        }
    }

    function burn(uint256[] calldata ids) public {
        uint256 i;
        for (i; i < ids.length; i++) {
            _burn(ids[i]);
        }
    }

    receive() payable external {
        // nada
    }

    fallback() external {
        // nada
    }
}