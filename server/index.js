const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { validateSouthAfricanID } = require('./validateId');
const { deriveGrantIndicators } = require('./grantEligibility');
const { bulkValidate, MAX_BATCH_SIZE } = require('./bulkValidate');
const { reconcile } = require('./reconcile');
const { summariseDemographics } = require('./demographics');
const { extractIdFromText } = require('./barcode');
const { generateManyIds } = require('./generateId');
const { MockNprProvider } = require('./verificationProvider');
const { logVerification, purgeOldAuditEntries, readAuditSummary, maskId } = require('./privacy');

const app = express();
const PORT = process.env.PORT || 3001;

// Optional API-key gate. If API_KEYS (comma-separated) is set, protected
// endpoints require a matching `x-api-key` header; unset = open (dev mode).
const API_KEYS = (process.env.API_KEYS || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

const verificationProvider = new MockNprProvider();

app.use(cors());
app.use(bodyParser.json({ limit: '8mb' }));

// Minimal security headers (helmet-equivalent) without adding a dependency.
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    next();
});

// Tiny in-memory, fixed-window rate limiter.
const RATE_LIMIT = { windowMs: 60_000, max: 120 };
const hits = new Map();
app.use((req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const rec = hits.get(key);
    if (!rec || now - rec.start > RATE_LIMIT.windowMs) {
        hits.set(key, { start: now, count: 1 });
        return next();
    }
    rec.count++;
    if (rec.count > RATE_LIMIT.max) {
        return res.status(429).send({ message: 'Too many requests. Please slow down.' });
    }
    next();
});

// In production/Docker the React build is served by this same server. Mounted
// before the API-key gate so the SPA and its assets always load.
const BUILD_DIR = path.join(__dirname, '..', 'build');
if (fs.existsSync(BUILD_DIR)) {
    app.use(express.static(BUILD_DIR));
}

// Endpoints that never require an API key.
const OPEN_PATHS = new Set(['/health', '/openapi.json']);
app.use((req, res, next) => {
    if (API_KEYS.length === 0 || OPEN_PATHS.has(req.path)) return next();
    const provided = req.header('x-api-key');
    if (provided && API_KEYS.includes(provided)) {
        req.apiKeyMasked = maskId(provided);
        return next();
    }
    return res.status(401).send({ message: 'Missing or invalid API key.' });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/openapi.json', (req, res) => {
    res.type('application/json').send(fs.readFileSync(path.join(__dirname, 'openapi.json'), 'utf8'));
});

app.post('/validate-id', (req, res) => {
    const { idNumber, consent, includeGrants } = req.body;
    if (!idNumber) {
        return res.status(400).send({ message: 'ID number is required.' });
    }
    const result = validateSouthAfricanID(idNumber);
    logVerification({ idNumber, isValid: result.isValid, code: result.code, consent, source: 'single' });

    if (!result.isValid) return res.status(400).send(result);

    const response = { ...result };
    if (includeGrants) response.grants = deriveGrantIndicators(result);
    res.json(response);
});

app.post('/validate-bulk', (req, res) => {
    const { idNumbers, consent, includeGrants } = req.body;
    if (!Array.isArray(idNumbers)) return res.status(400).send({ message: 'Expected an "idNumbers" array.' });
    if (idNumbers.length === 0) return res.status(400).send({ message: 'No ID numbers provided.' });
    if (idNumbers.length > MAX_BATCH_SIZE) {
        return res.status(413).send({ message: `Batch too large (max ${MAX_BATCH_SIZE}).` });
    }

    let output;
    try {
        output = bulkValidate(idNumbers, { includeGrants: includeGrants === true });
    } catch (err) {
        return res.status(400).send({ message: err.message });
    }
    output.demographics = summariseDemographics(output.rows);

    logVerification({ action: 'validate-bulk', isValid: output.summary.invalid === 0, consent, source: 'bulk' });
    res.json(output);
});

app.post('/reconcile', (req, res) => {
    const { listA, listB, consent } = req.body;
    if (!Array.isArray(listA) || !Array.isArray(listB)) {
        return res.status(400).send({ message: 'Expected "listA" and "listB" arrays.' });
    }
    if (listA.length > MAX_BATCH_SIZE || listB.length > MAX_BATCH_SIZE) {
        return res.status(413).send({ message: `List too large (max ${MAX_BATCH_SIZE}).` });
    }
    let output;
    try {
        output = reconcile(listA, listB);
    } catch (err) {
        return res.status(400).send({ message: err.message });
    }
    logVerification({ action: 'reconcile', isValid: true, consent, source: 'reconcile' });
    res.json(output);
});

app.post('/extract-id', (req, res) => {
    const { text } = req.body;
    if (typeof text !== 'string') return res.status(400).send({ message: 'Expected a "text" string.' });
    res.json(extractIdFromText(text));
});

app.post('/generate-id', (req, res) => {
    const { count = 1, gender, minAge, maxAge } = req.body || {};
    const options = {};
    if (gender === 'Male' || gender === 'Female') options.gender = gender;
    if (Number.isFinite(minAge)) options.minAge = minAge;
    if (Number.isFinite(maxAge)) options.maxAge = maxAge;
    const ids = generateManyIds(count, options);
    res.json({ synthetic: true, count: ids.length, ids });
});

app.post('/verify-identity', async (req, res) => {
    const { idNumber, firstName, lastName } = req.body || {};
    if (!idNumber) return res.status(400).send({ message: 'ID number is required.' });
    const result = await verificationProvider.verify(idNumber, { firstName, lastName });
    logVerification({ action: 'verify-identity', idNumber, isValid: result.idExists === true, source: 'verify' });
    res.json(result);
});

app.get('/audit/summary', (req, res) => res.json(readAuditSummary()));

if (require.main === module) {
    // Enforce the audit retention policy on startup (POPIA data-minimisation).
    const retentionDays = Number(process.env.AUDIT_RETENTION_DAYS) || 90;
    try {
        const removed = purgeOldAuditEntries(retentionDays);
        if (removed) console.log(`Purged ${removed} audit entries older than ${retentionDays} days.`);
    } catch (err) {
        console.error('Audit purge failed:', err.message);
    }
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        if (API_KEYS.length === 0) console.log('API keys not set — running in open (dev) mode.');
    });
}

module.exports = app;
