// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MockERC721 is ERC721Enumerable, Ownable {
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}
    string private _baseUri;

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
     * Sets the base URI for all tokens
     *
     * @dev be sure to terminate with a slash
     * @param uri - the target base uri (ex: 'https://google.com/')
     */
    function setBaseURI(string calldata uri) public {
        _baseUri = uri;
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

    // ------------------------------------------- INTERNAL -------------------------------------------

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`.
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseUri;
    }

    receive() payable external {
        // nada
    }

    fallback() external {
        // nada
    }
}