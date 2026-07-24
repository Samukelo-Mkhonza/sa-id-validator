// POPIA-oriented privacy helpers.
//
// The Protection of Personal Information Act (POPIA) requires that personal
// information be minimised, secured, and that processing be accountable. An ID
// number is personal (indeed special-category) information, so this module lets
// the rest of the app:
//   - mask IDs before they are shown in logs or shared views,
//   - correlate repeat verifications WITHOUT storing the plaintext ID (via a
//     salted hash), and
//   - keep an append-only audit trail of what was verified, by whom-ish, and
//     when — again without persisting the raw ID.
//
// The audit log deliberately stores a hash, a masked ID and the outcome only.
// It never writes the full ID to disk.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// The salt keeps hashes from being reversible via a precomputed rainbow table
// of all 10^13 possible IDs. In production this MUST come from a secret store
// and be rotated; the fallback exists only so the dev server still runs.
const HASH_SALT = process.env.ID_HASH_SALT || 'dev-only-insecure-salt-change-me';

const AUDIT_LOG_PATH = process.env.AUDIT_LOG_PATH || path.join(__dirname, 'audit.log');

// Mask an ID for display/logging: reveal only the last 4 digits (checksum +
// citizenship + part of the gender sequence — the least identifying part) and
// hide the date-of-birth portion entirely.
const maskId = (idNumber) => {
    const digits = String(idNumber ?? '').replace(/\s+/g, '');
    if (digits.length < 4) return '*'.repeat(digits.length);
    return '*'.repeat(digits.length - 4) + digits.slice(-4);
};

// Stable, non-reversible fingerprint of an ID. Used to detect duplicate/repeat
// verifications and to correlate audit entries without storing the ID itself.
const hashId = (idNumber) => {
    const digits = String(idNumber ?? '').replace(/\s+/g, '');
    return crypto.createHmac('sha256', HASH_SALT).update(digits).digest('hex');
};

// Append one structured, ID-free entry to the audit log. Best-effort: a logging
// failure must never break a validation response, so we swallow write errors
// (and surface them on the console for the operator).
const logVerification = (event) => {
    const entry = {
        ts: new Date().toISOString(),
        action: event.action || 'validate-id',
        idHash: event.idNumber ? hashId(event.idNumber) : undefined,
        maskedId: event.idNumber ? maskId(event.idNumber) : undefined,
        outcome: event.isValid === true ? 'valid' : 'invalid',
        code: event.code, // failure code, if any
        consent: event.consent === true,
        source: event.source, // e.g. 'single' | 'bulk'
    };
    try {
        fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(entry) + '\n');
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Audit log write failed:', err.message);
    }
    return entry;
};

// POPIA data-minimisation: don't keep records forever. Rewrites the log with
// only entries newer than `maxAgeDays`. Returns the number of entries removed.
const purgeOldAuditEntries = (maxAgeDays = 90) => {
    if (!fs.existsSync(AUDIT_LOG_PATH)) return 0;
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    let removed = 0;
    const kept = [];
    const lines = fs.readFileSync(AUDIT_LOG_PATH, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
        try {
            const entry = JSON.parse(line);
            if (new Date(entry.ts).getTime() >= cutoff) kept.push(line);
            else removed++;
        } catch {
            // Skip unparseable lines rather than crash on a corrupt log.
            removed++;
        }
    }
    fs.writeFileSync(AUDIT_LOG_PATH, kept.length ? kept.join('\n') + '\n' : '');
    return removed;
};

// PII-free rollup of the audit log for a governance/monitoring view. Counts only
// — never returns hashes, masked IDs or timestamps of individuals.
const readAuditSummary = () => {
    const summary = { total: 0, valid: 0, invalid: 0, bySource: {}, byCode: {} };
    if (!fs.existsSync(AUDIT_LOG_PATH)) return summary;
    const lines = fs.readFileSync(AUDIT_LOG_PATH, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
        let entry;
        try {
            entry = JSON.parse(line);
        } catch {
            continue;
        }
        summary.total++;
        if (entry.outcome === 'valid') summary.valid++;
        else summary.invalid++;
        const src = entry.source || 'unknown';
        summary.bySource[src] = (summary.bySource[src] || 0) + 1;
        if (entry.code) summary.byCode[entry.code] = (summary.byCode[entry.code] || 0) + 1;
    }
    return summary;
};

module.exports = {
    maskId,
    hashId,
    logVerification,
    purgeOldAuditEntries,
    readAuditSummary,
    AUDIT_LOG_PATH,
};
