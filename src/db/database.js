import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB
const dbPath = path.resolve(__dirname, '../../data/checkouts.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS whatsapp_dispatch_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT NOT NULL,
                email TEXT,
                template_type TEXT NOT NULL,
                status TEXT NOT NULL,
                error_message TEXT,
                lead_data TEXT,
                checkout_abandoned_at DATETIME,
                dispatched_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE INDEX IF NOT EXISTS idx_whatsapp_log_phone_template_date
                ON whatsapp_dispatch_log(phone, template_type, dispatched_at)`);

            db.run(`CREATE INDEX IF NOT EXISTS idx_whatsapp_log_email_abandoned
                ON whatsapp_dispatch_log(email, checkout_abandoned_at)`);

            db.run(`CREATE TABLE IF NOT EXISTS whatsapp_dispatch_locks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lock_key TEXT NOT NULL UNIQUE,
                phone TEXT NOT NULL,
                template_type TEXT NOT NULL,
                checkout_abandoned_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE INDEX IF NOT EXISTS idx_whatsapp_lock_phone_template
                ON whatsapp_dispatch_locks(phone, template_type, created_at)`);

            db.run(`CREATE TABLE IF NOT EXISTS whatsapp_dispatches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                status TEXT DEFAULT 'SENT',
                checkout_abandoned_at DATE,
                dispatched_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE INDEX IF NOT EXISTS idx_whatsapp_email_date 
                ON whatsapp_dispatches(email, checkout_abandoned_at)`);
        });
    }
});

function normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '');
}

export function hasWhatsAppBeenSent(email, abandonedDate) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT id FROM whatsapp_dispatch_log WHERE email = ? AND checkout_abandoned_at = ?',
            [email, abandonedDate],
            (err, row) => {
                if (err) reject(err);
                resolve(!!row);
            }
        );
    });
}

export function logWhatsAppDispatch(data) {
    const templateType = data.template_type || 'legacy';
    const status = data.status || 'SENT';
    const leadData = data.lead_data ? JSON.stringify(data.lead_data) : null;
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO whatsapp_dispatch_log (email, phone, template_type, status, error_message, lead_data, checkout_abandoned_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                data.email || null,
                data.phone,
                templateType,
                status,
                data.error_message || null,
                leadData,
                data.checkout_abandoned_at || null
            ],
            function (err) {
                if (err) reject(err);
                resolve(this.lastID);
            }
        );
    });
}

export function hasTemplateBeenSentWithinDays(phone, templateType, days) {
    return new Promise((resolve, reject) => {
        const targetPhone = normalizePhone(phone);
        if (!targetPhone) {
            resolve(false);
            return;
        }
        db.all(
            `SELECT phone FROM whatsapp_dispatch_log
             WHERE template_type = ? AND dispatched_at >= datetime('now', ?)
             ORDER BY dispatched_at DESC`,
            [templateType, `-${days} days`],
            (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                const found = rows.some((row) => normalizePhone(row.phone) === targetPhone);
                resolve(found);
            }
        );
    });
}

export function acquireDispatchLock({ lockKey, phone, templateType, checkoutAbandonedAt }) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR IGNORE INTO whatsapp_dispatch_locks (lock_key, phone, template_type, checkout_abandoned_at)
             VALUES (?, ?, ?, ?)`,
            [lockKey, phone, templateType, checkoutAbandonedAt || null],
            function (err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this.changes > 0);
            }
        );
    });
}

export default db;
