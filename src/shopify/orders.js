import { getShopifyAccessToken } from './auth.js';

async function* fetchOrders({ dateMin, dateMax, email }) {
    const storeUrl = (process.env.SHOPIFY_STORE_URL || '').replace(/^https?:\/\//, '');
    const token = getShopifyAccessToken();

    if (!storeUrl) {
        throw new Error('SHOPIFY_STORE_URL is missing from environment variables.');
    }

    const baseUrl = `https://${storeUrl}/admin/api/2024-01/orders.json`;
    const params = new URLSearchParams({
        status: 'any',
        limit: '250',
        created_at_min: dateMin,
        created_at_max: dateMax
    });
    if (email) params.set('email', email);

    let nextPageUrl = `${baseUrl}?${params.toString()}`;

    while (nextPageUrl) {
        const response = await fetch(nextPageUrl, {
            headers: {
                'X-Shopify-Access-Token': token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Shopify Orders API error: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        const page = data.orders || [];
        yield page;

        const linkHeader = response.headers.get('link');
        nextPageUrl = extractNextPageUrl(linkHeader);
    }
}

function extractNextPageUrl(linkHeader) {
    if (!linkHeader) return null;
    const parts = linkHeader.split(',');
    for (const part of parts) {
        const match = part.match(/<([^>]+)>;\s*rel="next"/);
        if (match) return match[1];
    }
    return null;
}

function normalizePhone(phone) {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
}

export async function hasOrderForLeadSince({ email, phone, since }) {
    const dateMin = since.toISOString();
    const dateMax = new Date().toISOString();
    const targetPhone = normalizePhone(phone);

    if (email) {
        for await (const page of fetchOrders({ dateMin, dateMax, email })) {
            if (page.length > 0) return true;
        }
    }

    if (!targetPhone) return false;

    for await (const page of fetchOrders({ dateMin, dateMax })) {
        for (const order of page) {
            const orderPhone = normalizePhone(
                order.phone ||
                order.billing_address?.phone ||
                order.shipping_address?.phone ||
                ''
            );
            if (orderPhone && orderPhone === targetPhone) {
                return true;
            }
        }
    }

    return false;
}
