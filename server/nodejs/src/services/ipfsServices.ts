// blockchain-service/src/services/ipfsService.js
const { create } = require('ipfs-http-client')
const fs = require('fs')

class IPFSService {
  constructor () {
    this.client = create({
      host: process.env.IPFS_HOST || 'localhost',
      port: process.env.IPFS_PORT || 5001,
      protocol: process.env.IPFS_PROTOCOL || 'http'
    })
  }

  async uploadDocument (filePath) {
    try {
      const file = fs.readFileSync(filePath)
      const result = await this.client.add(file)

      return {
        success: true,
        hash: result.path,
        size: result.size
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async retrieveDocument (hash) {
    try {
      const chunks = []
      for await (const chunk of this.client.cat(hash)) {
        chunks.push(chunk)
      }
      return Buffer.concat(chunks)
    } catch (error) {
      throw new Error(`Failed to retrieve document: ${error.message}`)
    }
  }
}

module.exports = IPFSService
