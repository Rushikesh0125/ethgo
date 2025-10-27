import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import dotenv from "dotenv";
import ticketRoutes from "./routes/ticketRoutes";
import { TicketService } from "./services/ticketService";
import createTicketRoutes from "./routes/ticketRoutes";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3000;
const ticketService = new TicketService(process.env.LIGHTHOUSE_API_KEY || "");
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb"}));
app.use(express.urlencoded({ extended: true}));


app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "Ticket Generation API",
    });
});

app.use("/api/tickets", createTicketRoutes(ticketService));

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message,
    });
});

app.use("*", (req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Ticket Generation API running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🎫 Ticket endpoints: http://localhost:${PORT}/api/tickets`);
    
    // Check required environment variables
    if (!process.env.LIGHTHOUSE_API_KEY) {
      console.warn('⚠️  LIGHTHOUSE_API_KEY not set in environment variables');
    }
  });
  
  export default app;