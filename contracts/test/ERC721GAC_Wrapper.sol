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
        address from,
        address to,
        uint64 quantity,
        bool safe,
        bool isPrivate
    ) external {
        _mint(from, to, quantity, "", safe, isPrivate);
    }

    function mintWithData(
        address from,
        address to,
        uint64 quantity,
        bytes calldata data,
        bool safe,
        bool isPrivate
    ) external {
        _mint(from, to, quantity, data, safe, isPrivate);
    }

    function burn(uint64 tokenId) external {
        _burn(tokenId);
    }

    function publicMintCount(address user) external view returns (uint256) {
        return _numberMintedPublic(user);
    }

    function privateMintCount(address user) external view returns (uint256) {
        return _numberMintedPrivate(user);
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
