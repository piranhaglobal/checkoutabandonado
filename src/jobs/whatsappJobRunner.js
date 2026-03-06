import { isWithinBusinessHours, isEligibleForSend } from '../utils/dateUtils.js';
import { sendTemplateMessage } from '../services/whatsappService.js';
import { alreadySentTemplate, logDispatchAttempt } from '../services/logService.js';
import { hasOrderForLeadSince } from '../shopify/orders.js';

function buildLeadFromCheckout(checkout) {
    const email = checkout.email || checkout.customer?.email || '';
    const phone = checkout.phone
        || checkout.billing_address?.phone
        || checkout.shipping_address?.phone
        || '';
    const firstName = checkout.billing_address?.first_name
        || checkout.shipping_address?.first_name
        || '';
    const lastName = checkout.billing_address?.last_name
        || checkout.shipping_address?.last_name
        || '';
    const countryCode = checkout.billing_address?.country_code
        || checkout.shipping_address?.country_code
        || '';
    const productName = checkout.line_items?.[0]?.title || 'produto';

    return {
        email,
        phone,
        first_name: firstName,
        last_name: lastName,
        abandoned_checkout_url: checkout.abandoned_checkout_url || checkout.checkout_url || '',
        country_code: countryCode,
        product_name: productName
    };
}

export async function runWhatsAppJob({ templateType, daysAgo, fetchCheckouts }) {
    const tz = process.env.DISPATCH_TZ || 'Europe/Lisbon';
    const startHour = parseInt(process.env.DISPATCH_START_HOUR || '9', 10);
    const endHour = parseInt(process.env.DISPATCH_END_HOUR || '18', 10);
    const includeWeekends = String(process.env.DISPATCH_INCLUDE_WEEKENDS || 'false').toLowerCase() === 'true';
    const windowDays = parseInt(process.env.WHATSAPP_TEMPLATE_WINDOW_DAYS || '30', 10);
    const now = new Date();

    if (!isWithinBusinessHours(now, tz, startHour, endHour, includeWeekends)) {
        console.log(`[WhatsAppJob] Outside business hours ${startHour}:00-${endHour}:00 ${tz}.`);
        return;
    }

    let checkouts;
    try {
        checkouts = await fetchCheckouts();
    } catch (error) {
        console.error(`[WhatsAppJob] Failed to fetch checkouts: ${error.message}`);
        return;
    }

    if (!checkouts || checkouts.length === 0) {
        console.log('[WhatsAppJob] No abandoned checkouts found.');
        return;
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let purchased = 0;
    let noPhone = 0;
    let noEmail = 0;

    for (const checkout of checkouts) {
        const lead = buildLeadFromCheckout(checkout);
        if (!lead.email) {
            noEmail++;
            continue;
        }
        if (!lead.phone) {
            noPhone++;
            continue;
        }

        const abandonedAt = new Date(checkout.created_at);
        if (!isEligibleForSend(abandonedAt, now, daysAgo, tz, startHour, endHour, includeWeekends)) {
            continue;
        }

        const alreadySent = await alreadySentTemplate(lead.phone, templateType, windowDays);
        if (alreadySent) {
            skipped++;
            continue;
        }

        const hasPurchased = await hasOrderForLeadSince({
            email: lead.email,
            phone: lead.phone,
            since: abandonedAt
        });
        if (hasPurchased) {
            purchased++;
            continue;
        }

        const result = await sendTemplateMessage(lead, templateType);
        await logDispatchAttempt({
            phone: lead.phone,
            email: lead.email,
            templateType,
            status: result.success ? result.status || 'SENT' : 'FAILED',
            errorMessage: result.error || null,
            leadData: {
                product_name: lead.product_name,
                checkout_url: lead.abandoned_checkout_url,
                template_type: templateType
            },
            abandonedAt: checkout.created_at
        });

        if (result.success) sent++;
        else failed++;

        const minSec = parseInt(process.env.DISPATCH_MIN_DELAY_SEC || '15', 10);
        const maxSec = parseInt(process.env.DISPATCH_MAX_DELAY_SEC || '45', 10);
        const d = (Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec) * 1000;
        await new Promise(r => setTimeout(r, d));
    }

    console.log(`[WhatsAppJob] Template: ${templateType}`);
    console.log(`[WhatsAppJob] Sent: ${sent} | Failed: ${failed} | Skipped: ${skipped} | Purchased: ${purchased} | No phone: ${noPhone} | No email: ${noEmail}`);
}
