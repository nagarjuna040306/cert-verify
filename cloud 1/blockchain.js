/**
 * A simple SHA-256 implementation in Vanilla JS for hashing blocks.
 * Utilizing the Web Crypto API.
 */
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Represents a Single block in the Blockchain
 */
class Block {
    constructor(index, timestamp, data, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data; // For certificates: { studentName, course, date, issuer }
        this.previousHash = previousHash;
        this.hash = ''; // Will be computed asynchronously
        this.nonce = 0; // For proof of work
    }

    async computeHash() {
        // Stringify data securely
        const dataString = JSON.stringify(this.data);
        return await sha256(this.index + this.previousHash + this.timestamp + dataString + this.nonce);
    }

    async mineBlock(difficulty) {
        // Simple Proof of Work to simulate mining
        const target = Array(difficulty + 1).join("0");
        this.hash = await this.computeHash();
        
        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            this.hash = await this.computeHash();
        }
        console.log("Block Mined: " + this.hash);
    }
}

/**
 * Represents the Blockchain itself
 */
class Blockchain {
    constructor() {
        this.chain = [];
        this.difficulty = 2; // Low difficulty for instant demonstration
    }

    async initialize() {
        // Create Genesis Block if chain is empty
        if (this.chain.length === 0) {
            const genesisBlock = new Block(0, new Date().toISOString(), "Genesis Block", "0");
            await genesisBlock.mineBlock(this.difficulty);
            this.chain.push(genesisBlock);
        }
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    async addBlock(newBlock) {
        newBlock.previousHash = this.getLatestBlock().hash;
        await newBlock.mineBlock(this.difficulty);
        this.chain.push(newBlock);
        // Persist to local storage to simulate distributed ledger
        this.saveChain();
        return newBlock;
    }

    async isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // Recompute hash to check for tampering
            const trueHash = await currentBlock.computeHash();

            if (currentBlock.hash !== trueHash) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }

    // Attempt to find a certificate by its short ID
    getCertificateByShortId(shortId) {
        // Skip Genesis block (i=0)
        for (let i = 1; i < this.chain.length; i++) {
            if (this.chain[i].data && this.chain[i].data.shortId === shortId) {
                return this.chain[i]; // Return the block so we can show hash AND data
            }
        }
        return null;
    }

    saveChain() {
        localStorage.setItem('nexchain_ledger', JSON.stringify(this.chain));
    }

    async loadChain() {
        const stored = localStorage.getItem('nexchain_ledger');
        if (stored) {
            const parsed = JSON.parse(stored);
            // Reconstruct Block objects
            this.chain = parsed.map(obj => {
                const b = new Block(obj.index, obj.timestamp, obj.data, obj.previousHash);
                b.hash = obj.hash;
                b.nonce = obj.nonce;
                return b;
            });
            console.log("Chain loaded from memory");
        } else {
            await this.initialize();
        }
    }
}

// Global instance
const nexChain = new Blockchain();
