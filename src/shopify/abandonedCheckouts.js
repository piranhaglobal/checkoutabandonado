import { getShopifyAccessToken } from './auth.js';

/**
 * Fetches all abandoned checkouts from Shopify for a given date range.
 * Uses the /admin/api/checkouts.json endpoint which only returns checkouts
 * that have NOT been converted into orders (i.e. truly abandoned).
 *
 * @param {string} dateMin - ISO 8601 start datetime, e.g. "2026-02-23T00:00:00"
 * @param {string} dateMax - ISO 8601 end datetime,   e.g. "2026-02-23T23:59:59"
 * @returns {Promise<Array>} Array of checkout objects from Shopify
 */
export async function fetchAbandonedCheckouts(dateMin, dateMax) {
    // Strip any accidental protocol prefix (https:// or http://) the user may have added
    const storeUrl = (process.env.SHOPIFY_STORE_URL || '').replace(/^https?:\/\//, '');
    const token = getShopifyAccessToken();

    if (!storeUrl) {
        throw new Error('SHOPIFY_STORE_URL is missing from environment variables.');
    }

    const baseUrl = `https://${storeUrl}/admin/api/2024-01/checkouts.json`;
    const allCheckouts = [];

    // Shopify paginates with a page_info cursor. We start with the first page.
    let nextPageUrl = `${baseUrl}?created_at_min=${encodeURIComponent(dateMin)}&created_at_max=${encodeURIComponent(dateMax)}&limit=250`;

    console.log(`[AbandonedCheckouts] Fetching from Shopify: ${dateMin} → ${dateMax}`);

    while (nextPageUrl) {
        const response = await fetch(nextPageUrl, {
            headers: {
                'X-Shopify-Access-Token': token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Shopify Checkouts API error: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        const page = data.checkouts || [];
        allCheckouts.push(...page);

        console.log(`[AbandonedCheckouts] Retrieved ${page.length} checkouts (total so far: ${allCheckouts.length})`);

        // Handle Shopify cursor-based pagination via Link header
        const linkHeader = response.headers.get('link');
        nextPageUrl = extractNextPageUrl(linkHeader);
    }

    console.log(`[AbandonedCheckouts] Fetch complete. Total: ${allCheckouts.length} abandoned checkouts.`);
    return allCheckouts;
}

/**
 * Extracts the "next" page URL from Shopify's Link header.
 * Shopify format: <https://...?page_info=xxx>; rel="next"
 *
 * @param {string|null} linkHeader
 * @returns {string|null} Next page URL or null if no more pages
 */
function extractNextPageUrl(linkHeader) {
    if (!linkHeader) return null;

    const parts = linkHeader.split(',');
    for (const part of parts) {
        const match = part.match(/<([^>]+)>;\s*rel="next"/);
        if (match) return match[1];
    }
    return null;
}

/**
 * Convenience helper: returns abandoned checkouts from yesterday (local time).
 * Intended to be called by the daily scheduled job.
 *
 * @returns {Promise<Array>}
 */
export async function fetchYesterdaysAbandonedCheckouts() {
    const now = new Date();

    // Build yesterday's date boundaries in ISO 8601 (UTC)
    const yesterday = new Date(now);
    yesterday.setUTCDate(now.getUTCDate() - 1);

    const dateMin = `${yesterday.toISOString().slice(0, 10)}T00:00:00`;
    const dateMax = `${yesterday.toISOString().slice(0, 10)}T23:59:59`;

    return fetchAbandonedCheckouts(dateMin, dateMax);
}
