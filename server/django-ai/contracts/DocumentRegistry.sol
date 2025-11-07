// contracts/DocumentRegistry.sol
pragma solidity ^0.8.0;

contract DocumentRegistry {
    struct Document {
        bytes32 documentHash;
        string ipfsHash;
        address issuer;
        uint256 timestamp;
        bool isActive;
    }
    
    mapping(bytes32 => Document) public documents;
    mapping(address => bool) public authorizedIssuers;
    
    event DocumentRegistered(bytes32 indexed documentHash, address indexed issuer);
    event DocumentRevoked(bytes32 indexed documentHash, address indexed issuer);
    
    modifier onlyAuthorized() {
        require(authorizedIssuers[msg.sender], "Not authorized issuer");
        _;
    }
    
    function registerDocument(
        bytes32 _documentHash,
        string memory _ipfsHash
    ) public onlyAuthorized {
        require(documents[_documentHash].timestamp == 0, "Document already registered");
        
        documents[_documentHash] = Document({
            documentHash: _documentHash,
            ipfsHash: _ipfsHash,
            issuer: msg.sender,
            timestamp: block.timestamp,
            isActive: true
        });
        
        emit DocumentRegistered(_documentHash, msg.sender);
    }
    
    function verifyDocument(bytes32 _documentHash) 
        public view returns (bool exists, bool isActive, address issuer, uint256 timestamp) {
        Document memory doc = documents[_documentHash];
        return (doc.timestamp != 0, doc.isActive, doc.issuer, doc.timestamp);
    }
    
    function revokeDocument(bytes32 _documentHash) public {
        Document storage doc = documents[_documentHash];
        require(doc.issuer == msg.sender, "Only issuer can revoke");
        require(doc.isActive, "Document already revoked");
        
        doc.isActive = false;
        emit DocumentRevoked(_documentHash, msg.sender);
    }
}