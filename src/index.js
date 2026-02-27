import express from 'express';
import dotenv from 'dotenv';
import { registerDailyRecoveryJob, runDailyRecoveryJob } from './jobs/dailyAbandonedCheckoutJob.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Basic healthcheck
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/admin/jobs/run-recovery', async (req, res) => {
    const adminSecret = process.env.ADMIN_SECRET;
    if (adminSecret && req.header('x-admin-secret') !== adminSecret) {
        return res.status(401).send('Unauthorized');
    }
    console.log('[Admin] Manual trigger received for daily recovery job.');
    res.status(202).send('Job triggered. Check server logs for progress.');
    // Run async without blocking the response
    runDailyRecoveryJob().catch(err =>
        console.error('[Admin] Manual job run failed:', err)
    );
});

app.listen(PORT, () => {
    console.log(`[Piranha AIOS] Local Server running on port ${PORT}`);
    console.log(`[Piranha AIOS] Manual job trigger: POST http://localhost:${PORT}/admin/jobs/run-recovery`);

    registerDailyRecoveryJob();
});
