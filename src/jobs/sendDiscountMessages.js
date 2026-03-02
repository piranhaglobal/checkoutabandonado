import cron from 'node-cron';
import { fetchFiveDaysAbandonedCheckouts } from '../queries/fiveDaysAbandoned.js';
import { runWhatsAppJob } from './whatsappJobRunner.js';

export async function runDiscountJob() {
    console.log('\n[DiscountJob] Starting...');
    await runWhatsAppJob({
        templateType: 'discount',
        daysAgo: 5,
        fetchCheckouts: fetchFiveDaysAbandonedCheckouts
    });
}

export function registerDiscountJob() {
    const schedule = '0 9-18 * * 1-5';
    if (!cron.validate(schedule)) {
        console.error('[DiscountJob] Invalid cron expression. Job not registered.');
        return;
    }
    cron.schedule(schedule, runDiscountJob, {
        scheduled: true,
        timezone: process.env.DISPATCH_TZ || 'Europe/Lisbon'
    });
    console.log('[DiscountJob] Scheduled hourly (09-18) on business days.');
}
