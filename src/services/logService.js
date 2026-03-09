import { acquireDispatchLock, hasTemplateBeenSentWithinDays, logWhatsAppDispatch } from '../db/database.js';

function normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '');
}

export async function alreadySentTemplate(phone, templateType, windowDays) {
    return hasTemplateBeenSentWithinDays(phone, templateType, windowDays);
}

export async function logDispatchAttempt({ phone, email, templateType, status, errorMessage, leadData, abandonedAt }) {
    return logWhatsAppDispatch({
        phone,
        email,
        template_type: templateType,
        status,
        error_message: errorMessage,
        lead_data: leadData,
        checkout_abandoned_at: abandonedAt
    });
}

export async function acquireLeadDispatchLock({ phone, templateType, checkoutAbandonedAt }) {
    const normalizedPhone = normalizePhone(phone) || String(phone || '');
    const lockKey = `${templateType}|${normalizedPhone}|${checkoutAbandonedAt || ''}`;
    return acquireDispatchLock({
        lockKey,
        phone: normalizedPhone,
        templateType,
        checkoutAbandonedAt
    });
}
