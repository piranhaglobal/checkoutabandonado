import express from 'express';
import dotenv from 'dotenv';
import { registerUrgencyJob, runUrgencyJob } from './jobs/sendUrgencyMessages.js';
import { registerDiscountJob, runDiscountJob } from './jobs/sendDiscountMessages.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Basic healthcheck
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/admin/jobs/run-urgency', async (req, res) => {
    const adminSecret = process.env.ADMIN_SECRET;
    if (adminSecret && req.header('x-admin-secret') !== adminSecret) {
        return res.status(401).send('Unauthorized');
    }
    console.log('[Admin] Manual trigger received for urgency job.');
    res.status(202).send('Urgency job triggered. Check server logs for progress.');
    runUrgencyJob().catch(err =>
        console.error('[Admin] Manual urgency job run failed:', err)
    );
});

app.post('/admin/jobs/run-discount', async (req, res) => {
    const adminSecret = process.env.ADMIN_SECRET;
    if (adminSecret && req.header('x-admin-secret') !== adminSecret) {
        return res.status(401).send('Unauthorized');
    }
    console.log('[Admin] Manual trigger received for discount job.');
    res.status(202).send('Discount job triggered. Check server logs for progress.');
    runDiscountJob().catch(err =>
        console.error('[Admin] Manual discount job run failed:', err)
    );
});

app.listen(PORT, () => {
    console.log(`[Piranha AIOS] Local Server running on port ${PORT}`);
    console.log(`[Piranha AIOS] Manual job trigger: POST http://localhost:${PORT}/admin/jobs/run-urgency`);
    console.log(`[Piranha AIOS] Manual job trigger: POST http://localhost:${PORT}/admin/jobs/run-discount`);

    registerUrgencyJob();
    registerDiscountJob();
});
