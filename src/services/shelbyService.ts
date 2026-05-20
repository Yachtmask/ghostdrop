import { 
  ShelbyRPCClient, 
  ShelbyBlobClient,
  ShelbyNetwork,
  generateCommitments,
  createDefaultErasureCodingProvider,
  BlobName,
  expectedTotalChunksets,
  defaultErasureCodingConfig,
  getShelbyBlobExplorerUrl
} from "@shelby-protocol/sdk/browser";
import { Network } from "@aptos-labs/ts-sdk";

/**
 * Shelby Storage Service
 * Handles interaction with the Shelby Protocol for decentralized storage.
 * Configured for Aptos Protocol.
 */
export class ShelbyService {
  private rpcClient: ShelbyRPCClient;
  private blobClient: ShelbyBlobClient;
  private provider: any = null;
  private cache: Map<string, { data: Uint8Array, timestamp: number }> = new Map();
  private CACHE_TTL = 30000; // 30 seconds cache for metadata and small blobs

  constructor() {
    // Geomi API key provided by the user
    const apiKey = (typeof import.meta !== 'undefined' && import.meta.env) 
      ? (import.meta.env.VITE_SHELBY_API_KEY || import.meta.env.NEXT_PUBLIC_SHELBY_API_KEY || '')
      : (process.env.NEXT_PUBLIC_SHELBY_API_KEY || '');
    
    const config = {
      apiKey: apiKey,
      network: Network.TESTNET as any,
      rpc: {
        apiKey: apiKey
      },
      indexer: {
        apiKey: apiKey
      }
    };

    this.rpcClient = new ShelbyRPCClient(config);
    this.blobClient = new ShelbyBlobClient(config);
  }

  private async getProvider() {
    if (!this.provider) {
      this.provider = await createDefaultErasureCodingProvider();
    }
    return this.provider;
  }

  /**
   * Generates commitments for a blob.
   */
  async generateCommitments(data: Uint8Array) {
    const provider = await this.getProvider();
    return await generateCommitments(provider, data);
  }

  /**
   * Creates a registration payload for a blob.
   */
  createRegistrationPayload(params: {
    accountAddress: string;
    blobName: string;
    blobSize: number;
    blobMerkleRoot: string;
    expirationMicros: number;
  }) {
    const config = defaultErasureCodingConfig();
    const numChunksets = expectedTotalChunksets(params.blobSize, config.chunkSizeBytes);
    
    return ShelbyBlobClient.createRegisterBlobPayload({
      account: params.accountAddress as any,
      blobName: params.blobName as BlobName,
      blobSize: params.blobSize,
      blobMerkleRoot: params.blobMerkleRoot,
      expirationMicros: params.expirationMicros,
      numChunksets: numChunksets,
      encoding: 0, // ClayEncoding.CLAY_8_4
    });
  }

  /**
   * Uploads an encrypted blob to Shelby.
   */
  async upload(accountAddress: string, blobName: string, uint8Array: Uint8Array, options?: any): Promise<void> {
    try {
      console.log('Shelby: Uploading blob...', blobName, 'to account', accountAddress, 'Size:', uint8Array.length);
      
      const result = await this.rpcClient.putBlob({
        account: accountAddress,
        blobName: blobName,
        blobData: uint8Array,
        totalBytes: uint8Array.length,
        ...options
      });
      
      console.log('Shelby: Upload successful. Result:', result);
    } catch (error: any) {
      console.error('Shelby upload failed details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack
      });
      throw new Error(`Shelby upload failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Downloads an encrypted blob from Shelby by its account and name.
   */
  async download(accountAddress: string, blobName: string): Promise<Uint8Array> {
    const cacheKey = `${accountAddress}:${blobName}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('Shelby: Returning cached blob...', blobName);
      return cached.data;
    }

    try {
      console.log('Shelby: Downloading blob...', blobName, 'from account', accountAddress);
      
      const shelbyBlob = await this.rpcClient.getBlob({
        account: accountAddress as any,
        blobName: blobName as BlobName,
      });
      
      const arrayBuffer = await new Response(shelbyBlob.readable).arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      // Cache small blobs (like metadata)
      if (data.length < 1024 * 1024) { 
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
      }
      
      return data;
    } catch (error: any) {
      console.error('Shelby download failed details:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      
      let errorMessage = 'Failed to download from Shelby storage.';
      if (error.message && error.message.includes('not found')) {
        errorMessage = `Blob '${blobName}' not found. It may have expired or been deleted.`;
      } else if (error.message) {
        errorMessage = `Shelby download error: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Generates a Shelby Explorer URL for a blob.
   */
  getExplorerUrl(accountAddress: string, blobName: string) {
    return getShelbyBlobExplorerUrl("testnet", accountAddress, blobName);
  }
}

export const shelbyService = new ShelbyService();
