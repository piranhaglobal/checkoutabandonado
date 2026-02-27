import cron from 'node-cron';
import { fetchYesterdaysAbandonedCheckouts } from '../shopify/abandonedCheckouts.js';
import { hasWhatsAppBeenSent, logWhatsAppDispatch } from '../db/database.js';

/**
 * Daily Abandoned Checkout Recovery Job — WhatsApp 2nd Touch
 * -----------------------------------------------------------
 * Runs every day at 09:00 (Europe/Lisbon).
 *
 * Flow:
 *  1. Fetch abandoned checkouts from Shopify for yesterday
 *  2. For each lead with a phone number:
 *       → Send a WhatsApp recovery message (via Evolution API)
 *  3. Log dispatch to DB for idempotency (won't send twice to the same lead)
 *
 * NOTE: This job is responsible ONLY for the WhatsApp channel.
 */

export async function runDailyRecoveryJob() {
    console.log('\n[DailyJob] ⏰ ─── Starting WhatsApp Recovery Job ───');
    console.log(`[DailyJob] 🕐 Time: ${new Date().toISOString()}`);

    // ── STEP 1: Get abandoned checkouts from Shopify (yesterday) ──
    let checkouts;
    try {
        checkouts = await fetchYesterdaysAbandonedCheckouts();
    } catch (error) {
        console.error('[DailyJob] ❌ Failed to fetch abandoned checkouts from Shopify:', error.message);
        return;
    }

    if (!checkouts || checkouts.length === 0) {
        console.log('[DailyJob] ✅ No abandoned checkouts found for yesterday. Nothing to do.');
        return;
    }

    console.log(`[DailyJob] 📋 ${checkouts.length} abandoned checkout(s) found.`);

    // ── STEP 2: Filter leads and build WhatsApp send list ──
    const toSend = [];
    let alreadySentWhatsApp = 0;
    let noPhone = 0;
    let noEmail = 0;

    for (const checkout of checkouts) {
        const email = checkout.email || checkout.customer?.email || '';
        if (!email) {
            noEmail++;
            continue;
        }

        // Idempotency: skip if we already sent WhatsApp to this lead today
        const abandonedDate = checkout.created_at
            ? checkout.created_at.slice(0, 10)
            : new Date().toISOString().slice(0, 10);

        const alreadySent = await hasWhatsAppBeenSent(email, abandonedDate);
        if (alreadySent) {
            alreadySentWhatsApp++;
            console.log(`[DailyJob] ⏭️  Already sent WhatsApp to ${email} for ${abandonedDate}. Skipping.`);
            continue;
        }

        const phone = checkout.phone
            || checkout.billing_address?.phone
            || checkout.shipping_address?.phone
            || '';

        if (!phone || phone.trim() === '') {
            noPhone++;
            console.log(`[DailyJob] 📵 No phone for ${email}. Cannot send WhatsApp.`);
            continue;
        }

        const firstName = checkout.billing_address?.first_name
            || checkout.shipping_address?.first_name
            || '';

        const lastName = checkout.billing_address?.last_name
            || checkout.shipping_address?.last_name
            || '';

        const countryCode = checkout.billing_address?.country_code
            || checkout.shipping_address?.country_code
            || '';

        const lead = {
            email,
            phone,
            first_name: firstName,
            last_name: lastName,
            abandoned_checkout_url: checkout.abandoned_checkout_url || checkout.checkout_url || '',
            country_code: countryCode
        };

        toSend.push({ lead, abandonedDate });
    }

    console.log(`[DailyJob] 📊 Summary:`);
    console.log(`[DailyJob]   → Will send WhatsApp: ${toSend.length}`);
    console.log(`[DailyJob]   → Already sent WhatsApp (skip): ${alreadySentWhatsApp}`);
    console.log(`[DailyJob]   → No phone (skip): ${noPhone}`);
    console.log(`[DailyJob]   → No email (skip): ${noEmail}`);

    if (toSend.length === 0) {
        console.log('[DailyJob] ✅ No new WhatsApp messages to send.');
        return;
    }

    const tz = process.env.DISPATCH_TZ || 'Europe/Lisbon';
    const startHour = parseInt(process.env.DISPATCH_START_HOUR || '9', 10);
    const endHour = parseInt(process.env.DISPATCH_END_HOUR || '18', 10);

    function hourInTz() {
        const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: tz }).formatToParts(new Date());
        const h = parts.find(p => p.type === 'hour')?.value || '0';
        return parseInt(h, 10);
    }

    function withinWindow() {
        const h = hourInTz();
        return h >= startHour && h < endHour;
    }

    if (!withinWindow()) {
        console.log(`[DailyJob] ❌ Current time not within dispatch window ${startHour}:00-${endHour}:00 ${tz}. Aborting.`);
        return;
    }

    // ── STEP 3: Send WhatsApp messages ──
    console.log(`[DailyJob] 📱 Sending WhatsApp to ${toSend.length} lead(s)...`);

    let sent = 0;
    let failed = 0;

    for (const item of toSend) {
        if (!withinWindow()) {
            console.log(`[DailyJob] ⏹️  Reached end of dispatch window ${endHour}:00 ${tz}. Stopping.`);
            break;
        }
        const success = await sendSingleWithLog(item.lead, item.abandonedDate);
        if (success) sent++;
        else failed++;

        const minSec = parseInt(process.env.DISPATCH_MIN_DELAY_SEC || '15', 10);
        const maxSec = parseInt(process.env.DISPATCH_MAX_DELAY_SEC || '45', 10);
        const d = (Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec) * 1000;
        await new Promise(r => setTimeout(r, d));
    }

    // ── STEP 5: Final report ──
    console.log(`\n[DailyJob] 🏁 Job complete!`);
    console.log(`[DailyJob]   ✅ WhatsApp sent:         ${sent}`);
    console.log(`[DailyJob]   ❌ WhatsApp failed:       ${failed}`);
    console.log(`[DailyJob]   📵 No phone:              ${noPhone}`);
    console.log(`[DailyJob]   ⏭️  Already sent today:    ${alreadySentWhatsApp}`);
    console.log(`[DailyJob]   ✉️  No email:              ${noEmail}`);
    console.log('[DailyJob] ─────────────────────────────────────\n');
}

/**
 * Sends WhatsApp and logs the result to the DB for idempotency.
 * @param {object} lead
 * @param {string} abandonedDate - YYYY-MM-DD
 * @returns {Promise<boolean>}
 */
async function sendSingleWithLog(lead, abandonedDate) {
    const { sendWhatsAppRecovery } = await import('../whatsapp/whatsappDispatcher.js');

    const success = await sendWhatsAppRecovery(lead);

    // Always log the attempt (even failures) to avoid infinite retry loops
    await logWhatsAppDispatch({
        email: lead.email,
        phone: lead.phone || '',
        status: success ? 'SENT' : 'FAILED',
        checkout_abandoned_at: abandonedDate
    });

    return success;
}

/**
 * Registers the cron job at server startup.
 * Schedule: 09:00 every day (Europe/Lisbon timezone)
 */
export function registerDailyRecoveryJob() {
    if (!cron.validate('0 9 * * *')) {
        console.error('[DailyJob] ❌ Invalid cron expression. Job NOT registered.');
        return;
    }

    cron.schedule('0 9 * * *', runDailyRecoveryJob, {
        scheduled: true,
        timezone: 'Europe/Lisbon'
    });

    console.log('[DailyJob] ✅ WhatsApp recovery job scheduled at 09:00 (Europe/Lisbon).');
}
