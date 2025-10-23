import { generateTicketBuffers } from "./ticketGenerator";
import { LighthouseService } from "./lighthouseService";
import { TicketData, TicketMetadata, TicketGenerationResponse} from "../types/ticket";

export class TicketService {
    private lighthouseService: LighthouseService;

    constructor(LighthouseApiKey: string) {
        this.lighthouseService = new LighthouseService(LighthouseApiKey);
    }
    async generateAndSaveTicket(ticketData: TicketData): Promise<{
        ticketId: string;
        metadataFolderUri: string;
        imageFolderUri: string;
    }> {
        try {
            const ticketId = ticketData.ticketId ?? crypto.randomUUID();

            const { png } = await generateTicketBuffers({
                eventName: ticketData.eventName,
                tier: ticketData.tier,
                ticketId: ticketId
            });

            const ticketNumber = await this.getNextTicketNumber();
            
            // Upload image first to get the imageUri
            const imageUri = await this.lighthouseService.uploadImage(png, `${ticketNumber}.png`);
            
            const metadata: TicketMetadata = {
                name: ticketNumber.toString(),
                description: `Exclusive ${ticketData.tier} Ticket for ${ticketData.eventName}`,
                image: imageUri, // Use full imageUri instead of relative path
                attributes: [
                    {
                        trait_type: "Event",
                        value: ticketData.eventName
                    },
                    {
                        trait_type: "Tier",
                        value: ticketData.tier
                    },
                    {
                        trait_type: "Ticket ID",
                        value: ticketId
                    },
                    {
                        trait_type: "Type",
                        value: "Digital Ticket"
                    },
                    {
                        trait_type: "Number",
                        value: ticketNumber
                    }
                ],
                external_url: `https://example.com/event/${ticketId}`
            };

            const result = await this.lighthouseService.uploadSingleToPersistentFolders(
                png,
                `${ticketNumber}.png`,
                metadata,
                ticketNumber.toString() // Use just the number as filename (no .json extension)
            );

            return {
                ticketId,
                metadataFolderUri: result.metadataFolderUri,
                imageFolderUri: result.imagesFolderUri
            };
        } catch(error) {
            console.error("Error generating and saving ticket:", error);
            throw new Error(`Failed to generate and save ticket: ${error}`);
        }
    }


    async generateMultipleTickets(
    eventName: string,
    tier: 'VIP' | 'Premium' | 'Standard' | 'Early Bird',
    quantity: number,
    eventId?: string
  ): Promise<TicketGenerationResponse> {
    try {
        const ticketIds: string[] = [];
        const images: {buffer: Buffer; fileName: string}[] = [];
        const metadataFiles: {content: TicketMetadata; fileName: string}[] = [];
        let currentTicketNumber = await this.getNextTicketNumber();

        // Generate all tickets first
        for (let i = 0; i < quantity; i++) {
            const ticketId = `${eventId || 'EVENT'}-${tier}-${String(i + 1).padStart(3, '0')}`;
            ticketIds.push(ticketId);

            const { png } = await generateTicketBuffers({
                eventName,
                tier,
                ticketId
            });

            // Use sequential number for image filename
            images.push({ 
                buffer: png, 
                fileName: `${currentTicketNumber}.png` 
            });

            // Upload image to get full URI
            const imageUri = await this.lighthouseService.uploadImage(png, `${currentTicketNumber}.png`);

            const metadata: TicketMetadata = {
                name: currentTicketNumber.toString(),
                description: `Exclusive ${tier} Ticket for ${eventName}`,
                image: imageUri, // Use full imageUri
                attributes: [
                    { trait_type: "Event", value: eventName },
                    { trait_type: "Tier", value: tier },
                    { trait_type: "Ticket ID", value: ticketId },
                    { trait_type: "Type", value: "Digital Ticket" },
                    { trait_type: "Number", value: currentTicketNumber }
                ],
                external_url: `https://example.com/event/${ticketId}`
            };

            metadataFiles.push({ 
                content: metadata, 
                fileName: currentTicketNumber.toString() // Use just the number (no .json extension)
            });

            currentTicketNumber++;
        }

        // Upload all to persistent folders
        const folderUris = await this.lighthouseService.uploadToPersistentFolders(
            images,
            metadataFiles
        );

        return {
            success: true,
            ticketIds,
            metadataFolderUri: folderUris.metadataFolderUri,
            imageFolderUri: folderUris.imagesFolderUri,
            message: `Successfully generated ${quantity} ${tier} tickets for ${eventName}`
        };
    } catch (error) {
        console.error('Error generating multiple tickets:', error);
        return {
            success: false,
            ticketIds: [],
            metadataFolderUri: "",
            imageFolderUri: "",
            message: `Failed to generate tickets: ${error}`
        };
    }
  }
  async generateSingleTicket(ticketData: TicketData): Promise<TicketGenerationResponse> {
    try {
      const result = await this.generateAndSaveTicket(ticketData);

      return {
        success: true,
        ticketIds: [result.ticketId],
        metadataFolderUri: result.metadataFolderUri,
        imageFolderUri: result.imageFolderUri, // Add image folder URI
        message: `Successfully generated ${ticketData.tier} ticket for ${ticketData.eventName}`
      };
    } catch(error) {
      console.error("Error generating single ticket:", error);
      return {
        success: false,
        ticketIds: [],
        metadataFolderUri: "",
        imageFolderUri: "",
        message: `Failed to generate ticket: ${error}`
      };
    }
  }

  private async getNextTicketNumber(): Promise<number> {
    // This could be stored in a database, file, or retrieved from existing metadata
    // For now, you could use a simple counter or fetch from existing tickets
    // Implementation depends on your persistence strategy
    return 1; // Placeholder - implement based on your needs
  }
}