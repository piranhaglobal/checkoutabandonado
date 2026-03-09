import { acquireDispatchLock, hasTemplateBeenSentWithinDays, logWhatsAppDispatch } from '../db/database.js';

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
    const lockKey = `${templateType}|${phone}|${checkoutAbandonedAt || ''}`;
    return acquireDispatchLock({
        lockKey,
        phone,
        templateType,
        checkoutAbandonedAt
    });
}
