import lighthouse from "@lighthouse-web3/sdk";
import { TicketMetadata } from "../types/ticket";
import * as path from "path";
import * as fs from "fs";

export class LighthouseService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async uploadFile(file: Buffer, fileName: string): Promise<string> {
        try {
            // Create temp directory if it doesn't exist
            const tempDir = path.join(__dirname, "temp");
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempPath = path.join(tempDir, fileName);
            fs.writeFileSync(tempPath, file);

            const uploadResponse = await lighthouse.upload(
                tempPath, 
                this.apiKey
            );
            
            // Clean up temp file
            fs.unlinkSync(tempPath);
            
            if(uploadResponse.data && uploadResponse.data.Hash) {
                return `https://gateway.lighthouse.storage/ipfs/${uploadResponse.data.Hash}`;
            }

            throw new Error("Upload failed - no hash returned");
        } catch(error) {
            console.error("Lighthouse upload failed:", error);
            throw new Error(`Failed to upload ${fileName} to Lighthouse: ${error}`);
        }
    }

    async uploadImage(pngBuffer: Buffer, ticketId: string): Promise<string> {
        const fileName = `ticket-${ticketId}.png`;
        return this.uploadFile(pngBuffer, fileName);
    }

    async uploadMetadata(metadata: TicketMetadata, ticketId: string): Promise<string> {
        const fileName = `metadata-${ticketId}.json`;
        const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
        return this.uploadFile(metadataBuffer, fileName);
    }

    async uploadBatch(files: Array<{buffer: Buffer; fileName: string}>): Promise<string[]> {
        const uploadPromises = files.map(file => 
            this.uploadFile(file.buffer, file.fileName)
        );
        return Promise.all(uploadPromises);
    }
}