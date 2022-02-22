// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "prb-math/contracts/PRBMathUD60x18.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./access/DeveloperAccess.sol";
import "./MerkleProof.sol";
import "./ERC721GAC.sol";

contract GamingApeClub is
    ERC721GAC,
    MerkleProof,
    Ownable,
    DeveloperAccess,
    ReentrancyGuard
{
    using PRBMathUD60x18 for uint256;

    uint256 private constant ONE_PERCENT = 10000000000000000; // 1% (18 decimals)

    bytes32 private _merkleRoot;
    uint256 public mintPrice;
    uint256 private _whitelistStart;
    uint256 private _whitelistEnd;
    uint256 private _publicStart;
    string private _baseUri;
    uint16 public maximumSupply;

    constructor(
        address devAddress,
        uint16 maxSupply,
        uint256 price,
        uint256 presaleMintStart,
        uint256 presaleMintEnd,
        uint256 publicMintStart,
        string memory baseUri
    ) ERC721GAC("Gaming Ape Club", "GAC") DeveloperAccess(devAddress) {
        require(maxSupply >= 5, "Bad supply");

        // GLOBALS
        maximumSupply = maxSupply;
        mintPrice = price;

        // CONFIGURE PRESALE Mint
        _whitelistStart = presaleMintStart;
        _whitelistEnd = presaleMintEnd;

        // CONFIGURE PUBLIC MINT
        _publicStart = publicMintStart;

        // SET BASEURI
        _baseUri = baseUri;

        // MINT 5 AUCTION NFTS
        ownerMint(5, msg.sender);
    }

    // -------------------------------------------- OWNER/DEV ONLY ----------------------------------------

    /**
     * @dev Throws if called by any account other than the developer/owner.
     */
    modifier onlyOwnerOrDeveloper() {
        require(
            developer() == _msgSender() || owner() == _msgSender(),
            "Ownable: caller is not the owner or developer"
        );
        _;
    }

    /**
     * Allows for the owner to mint for free.
     * @param quantity - the quantity to mint.
     * @param to - the address to recieve that minted quantity.
     */
    function ownerMint(uint64 quantity, address to) public onlyOwner {
        uint256 remaining = maximumSupply - _currentIndex;

        require(remaining > 0, "Mint over");
        require(quantity <= remaining, "Not enough");

        _mint(owner(), to, quantity, "", true, true);
    }

    /**
     * Sets the base URI for all tokens
     *
     * @dev be sure to terminate with a slash
     * @param uri - the target base uri (ex: 'https://google.com/')
     */
    function setBaseURI(string calldata uri) public onlyOwnerOrDeveloper {
        _baseUri = uri;
    }

    /**
     * Updates the mint price
     * @param price - the price in WEI
     */
    function setMintPrice(uint256 price) public onlyOwnerOrDeveloper {
        mintPrice = price;
    }

    /**
     * Updates the merkle root
     * @param root - the new merkle root
     */
    function setMerkleRoot(bytes32 root) public onlyOwnerOrDeveloper {
        _merkleRoot = root;
    }

    /**
     * Updates the mint dates.
     *
     * @param wlStartDate - the start date for whitelist in UNIX seconds.
     * @param wlEndDate - the end date for whitelist in UNIX seconds.
     * @param pubStartDate - the start date for public in UNIX seconds.
     */
    function setMintDates(
        uint256 wlStartDate,
        uint256 wlEndDate,
        uint256 pubStartDate
    ) public onlyOwnerOrDeveloper {
        _whitelistStart = wlStartDate;
        _whitelistEnd = wlEndDate;
        _publicStart = pubStartDate;
    }

    /**
     * Withdraws balance from the contract to the dividend recipients within.
     */
    function withdraw() external onlyOwnerOrDeveloper {
        uint256 amount = address(this).balance;

        (bool s1, ) = payable(0x568bFbBD4F4e4CA9Fb15729A61E660786207e94f).call{
            value: amount.mul(ONE_PERCENT * 85)
        }("");
        (bool s2, ) = payable(0x7436F0949BCa6b6C6fD766b6b9AA57417B0314A9).call{
            value: amount.mul(ONE_PERCENT * 4)
        }("");
        (bool s3, ) = payable(0x13c4d22a8dbB2559B516E10FE0DE47ba4b4A03EB).call{
            value: amount.mul(ONE_PERCENT * 3)
        }("");
        (bool s4, ) = payable(0xB3D665d27A1AE8F2f3C32cB1178c9E749ce00714).call{
            value: amount.mul(ONE_PERCENT * 3)
        }("");
        (bool s5, ) = payable(0x470049b45A5f05c84e9285Cb467642733450acE5).call{
            value: amount.mul(ONE_PERCENT * 3)
        }("");
        (bool s6, ) = payable(0xcbFF601C8745a86e39d9dcB4725B7e6019f5e4FE).call{
            value: amount.mul(ONE_PERCENT * 2)
        }("");

        if (s1 && s2 && s3 && s4 && s5 && s6) return;

        // fallback to paying owner
        (bool s7, ) = payable(owner()).call{value: amount}("");

        require(s7, 'Payment failed');
    }

    // ------------------------------------------------ MINT ------------------------------------------------

    /**
     * A handy getter to retrieve the number of private mints conducted by a user.
     * @param user - the user to query for.
     */
    function getPresaleMints(address user) external view returns (uint256) {
        return _numberMintedPrivate(user);
    }

    /**
     * A handy getter to retrieve the number of public mints conducted by a user.
     * @param user - the user to query for.
     */
    function getPublicMints(address user) external view returns (uint256) {
        return _numberMintedPublic(user);
    }

    /**
     * Mints in the premint stage by using a signed transaction from a merkle tree whitelist.
     *
     * @param proof - the merkle proof from the root to the whitelisted address
     */
    function premint(bytes32[] memory proof) public payable nonReentrant {
        uint256 remaining = maximumSupply - _currentIndex;

        require(remaining > 0, "Mint over");
        require(
            _whitelistStart <= block.timestamp &&
                _whitelistEnd >= block.timestamp,
            "Inactive"
        );

        require(
            verify(_merkleRoot, keccak256(abi.encodePacked(msg.sender)), proof),
            "Invalid proof"
        );
        require(mintPrice == msg.value, "Bad value");
        require(_numberMintedPrivate(msg.sender) == 0, "Limit exceeded");

        // DISTRIBUTE THE TOKENS
        _safeMint(msg.sender, 1, true);
    }

    /**
     * Mints one token provided it is possible to.
     *
     * @notice This function allows minting in the public sale.
     */
    function mint() public payable nonReentrant {
        uint256 remaining = maximumSupply - _currentIndex;

        require(remaining > 0, "Mint over");
        require(block.timestamp >= _publicStart, "Inactive");
        require(_numberMintedPublic(msg.sender) == 0, "Limit exceeded");
        require(mintPrice == msg.value, "Invalid value");

        // DISTRIBUTE THE TOKENS
        _safeMint(msg.sender, 1, false);
    }

    /**
     * Burns the provided token id if you own it.
     * Reduces the supply by 1.
     *
     * @param tokenId - the ID of the token to be burned.
     */
    function burn(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Not owner");

        _burn(tokenId);
    }

    // ------------------------------------------- INTERNAL -------------------------------------------

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`.
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseUri;
    }

    // --------------------------------------- FALLBACKS ---------------------------------------

    /**
     * The receive function, does nothing
     */
    receive() external payable {
        // DO NOTHING
    }
}
