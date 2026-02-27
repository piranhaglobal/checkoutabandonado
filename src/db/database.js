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

export function hasWhatsAppBeenSent(email, abandonedDate) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT id FROM whatsapp_dispatches WHERE email = ? AND checkout_abandoned_at = ?',
            [email, abandonedDate],
            (err, row) => {
                if (err) reject(err);
                resolve(!!row);
            }
        );
    });
}

export function logWhatsAppDispatch(data) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO whatsapp_dispatches (email, phone, status, checkout_abandoned_at)
             VALUES (?, ?, ?, ?)`,
            [data.email, data.phone, data.status, data.checkout_abandoned_at],
            function (err) {
                if (err) reject(err);
                resolve(this.lastID);
            }
        );
    });
}

export default db;
