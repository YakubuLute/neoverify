// blockchain-service/src/services/blockchainService.js
const { ethers } = require('ethers')
const contractABI = require('../contracts/DocumentRegistry.json')

class BlockchainService {
  constructor () {
    this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL)
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider)
    this.contract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      contractABI.abi,
      this.wallet
    )
  }

  async registerDocument (documentHash, ipfsHash) {
    try {
      const tx = await this.contract.registerDocument(documentHash, ipfsHash)
      const receipt = await tx.wait()

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async verifyDocument (documentHash) {
    try {
      const result = await this.contract.verifyDocument(documentHash)

      return {
        exists: result.exists,
        isActive: result.isActive,
        issuer: result.issuer,
        timestamp: result.timestamp.toNumber()
      }
    } catch (error) {
      throw new Error(`Verification failed: ${error.message}`)
    }
  }

  async getTransactionStatus (txHash) {
    const receipt = await this.provider.getTransactionReceipt(txHash)
    return receipt ? receipt.status === 1 : false
  }
}

module.exports = BlockchainService
