import { 
    generateTicketSVG, 
    saveTicketSVG, 
    saveTicketPNG, 
    generateTicketBuffers 
  } from './generator.ts';
  import * as path from 'path';
  import * as fs from 'fs';
  
  /**
   * Driver function to test all ticket generation functions
   */
  async function testTicketGenerator() {
    console.log('🎫 Starting Ticket Generator Tests...\n');
  
    // Create output directory
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
      console.log('✅ Created output directory\n');
    }
  
    // Test 1: Generate SVG string
    console.log('Test 1: Generate SVG String');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const svgString = generateTicketSVG({
      eventName: 'Summer Music Festival 2025',
      tier: 'VIP'
    });
    console.log(`✅ Generated SVG (${svgString.length} characters)`);
    console.log(`Preview: ${svgString.substring(0, 100)}...\n`);
  
    // Test 2: Save SVG file
    console.log('Test 2: Save SVG File');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const svgPath = path.join(outputDir, 'ticket-vip.svg');
    saveTicketSVG({
      eventName: 'Summer Music Festival 2025',
      tier: 'VIP',
      ticketId: 'VIP001'
    }, svgPath);
    console.log(`✅ Saved SVG to: ${svgPath}\n`);
  
    // Test 3: Save PNG file
    console.log('Test 3: Save PNG File');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const pngPath = path.join(outputDir, 'ticket-premium.png');
    await saveTicketPNG({
      eventName: 'Rock Concert 2025',
      tier: 'Premium',
      ticketId: 'PREM001'
    }, pngPath);
    const pngStats = fs.statSync(pngPath);
    console.log(`✅ Saved PNG to: ${pngPath}`);
    console.log(`   File size: ${(pngStats.size / 1024).toFixed(2)} KB\n`);
  
    // Test 4: Generate buffers (for API responses)
    console.log('Test 4: Generate Buffers');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const buffers = await generateTicketBuffers({
      eventName: 'Theater Show',
      tier: 'Standard',
      ticketId: 'STD001'
    });
    console.log(`✅ SVG Buffer: ${buffers.svg.length} bytes`);
    console.log(`✅ PNG Buffer: ${buffers.png.length} bytes\n`);
  
    // Test 5: Generate all ticket tiers
    console.log('Test 5: Generate All Ticket Tiers');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const tiers: Array<'VIP' | 'Premium' | 'Standard' | 'Early Bird'> = [
      'VIP', 
      'Premium', 
      'Standard', 
      'Early Bird'
    ];
  
    for (const tier of tiers) {
      const filename = `ticket-${tier.toLowerCase().replace(' ', '-')}.png`;
      const filepath = path.join(outputDir, filename);
      
      await saveTicketPNG({
        eventName: 'Multi-Tier Event 2025',
        tier: tier
      }, filepath);
      
      console.log(`✅ Generated ${tier} ticket: ${filename}`);
    }
  
    console.log('\n');
  
    // Test 6: Test with long event name
    console.log('Test 6: Long Event Name Handling');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const longNamePath = path.join(outputDir, 'ticket-long-name.png');
    await saveTicketPNG({
      eventName: 'The Most Amazing Super Long Event Name That Should Be Truncated',
      tier: 'VIP'
    }, longNamePath);
    console.log(`✅ Generated ticket with truncated long name\n`);
  
    // Test 7: Custom ticket IDs
    console.log('Test 7: Custom Ticket IDs');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const customIds = ['CUSTOM-001', 'EVENT-2025-A', 'VIP-PREMIUM-123'];
    
    for (const id of customIds) {
      const svg = generateTicketSVG({
        eventName: 'Custom ID Test',
        tier: 'Standard',
        ticketId: id
      });
      console.log(`✅ Generated ticket with ID: ${id}`);
    }
  
    console.log('\n');
  
    // Summary
    console.log('📊 Test Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const outputFiles = fs.readdirSync(outputDir);
    console.log(`✅ All tests completed successfully!`);
    console.log(`📁 Generated ${outputFiles.length} files in ${outputDir}`);
    console.log(`\nFiles created:`);
    outputFiles.forEach(file => {
      const stats = fs.statSync(path.join(outputDir, file));
      const size = (stats.size / 1024).toFixed(2);
      console.log(`   - ${file} (${size} KB)`);
    });
  
    console.log('\n🎉 Ticket Generator is working perfectly!\n');
  }
  
  /**
   * Example: Simulate API endpoint behavior
   */
  async function simulateAPIEndpoint() {
    console.log('🌐 Simulating API Endpoint Behavior');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
    // Simulate request data
    const requestData = {
      eventName: 'API Generated Event',
      tier: 'Premium' as const
    };
  
    console.log('Incoming Request:', JSON.stringify(requestData, null, 2));
  
    // Generate ticket
    const { png } = await generateTicketBuffers(requestData);
  
    console.log(`\n✅ Response generated:`);
    console.log(`   Content-Type: image/png`);
    console.log(`   Content-Length: ${png.length} bytes`);
    console.log(`   Ready to send to client\n`);
  
    return png;
  }
  
  /**
   * Main execution
   */
  async function main() {
    try {
      await testTicketGenerator();
      console.log('─'.repeat(50));
      await simulateAPIEndpoint();
    } catch (error) {
      console.error('❌ Error during testing:', error);
      process.exit(1);
    }
  }
  
  // Run the driver
  main();
  
  // Export for use in other modules
  export { testTicketGenerator, simulateAPIEndpoint };