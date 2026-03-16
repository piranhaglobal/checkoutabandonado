import cron from 'node-cron';
import { fetchOneDayAbandonedCheckouts } from '../queries/oneDayAbandoned.js';
import { runWhatsAppJob } from './whatsappJobRunner.js';

let urgencyJobRunning = false;

export async function runUrgencyJob() {
    if (urgencyJobRunning) {
        console.log('[UrgencyJob] Previous run still in progress. Skipping overlap.');
        return;
    }
    urgencyJobRunning = true;
    console.log('\n[UrgencyJob] Starting...');
    try {
        await runWhatsAppJob({
            templateType: 'urgency',
            daysAgo: 1,
            fetchCheckouts: fetchOneDayAbandonedCheckouts
        });
    } finally {
        urgencyJobRunning = false;
    }
}

export function registerUrgencyJob() {
    const includeWeekends = String(process.env.DISPATCH_INCLUDE_WEEKENDS || 'true').toLowerCase() === 'true';
    const schedule = includeWeekends ? '0 9-18 * * *' : '0 9-18 * * 1-5';
    if (!cron.validate(schedule)) {
        console.error('[UrgencyJob] Invalid cron expression. Job not registered.');
        return;
    }
    cron.schedule(schedule, runUrgencyJob, {
        scheduled: true,
        timezone: process.env.DISPATCH_TZ || 'Europe/Lisbon'
    });
    console.log(`[UrgencyJob] Scheduled hourly (09-18) ${includeWeekends ? 'every day' : 'on business days'}.`);
}
