import { fetchAbandonedCheckoutsByDaysAgo } from '../shopify/abandonedCheckouts.js';

export async function fetchOneDayAbandonedCheckouts() {
    const tz = process.env.DISPATCH_TZ || 'Europe/Lisbon';
    return fetchAbandonedCheckoutsByDaysAgo(1, tz, 2);
}
