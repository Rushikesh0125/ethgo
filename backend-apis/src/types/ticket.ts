export interface TicketData {
    eventName: string;
    tier: "VIP" | "Premium" | "Standard" | "Early Bird";
    ticketId?: string;
    eventId?: string,
    price?: number;
    description?: string;
}

export interface TicketMetadata {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
        trait_type: string;
        value: string | number;
    }>;
    external_url: string;
}

export interface TicketGenerationRequest {
    eventName: string;
    tier: "VIP" | "Premium" | "Standard" | "Early Bird";
    quantity?: number;
    eventId?: string;
}

export interface TicketGenerationResponse {
    success: boolean;
    ticketIds: string[];
    metadataUris: string[];
    imageUris: string[];
    message?: string;
}

export interface LighthouseUploadResponse {
    data: {
        Hash: string;
        Name: string;
        Size: string;
    }
}