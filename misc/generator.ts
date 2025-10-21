import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';

interface TicketData {
  eventName: string;
  tier: 'VIP' | 'Premium' | 'Standard' | 'Early Bird';
  ticketId?: string;
}

interface GradientColors {
  color1: string;
  color2: string;
}

const TIER_GRADIENTS: Record<string, GradientColors> = {
  'VIP': { color1: '#FF6B6B', color2: '#FFE66D' },
  'Premium': { color1: '#4ECDC4', color2: '#44A08D' },
  'Standard': { color1: '#667eea', color2: '#764ba2' },
  'Early Bird': { color1: '#F857A6', color2: '#FF5858' }
};

/**
 * Generates an SVG ticket as a string
 */
export function generateTicketSVG(data: TicketData): string {
  const { eventName, tier, ticketId = generateTicketId() } = data;
  const { color1, color2 } = TIER_GRADIENTS[tier];
  
  // Truncate long event names
  const displayName = eventName.length > 20 
    ? eventName.substring(0, 20) + '...' 
    : eventName;

  return `
    <svg width="600" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ticketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Ticket Background -->
      <rect width="600" height="300" rx="20" fill="url(#ticketGradient)" filter="url(#shadow)"/>
      
      <!-- Decorative circles -->
      <circle cx="50" cy="50" r="80" fill="rgba(255,255,255,0.1)"/>
      <circle cx="550" cy="250" r="100" fill="rgba(255,255,255,0.1)"/>
      
      <!-- Ticket stub separator -->
      <line x1="450" y1="30" x2="450" y2="270" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-dasharray="5,5"/>
      
      <!-- Content -->
      <text x="50" y="80" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white">
        ${escapeXml(displayName)}
      </text>
      
      <text x="50" y="130" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.9)">
        ${escapeXml(tier)} Ticket
      </text>
      
      <!-- Ticket details -->
      <text x="50" y="200" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.8)">
        ADMIT ONE
      </text>
      
      <text x="50" y="230" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.7)">
        TICKET ID: ${escapeXml(ticketId)}
      </text>
      
      <!-- Stub content -->
      <text x="480" y="150" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" transform="rotate(90 480 150)">
        ${escapeXml(tier.toUpperCase())}
      </text>
    </svg>
  `;
}

/**
 * Converts SVG string to PNG buffer
 */
export async function svgToPNG(svgString: string, width = 600, height = 300): Promise<Buffer> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Convert SVG to data URL
  const svgBuffer = Buffer.from(svgString);
  const svgDataUrl = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`;

  // Load and draw the image
  const img = await loadImage(svgDataUrl);
  ctx.drawImage(img, 0, 0, width, height);

  // Return PNG buffer
  return canvas.toBuffer('image/png');
}

/**
 * Generate ticket and save as SVG file
 */
export function saveTicketSVG(data: TicketData, filePath: string): void {
  const svg = generateTicketSVG(data);
  fs.writeFileSync(filePath, svg);
}

/**
 * Generate ticket and save as PNG file
 */
export async function saveTicketPNG(data: TicketData, filePath: string): Promise<void> {
  const svg = generateTicketSVG(data);
  const pngBuffer = await svgToPNG(svg);
  fs.writeFileSync(filePath, pngBuffer);
}

/**
 * Generate ticket SVG and PNG, return both as buffers
 */
export async function generateTicketBuffers(data: TicketData): Promise<{
  svg: Buffer;
  png: Buffer;
}> {
  const svgString = generateTicketSVG(data);
  const svgBuffer = Buffer.from(svgString);
  const pngBuffer = await svgToPNG(svgString);

  return {
    svg: svgBuffer,
    png: pngBuffer
  };
}

/**
 * Helper function to generate random ticket ID
 */
function generateTicketId(): string {
  return Math.random().toString(36).substr(2, 9).toUpperCase();
}

/**
 * Helper function to escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Example usage:
/*
import { generateTicketSVG, saveTicketPNG, generateTicketBuffers } from './ticketGenerator';

// Generate SVG string
const svg = generateTicketSVG({
  eventName: 'Summer Music Festival 2025',
  tier: 'VIP'
});

// Save as PNG file
await saveTicketPNG({
  eventName: 'Summer Music Festival 2025',
  tier: 'Premium'
}, './ticket.png');

// Get both SVG and PNG as buffers (useful for sending via API)
const { svg: svgBuffer, png: pngBuffer } = await generateTicketBuffers({
  eventName: 'Concert Night',
  tier: 'Standard',
  ticketId: 'CUSTOM123'
});

// Use in Express.js
app.get('/ticket', async (req, res) => {
  const { svg, png } = await generateTicketBuffers({
    eventName: req.query.event,
    tier: req.query.tier
  });
  
  res.setHeader('Content-Type', 'image/png');
  res.send(png);
});
*/