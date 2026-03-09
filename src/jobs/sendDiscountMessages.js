import cron from 'node-cron';
import { fetchFiveDaysAbandonedCheckouts } from '../queries/fiveDaysAbandoned.js';
import { runWhatsAppJob } from './whatsappJobRunner.js';

let discountJobRunning = false;

export async function runDiscountJob() {
    if (discountJobRunning) {
        console.log('[DiscountJob] Previous run still in progress. Skipping overlap.');
        return;
    }
    discountJobRunning = true;
    console.log('\n[DiscountJob] Starting...');
    try {
        await runWhatsAppJob({
            templateType: 'discount',
            daysAgo: 5,
            fetchCheckouts: fetchFiveDaysAbandonedCheckouts
        });
    } finally {
        discountJobRunning = false;
    }
}

export function registerDiscountJob() {
    const includeWeekends = String(process.env.DISPATCH_INCLUDE_WEEKENDS || 'false').toLowerCase() === 'true';
    const schedule = includeWeekends ? '0 9-18 * * *' : '0 9-18 * * 1-5';
    if (!cron.validate(schedule)) {
        console.error('[DiscountJob] Invalid cron expression. Job not registered.');
        return;
    }
    cron.schedule(schedule, runDiscountJob, {
        scheduled: true,
        timezone: process.env.DISPATCH_TZ || 'Europe/Lisbon'
    });
    console.log(`[DiscountJob] Scheduled hourly (09-18) ${includeWeekends ? 'every day' : 'on business days'}.`);
}
