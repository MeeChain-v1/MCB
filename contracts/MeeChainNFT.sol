// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MeeChainNFT
 * @dev NFT contract for MeeChain mission cards with IPFS metadata support
 */
contract MeeChainNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    
    // Mapping from token ID to mission ID
    mapping(uint256 => uint256) public tokenToMission;
    
    // Events
    event NFTMinted(address indexed to, uint256 indexed tokenId, string tokenURI, uint256 missionId);
    event MetadataUpdated(uint256 indexed tokenId, string newTokenURI);
    
    constructor() ERC721("MeeChain Card", "MCC") Ownable(msg.sender) {}
    
    /**
     * @dev Mint a new NFT with IPFS metadata URI
     * @param to Address to mint the NFT to
     * @param ipfsURI IPFS URI pointing to the NFT metadata
     * @param missionId Associated mission ID for the card
     */
    function mintCard(address to, string memory ipfsURI, uint256 missionId) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, ipfsURI);
        tokenToMission[tokenId] = missionId;
        
        emit NFTMinted(to, tokenId, ipfsURI, missionId);
        return tokenId;
    }
    
    /**
     * @dev Update metadata URI for a token (e.g., when IPFS content is updated)
     * @param tokenId Token ID to update
     * @param newTokenURI New IPFS URI
     */
    function updateTokenURI(uint256 tokenId, string memory newTokenURI) public onlyOwner {
        _setTokenURI(tokenId, newTokenURI);
        emit MetadataUpdated(tokenId, newTokenURI);
    }
    
    /**
     * @dev Get all tokens owned by an address
     * @param owner Address to query
     */
    function tokensOfOwner(address owner) public view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokens = new uint256[](tokenCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < _nextTokenId; i++) {
            if (_ownerOf(i) == owner) {
                tokens[index] = i;
                index++;
            }
        }
        
        return tokens;
    }
    
    // The following functions are overrides required by Solidity.
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
