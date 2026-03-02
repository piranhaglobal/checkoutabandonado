import { fetchAbandonedCheckoutsByDaysAgo } from '../shopify/abandonedCheckouts.js';

export async function fetchFiveDaysAbandonedCheckouts() {
    const tz = process.env.DISPATCH_TZ || 'Europe/Lisbon';
    return fetchAbandonedCheckoutsByDaysAgo(5, tz, 2);
}
