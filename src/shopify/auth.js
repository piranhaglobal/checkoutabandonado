export function getShopifyAccessToken() {
    const token = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!token) {
        throw new Error(
            '[Shopify Auth] SHOPIFY_ACCESS_TOKEN is missing from environment variables. ' +
            'Generate it in Shopify Admin → Apps → Develop apps → [Your App] → API credentials.'
        );
    }

    return token;
}
