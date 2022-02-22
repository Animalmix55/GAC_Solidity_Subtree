// SPDX-License-Identifier: MIT
// Creator: Cory Cherven, inspired by Chiru Labs

pragma solidity ^0.8.9;

import "../ERC721GAC.sol";

contract ERC721GACWrapper is ERC721GAC {
    string private _baseUri;

    constructor(
        string memory name,
        string memory symbol,
        string memory baseUri
    ) ERC721GAC(name, symbol) {
        _baseUri = baseUri;
    }

    function mint(
        address to,
        uint64 quantity,
        bool safe,
        bool isPrivate
    ) external {
        _mint(to, quantity, "", safe, isPrivate);
    }

    function burn(uint64 tokenId) external {
        _burn(tokenId);
    }

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * by default, can be overriden in child contracts.
     */
    function _baseURI() internal override view virtual returns (string memory) {
        return _baseUri;
    }

}
