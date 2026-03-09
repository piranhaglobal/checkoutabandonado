#!/usr/bin/env node
/**
 * test-whatsapp.mjs
 * -----------------
 * Isolated test script for the WhatsApp dispatcher.
 * Run with: node scripts/test-whatsapp.mjs
 *
 * This lets you validate the Evolution API connection before running the full job.
 * Fill in TEST_PHONE below with a real number you control.
 */

import dotenv from 'dotenv';
dotenv.config();

import { sendTemplateMessage } from '../src/services/whatsappService.js';

// ── Edit this to your test phone number ────────────────────────────────────
const TEST_PHONE = '+351965559253'; // ← Change to your number
const TEST_LEAD = {
    email: 'vinycius.melo@piranha.com.pt',
    phone: TEST_PHONE,
    first_name: 'Vinycius',
    abandoned_checkout_url: 'https://piranha-supplies-test.myshopify.com/70692044956/checkouts/ac/hWN9Bz165SoCbDg3d9h8AVb0/recover?key=decbdabdf29f8440e52fe83073edf518&locale=en-PT',
    country_code: 'PT'
};
// ───────────────────────────────────────────────────────────────────────────

console.log('🧪 Testing WhatsApp Dispatcher (discount template)...');
console.log(`📱 Sending to: ${TEST_PHONE}`);
console.log('─'.repeat(50));

sendTemplateMessage(TEST_LEAD, 'discount')
    .then(result => {
        if (result.success) {
            console.log('\n✅ Test passed! WhatsApp message sent successfully.');
        } else {
            console.log('\n⚠️  Test complete, but message was not sent.');
            console.log('   → If Evolution API is not yet configured, this is expected.');
            console.log('   → Check EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME in .env');
        }
    })
    .catch(err => {
        console.error('\n❌ Test failed with error:', err.message);
    });
