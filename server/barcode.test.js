const { test } = require('node:test');
const assert = require('node:assert');
const { extractIdFromText } = require('./barcode');

const NOW = new Date(Date.UTC(2026, 0, 15));
const VALID = '8001015009087';

test('extracts an ID embedded in free text', () => {
    const r = extractIdFromText(`Surname: DLAMINI\nID No: ${VALID}\nIssued: 2015`, { now: NOW });
    assert.strictEqual(r.found, true);
    assert.strictEqual(r.idNumber, VALID);
});

test('extracts an ID from spaced/MRZ-style digits', () => {
    const spaced = VALID.split('').join(' ');
    const r = extractIdFromText(spaced, { now: NOW });
    assert.strictEqual(r.found, true);
    assert.strictEqual(r.idNumber, VALID);
});

test('extracts an ID embedded in a longer numeric field', () => {
    const r = extractIdFromText(`9997${VALID}0001`, { now: NOW });
    assert.strictEqual(r.found, true);
    assert.strictEqual(r.idNumber, VALID);
});

test('returns not-found when there is no valid ID', () => {
    assert.strictEqual(extractIdFromText('no id here', { now: NOW }).found, false);
    assert.strictEqual(extractIdFromText('', { now: NOW }).found, false);
});
