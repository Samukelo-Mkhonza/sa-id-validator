const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { validateSouthAfricanID } = require('./validateId');
const { deriveGrantIndicators } = require('./grantEligibility');
const { bulkValidate, MAX_BATCH_SIZE } = require('./bulkValidate');
const { logVerification } = require('./privacy');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
// Cap request bodies so a huge payload can't exhaust memory. The bulk endpoint
// can carry tens of thousands of IDs, so allow a few megabytes.
app.use(bodyParser.json({ limit: '8mb' }));

// Minimal security headers (helmet-equivalent) without adding a dependency.
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    // ID numbers are personal information — never let intermediaries cache them.
    res.setHeader('Cache-Control', 'no-store');
    next();
});

// Tiny in-memory, fixed-window rate limiter. Enough to blunt scripted abuse of
// a public identity endpoint; a real deployment would use a shared store.
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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/validate-id', (req, res) => {
    const { idNumber, consent, includeGrants } = req.body;
    if (!idNumber) {
        return res.status(400).send({ message: 'ID number is required.' });
    }

    const result = validateSouthAfricanID(idNumber);

    // POPIA: record that a verification happened, without persisting the raw ID.
    logVerification({ idNumber, isValid: result.isValid, code: result.code, consent, source: 'single' });

    if (!result.isValid) {
        return res.status(400).send(result);
    }

    const response = { ...result };
    if (includeGrants) {
        response.grants = deriveGrantIndicators(result);
    }
    res.json(response);
});

// Bulk validation: accepts { idNumbers: [...] } and returns per-row results plus
// batch-level fraud signals (duplicates, invalids). No raw IDs are logged.
app.post('/validate-bulk', (req, res) => {
    const { idNumbers, consent, includeGrants } = req.body;
    if (!Array.isArray(idNumbers)) {
        return res.status(400).send({ message: 'Expected an "idNumbers" array.' });
    }
    if (idNumbers.length === 0) {
        return res.status(400).send({ message: 'No ID numbers provided.' });
    }
    if (idNumbers.length > MAX_BATCH_SIZE) {
        return res.status(413).send({ message: `Batch too large (max ${MAX_BATCH_SIZE}).` });
    }

    let output;
    try {
        output = bulkValidate(idNumbers, { includeGrants: includeGrants === true });
    } catch (err) {
        return res.status(400).send({ message: err.message });
    }

    logVerification({
        action: 'validate-bulk',
        isValid: output.summary.invalid === 0,
        consent,
        source: 'bulk',
    });

    res.json(output);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
