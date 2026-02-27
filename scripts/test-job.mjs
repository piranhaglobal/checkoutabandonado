// scripts/test-job.mjs
// Run with: node scripts/test-job.mjs
// This runs the abandoned checkout recovery job in isolation (no server needed)

import dotenv from 'dotenv';
dotenv.config();

import { runDailyRecoveryJob } from '../src/jobs/dailyAbandonedCheckoutJob.js';

console.log('='.repeat(60));
console.log('  PIRANHA - TEST: Daily Abandoned Checkout Job');
console.log('='.repeat(60));
console.log(`  Store:     ${process.env.SHOPIFY_STORE_URL}`);
console.log(`  Timestamp: ${new Date().toISOString()}`);
console.log('='.repeat(60));
console.log('');

try {
    await runDailyRecoveryJob();
    console.log('\n✅ Script finished successfully.');
} catch (err) {
    console.error('\n❌ Script failed with error:', err.message);
    process.exit(1);
}
