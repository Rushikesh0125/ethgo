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
        imageUri: string;
        metadataUri: string;
    }> {
        try {
            const ticketId = ticketData.ticketId ?? crypto.randomUUID();

            const { png } = await generateTicketBuffers({
                eventName: ticketData.eventName,
                tier: ticketData.tier,
                ticketId: ticketId
            });

            
            const imageUri = await this.lighthouseService.uploadImage(png, ticketId);
            const metadata: TicketMetadata = {
              name: `${ticketData.eventName} - ${ticketData.tier} Ticket`,
                description: `Exclusive ${ticketData.tier} Ticket for ${ticketData.eventName}`,
                image: imageUri,
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
                    }
                ],
                external_url: `https://example.com/event/${ticketId}`
              };
              
            const metadataUri = await this.lighthouseService.uploadMetadata(metadata, ticketId);

            return {
                ticketId,
                imageUri,
                metadataUri
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
      const results : {ticketId: string; imageUri: string; metadataUri: string}[] = [];
      const ticketIds = [] as string[];
      const metadataUris = [] as string[];
      const imageUris = [] as string[];

      for (let i = 0; i < quantity; i++) {
        const ticketData: TicketData = {
          eventName,
          tier,
          eventId,
          ticketId: `${eventId || 'EVENT'}-${tier}-${String(i + 1).padStart(3, '0')}`
        };

        const result : {ticketId: string; imageUri: string; metadataUri: string} = await this.generateAndSaveTicket(ticketData);
        results.push(result);
        ticketIds.push(result.ticketId);
        metadataUris.push(result.metadataUri);
        imageUris.push(result.imageUri);
      }

      return {
        success: true,
        ticketIds,
        metadataUris,
        imageUris,
        message: `Successfully generated ${quantity} ${tier} tickets for ${eventName}`
      };
    } catch (error) {
      console.error('Error generating multiple tickets:', error);
      return {
        success: false,
        ticketIds: [],
        metadataUris: [],
        imageUris: [],
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
        metadataUris: [result.metadataUri],
        imageUris: [result.imageUri],
        message: `Successfully generated ${ticketData.tier} ticket for ${ticketData.eventName}`
      };
    } catch(error) {
      console.error("Error generating single ticket:", error);
      return {
        success: false,
        ticketIds: [],
        metadataUris: [],
        imageUris: [],
        message: `Failed to generate ticket: ${error}`
      };
    }
  }

  
}