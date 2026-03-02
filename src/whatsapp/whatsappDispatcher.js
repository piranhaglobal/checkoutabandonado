/**
 * WhatsApp Dispatcher — Evolution API 2.0
 * -----------------------------------------
 * Sends WhatsApp text messages to leads who abandoned their checkout.
 *
 * This dispatcher uses the Evolution API (self-hosted on VPS).
 * Until the VPS is set up, calls will fail gracefully with a clear error.
 *
 * ENV VARS REQUIRED:
 *   EVOLUTION_API_URL        — e.g. https://evolution.yourdomain.com
 *   EVOLUTION_API_KEY        — Your Evolution API global key
 *   EVOLUTION_INSTANCE_NAME  — Name of the WhatsApp instance in Evolution
 *   WHATSAPP_COUPON_CODE     — Promo coupon (e.g. PIRANHA5)
 *   WHATSAPP_DISCOUNT_PERCENT— Discount % shown in message (e.g. 5)
 */

/**
 * Formats a phone number to the format expected by Evolution API.
 * Evolution API expects: country code + number, no "+" prefix, no spaces.
 * Example: "+351 912 345 678" → "351912345678"
 *
 * @param {string} raw - Raw phone number from Klaviyo/Shopify
 * @returns {string|null} - Formatted phone or null if invalid
 */
function formatPhone(raw) {
    if (!raw) return null;

    // Strip everything except digits
    const digits = raw.replace(/\D/g, '');

    // Minimum viable phone number (country code + local number)
    if (digits.length < 8) return null;

    return digits;
}

/**
 * Builds the WhatsApp recovery message for a given lead.
 *
 * @param {object} lead
 * @param {string} lead.first_name
 * @param {string} lead.abandoned_checkout_url
 * @returns {string}
 */
function resolveLanguage(lead) {
    const code = (lead.country_code || '').toUpperCase();
    if (code === 'ES') return 'es';
    if (code === 'FR') return 'fr';
    if (code === 'PT' || code === 'BR') return 'pt';
    if (code === 'BE' || code === 'CH' || code === 'LU') return 'fr';
    return 'en';
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildMessageParts(lead) {
    const coupon = process.env.WHATSAPP_COUPON_CODE || 'PIRANHA5';
    const discount = process.env.WHATSAPP_DISCOUNT_PERCENT || '5';
    const recoveryUrl = lead.abandoned_checkout_url || '';
    const language = resolveLanguage(lead);

    const names = {
        pt: 'amigo(a)',
        es: 'amigo(a)',
        fr: 'ami(e)',
        en: 'friend'
    };

    const name = lead.first_name ? lead.first_name.trim() : names[language];

    const templatesByLanguage = {
        pt: [
            [
                `Olá ${name}! 👋`,
                `Notámos que o teu checkout ficou pendente na Piranha Supplies.`,
                `Se quiseres finalizar, tens *${discount}% de desconto* com o cupão *${coupon}* válido nas próximas 24h.`,
                recoveryUrl ? `👉 Finaliza aqui:\n${recoveryUrl}` : '',
                `Qualquer dúvida, estamos aqui! 💪`
            ],
            [
                `Olá ${name}! 👋`,
                `Ficou algo no teu carrinho e ainda está reservado para ti.`,
                `Usa o cupão *${coupon}* e garante *${discount}% de desconto* nas próximas 24h.`,
                recoveryUrl ? `👉 Link direto do carrinho:\n${recoveryUrl}` : '',
                `Se precisares de ajuda, é só responder por aqui.`
            ],
            [
                `Olá ${name}! 👋`,
                `O teu checkout foi interrompido e ainda tens os produtos à tua espera.`,
                `Temos *${discount}% de desconto* com o cupão *${coupon}* (válido por 24h).`,
                recoveryUrl ? `👉 Conclui aqui:\n${recoveryUrl}` : '',
                `Estamos disponíveis para ajudar.`
            ]
        ],
        es: [
            [
                `¡Hola ${name}! 👋`,
                `Vimos que tu checkout quedó pendiente en Piranha Supplies.`,
                `Si quieres finalizar, tienes *${discount}% de descuento* con el cupón *${coupon}* válido por 24h.`,
                recoveryUrl ? `👉 Finaliza aquí:\n${recoveryUrl}` : '',
                `Cualquier duda, estamos aquí para ayudarte.`
            ],
            [
                `¡Hola ${name}! 👋`,
                `Tu carrito quedó guardado y aún está reservado para ti.`,
                `Usa el cupón *${coupon}* y obtén *${discount}% de descuento* en las próximas 24h.`,
                recoveryUrl ? `👉 Enlace directo al carrito:\n${recoveryUrl}` : '',
                `Si necesitas ayuda, responde por aquí.`
            ],
            [
                `¡Hola ${name}! 👋`,
                `Tu checkout se interrumpió y los productos siguen esperando.`,
                `Tienes *${discount}% de descuento* con el cupón *${coupon}* (válido por 24h).`,
                recoveryUrl ? `👉 Completa aquí:\n${recoveryUrl}` : '',
                `Estamos disponibles para ayudarte.`
            ]
        ],
        fr: [
            [
                `Bonjour ${name} ! 👋`,
                `Votre commande est restée en attente chez Piranha Supplies.`,
                `Vous avez *${discount}% de réduction* avec le code *${coupon}* valable 24h.`,
                recoveryUrl ? `👉 Finalisez ici :\n${recoveryUrl}` : '',
                `Si besoin, on est là pour vous aider.`
            ],
            [
                `Bonjour ${name} ! 👋`,
                `Votre panier est toujours réservé pour vous.`,
                `Utilisez le code *${coupon}* pour *${discount}% de réduction* pendant 24h.`,
                recoveryUrl ? `👉 Lien direct du panier :\n${recoveryUrl}` : '',
                `Répondez ici si vous avez une question.`
            ],
            [
                `Bonjour ${name} ! 👋`,
                `Votre checkout a été interrompu et vos produits vous attendent.`,
                `Profitez de *${discount}% de réduction* avec le code *${coupon}* (24h).`,
                recoveryUrl ? `👉 Terminez ici :\n${recoveryUrl}` : '',
                `Nous sommes disponibles pour aider.`
            ]
        ],
        en: [
            [
                `Hi ${name}! 👋`,
                `We noticed your checkout was left pending at Piranha Supplies.`,
                `You get *${discount}% off* with code *${coupon}* valid for 24h.`,
                recoveryUrl ? `👉 Finish here:\n${recoveryUrl}` : '',
                `If you need help, just reply here.`
            ],
            [
                `Hi ${name}! 👋`,
                `Your cart is still reserved for you.`,
                `Use code *${coupon}* to get *${discount}% off* for the next 24h.`,
                recoveryUrl ? `👉 Direct cart link:\n${recoveryUrl}` : '',
                `Happy to help if you need anything.`
            ],
            [
                `Hi ${name}! 👋`,
                `Your checkout was interrupted and the items are still waiting.`,
                `Take *${discount}% off* with code *${coupon}* (valid 24h).`,
                recoveryUrl ? `👉 Complete here:\n${recoveryUrl}` : '',
                `We’re here if you need help.`
            ]
        ]
    };

    const templates = templatesByLanguage[language] || templatesByLanguage.en;
    const picked = templates[Math.floor(Math.random() * templates.length)];
    return picked.filter(Boolean);
}

export async function sendWhatsAppMessageParts(lead, messageParts) {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME;

    if (!apiUrl || !apiKey || !instanceName) {
        console.warn(
            `[WhatsApp] ⚠️  Evolution API not configured yet (VPS not set up). ` +
            `Skipping send for ${lead.email}. ` +
            `Set EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME when ready.`
        );
        return { success: false, status: 'FAILED', error: 'Missing Evolution API configuration.' };
    }

    const phone = formatPhone(lead.phone);
    if (!phone) {
        console.warn(`[WhatsApp] 📵 Invalid or missing phone for ${lead.email}. Skipping.`);
        return { success: false, status: 'FAILED', error: 'Invalid phone.' };
    }

    const endpoint = `${apiUrl.replace(/\/$/, '')}/message/sendText/${instanceName}`;
    let lastStatus = 'PENDING';

    for (const part of messageParts) {
        let retries = 3;
        let delay = 1000;
        const presenceMin = parseInt(process.env.PRESENCE_MIN_MS || '1000', 10);
        const presenceMax = parseInt(process.env.PRESENCE_MAX_MS || '3000', 10);
        const presence = rand(presenceMin, presenceMax);

        while (retries > 0) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'apikey': apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        number: phone,
                        text: part,
                        delay: presence
                    })
                });

                if (response.status === 429) {
                    console.warn(`[WhatsApp] Rate limit hit, retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    delay *= 2;
                    retries--;
                    continue;
                }

                const responseText = await response.text();
                if (!response.ok) {
                    throw new Error(`Evolution API error: ${response.status} - ${responseText}`);
                }

                if (responseText) {
                    console.log(`[WhatsApp] Response: ${responseText}`);
                    try {
                        const parsed = JSON.parse(responseText);
                        if (parsed.status) lastStatus = parsed.status;
                    } catch (err) {
                        lastStatus = lastStatus;
                    }
                }

                break;

            } catch (error) {
                retries--;
                if (retries === 0) {
                    console.error(`[WhatsApp] ❌ Failed to send to ${lead.email} after retries:`, error.message);
                    return { success: false, status: 'FAILED', error: error.message };
                }
                console.warn(`[WhatsApp] Retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
                delay *= 2;
            }
        }

        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`[WhatsApp] ✅ Sent to ${lead.email} (${phone})`);
    return { success: true, status: lastStatus, error: null };
}

/**
 * Sends a WhatsApp message to a single lead via Evolution API.
 *
 * @param {object} lead
 * @param {string} lead.phone                  - Raw phone number
 * @param {string} lead.first_name
 * @param {string} lead.email
 * @param {string} [lead.abandoned_checkout_url]
 * @returns {Promise<boolean>} - true if sent, false if failed
 */
export async function sendWhatsAppRecovery(lead) {
    const messageParts = buildMessageParts(lead);
    const result = await sendWhatsAppMessageParts(lead, messageParts);
    return result.success;
}

/**
 * Sends WhatsApp messages to a batch of leads.
 * Includes a delay between sends to avoid rate limiting.
 *
 * @param {Array} leads
 * @returns {Promise<{sent: number, failed: number, noPhone: number}>}
 */
export async function sendWhatsAppBatch(leads) {
    let sent = 0;
    let failed = 0;
    let noPhone = 0;
    const minSec = parseInt(process.env.DISPATCH_MIN_DELAY_SEC || '15', 10);
    const maxSec = parseInt(process.env.DISPATCH_MAX_DELAY_SEC || '45', 10);

    for (const lead of leads) {
        if (!lead.phone || !formatPhone(lead.phone)) {
            noPhone++;
            console.log(`[WhatsApp] 📵 No valid phone for ${lead.email}`);
            continue;
        }

        const success = await sendWhatsAppRecovery(lead);
        if (success) {
            sent++;
        } else {
            failed++;
        }

        const d = rand(minSec, maxSec) * 1000;
        await new Promise(r => setTimeout(r, d));
    }

    return { sent, failed, noPhone };
}
