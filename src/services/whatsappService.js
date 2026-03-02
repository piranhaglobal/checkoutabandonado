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

function resolveLanguage(lead) {
    const code = (lead.country_code || '').toUpperCase();
    if (code === 'ES') return 'es';
    if (code === 'FR') return 'fr';
    if (code === 'PT' || code === 'BR') return 'pt';
    if (code === 'BE' || code === 'CH' || code === 'LU') return 'fr';
    return 'en';
}

function renderTemplatePart(part, template, data) {
    const merged = {
        ...template.defaults,
        ...data
    };
    return part.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
        const value = merged[key];
        return value !== undefined && value !== null ? String(value) : '';
    });
}

export async function sendTemplateMessage(lead, templateType) {
    const template = await loadTemplate(templateType);
    const language = resolveLanguage(lead);
    const languageParts = template.languages?.[language] || template.languages?.en || template.parts || [];
    const parts = Array.isArray(languageParts[0])
        ? languageParts[Math.floor(Math.random() * languageParts.length)]
        : languageParts;
    const discountCode = process.env.WHATSAPP_DISCOUNT_CODE || template.defaults?.discount_code || 'ORDER10';
    const names = {
        pt: 'amigo(a)',
        es: 'amigo(a)',
        fr: 'ami(e)',
        en: 'friend'
    };
    const fallbackName = names[language] || 'friend';
    const messageParts = parts.map((part) => renderTemplatePart(part, template, {
        first_name: lead.first_name || fallbackName,
        product_name: lead.product_name || 'produto',
        checkout_url: lead.abandoned_checkout_url || '',
        discount_code: discountCode
    })).filter((part) => part && part.trim() !== '');
    return sendWhatsAppMessageParts(lead, messageParts);
}
