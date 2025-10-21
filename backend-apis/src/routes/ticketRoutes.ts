import { Router, Request, Response } from "express";
import { TicketService } from "../services/ticketService";
import { TicketGenerationRequest } from "../types/ticket";


export default function createTicketRoutes(ticketService: TicketService) {
    const router = Router();
    
    router.post("/generate", async(req: Request, res: Response) => {
        try {
            const { eventName, tier, ticketId, eventId } = req.body;
    
            if(!eventName || !tier) {
                return res.status(400).json({
                    success: false,
                    message: "Event name and tier are required"
                })
            }
    
            const result = await ticketService.generateSingleTicket({
                eventName,
                tier,
                ticketId,
                eventId
            });
    
            res.json(result);
        } catch(error) {
            console.error("Error in ticket generatation endpoint:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error",
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    
    router.post("/generate-batch", async(req: Request, res: Response) => {
        try {
            const { eventName, tier, quantity, eventId } = req.body;
    
            if(!eventName || !tier || !quantity) {
                return res.status(400).json({
                    success: false,
                    message: "Event name, tier, and quantity are required"
                })
            }
    
            if(quantity > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Quantity cannot be greater than 100"
                });
            }
    
            const result = await ticketService.generateMultipleTickets(eventName, tier, quantity, eventId);
            res.json(result);
        } catch(error) {
            console.error("Error in batch ticket generation endpoint:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error",
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    
    router.get("/test", async(req: Request, res: Response) => {
        try {
            const result = await ticketService.generateSingleTicket({
                eventName: "Test Event",
                tier: "VIP",
                ticketId: "1234567890",
            });
            res.json({
                success: true,
                message: "Test ticket generated successfully",
                ticket: result
            });
        } catch(error) {
            console.error("Error in test endpoint:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error",
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    
    return router;
}