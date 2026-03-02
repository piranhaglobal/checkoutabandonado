// scripts/test-job.mjs
// Run with: node scripts/test-job.mjs
// This runs the abandoned checkout recovery job in isolation (no server needed)

import dotenv from 'dotenv';
dotenv.config();

import { runUrgencyJob } from '../src/jobs/sendUrgencyMessages.js';
import { runDiscountJob } from '../src/jobs/sendDiscountMessages.js';

console.log('='.repeat(60));
console.log('  PIRANHA - TEST: WhatsApp Jobs');
console.log('='.repeat(60));
console.log(`  Store:     ${process.env.SHOPIFY_STORE_URL}`);
console.log(`  Timestamp: ${new Date().toISOString()}`);
console.log('='.repeat(60));
console.log('');

try {
    await runUrgencyJob();
    await runDiscountJob();
    console.log('\n✅ Script finished successfully.');
} catch (err) {
    console.error('\n❌ Script failed with error:', err.message);
    process.exit(1);
}
