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

    async uploadEventFolder(
        eventName: string, 
        eventId: string,
        metadata: any,
        images: Array<{buffer: Buffer; ticketId: string}>
    ): Promise<string> {
        try {
            const tempDir = path.join(__dirname, "temp");
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Create event folder structure
            const eventFolderName = `event-${eventId || eventName.replace(/\s+/g, '-').toLowerCase()}`;
            const eventFolderPath = path.join(tempDir, eventFolderName);
            const imagesFolderPath = path.join(eventFolderPath, "images");
            
            fs.mkdirSync(eventFolderPath, { recursive: true });
            fs.mkdirSync(imagesFolderPath, { recursive: true });

            // Write metadata.json
            const metadataPath = path.join(eventFolderPath, "metadata.json");
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

            // Write all images
            images.forEach(image => {
                const imagePath = path.join(imagesFolderPath, `ticket-${image.ticketId}.png`);
                fs.writeFileSync(imagePath, image.buffer);
            });

            // Upload the entire folder
            const uploadResponse = await lighthouse.upload(
                eventFolderPath, 
                this.apiKey
            );
            
            // Clean up temp folder
            fs.rmSync(eventFolderPath, { recursive: true, force: true });
            
            if(uploadResponse.data && uploadResponse.data.Hash) {
                return `https://gateway.lighthouse.storage/ipfs/${uploadResponse.data.Hash}`;
            }

            throw new Error("Upload failed - no hash returned");
        } catch(error) {
            console.error("Lighthouse folder upload failed:", error);
            throw new Error(`Failed to upload event folder to Lighthouse: ${error}`);
        }
    }

    async uploadToPersistentFolders(
        images: Array<{buffer: Buffer; fileName: string}>,
        metadataFiles: Array<{content: any; fileName: string}>
    ): Promise<{imagesFolderUri: string; metadataFolderUri: string}> {
        try {
            const tempDir = path.join(__dirname, "temp");
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Create images folder
            const imagesFolderPath = path.join(tempDir, "images");
            fs.mkdirSync(imagesFolderPath, { recursive: true });

            // Create metadata folder  
            const metadataFolderPath = path.join(tempDir, "metadata");
            fs.mkdirSync(metadataFolderPath, { recursive: true });

            // Write all images
            images.forEach(image => {
                const imagePath = path.join(imagesFolderPath, image.fileName);
                fs.writeFileSync(imagePath, image.buffer);
            });

            // Write all metadata files
            metadataFiles.forEach(metadata => {
                const metadataPath = path.join(metadataFolderPath, metadata.fileName);
                fs.writeFileSync(metadataPath, JSON.stringify(metadata.content, null, 2));
            });

            // Upload images folder
            const imagesUploadResponse = await lighthouse.upload(
                imagesFolderPath, 
                this.apiKey
            );

            // Upload metadata folder
            const metadataUploadResponse = await lighthouse.upload(
                metadataFolderPath, 
                this.apiKey
            );
            
            // Clean up temp folders
            fs.rmSync(imagesFolderPath, { recursive: true, force: true });
            fs.rmSync(metadataFolderPath, { recursive: true, force: true });
            
            if(imagesUploadResponse.data?.Hash && metadataUploadResponse.data?.Hash) {
                return {
                    imagesFolderUri: `https://gateway.lighthouse.storage/ipfs/${imagesUploadResponse.data.Hash}`,
                    metadataFolderUri: `https://gateway.lighthouse.storage/ipfs/${metadataUploadResponse.data.Hash}`
                };
            }

            throw new Error("Upload failed - no hash returned");
        } catch(error) {
            console.error("Lighthouse persistent folder upload failed:", error);
            throw new Error(`Failed to upload to persistent folders: ${error}`);
        }
    }

    async uploadSingleToPersistentFolders(
        imageBuffer: Buffer,
        imageFileName: string,
        metadata: any,
        metadataFileName: string // This will now be just a number like "1", "2", "3"
    ): Promise<{imagesFolderUri: string; metadataFolderUri: string}> {
        return this.uploadToPersistentFolders(
            [{buffer: imageBuffer, fileName: imageFileName}],
            [{content: metadata, fileName: metadataFileName}] // No .json extension
        );
    }
}