import cron from 'node-cron';
import { fetchOneDayAbandonedCheckouts } from '../queries/oneDayAbandoned.js';
import { runWhatsAppJob } from './whatsappJobRunner.js';

export async function runUrgencyJob() {
    console.log('\n[UrgencyJob] Starting...');
    await runWhatsAppJob({
        templateType: 'urgency',
        daysAgo: 1,
        fetchCheckouts: fetchOneDayAbandonedCheckouts
    });
}

export function registerUrgencyJob() {
    const schedule = '0 9-18 * * 1-5';
    if (!cron.validate(schedule)) {
        console.error('[UrgencyJob] Invalid cron expression. Job not registered.');
        return;
    }
    cron.schedule(schedule, runUrgencyJob, {
        scheduled: true,
        timezone: process.env.DISPATCH_TZ || 'Europe/Lisbon'
    });
    console.log('[UrgencyJob] Scheduled hourly (09-18) on business days.');
}
