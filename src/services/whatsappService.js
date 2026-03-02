import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendWhatsAppMessageParts } from '../whatsapp/whatsappDispatcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateCache = new Map();

async function loadTemplate(type) {
    if (templateCache.has(type)) {
        return templateCache.get(type);
    }
    const filePath = path.resolve(__dirname, `../templates/${type}.json`);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    templateCache.set(type, parsed);
    return parsed;
}

function renderTemplate(template, data) {
    const base = template.parts.join('\n');
    const merged = {
        ...template.defaults,
        ...data
    };
    return base.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
        const value = merged[key];
        return value !== undefined && value !== null ? String(value) : '';
    });
}

export async function sendTemplateMessage(lead, templateType) {
    const template = await loadTemplate(templateType);
    const discountCode = process.env.WHATSAPP_DISCOUNT_CODE || template.defaults?.discount_code || 'ORDER10';
    const message = renderTemplate(template, {
        first_name: lead.first_name || 'amigo(a)',
        product_name: lead.product_name || 'produto',
        checkout_url: lead.abandoned_checkout_url || '',
        discount_code: discountCode
    });
    const messageParts = [message];
    return sendWhatsAppMessageParts(lead, messageParts);
}
