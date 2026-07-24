// Unit tests for the core validator. Run with: node --test
const { test } = require('node:test');
const assert = require('node:assert');
const { validateSouthAfricanID, validateChecksum, isRealCalendarDate, ERROR_CODES } = require('./validateId');

// Fixed "today" so age and future-date logic is deterministic.
const NOW = new Date(Date.UTC(2026, 0, 15)); // 15 Jan 2026

// Helper: given the first 12 digits, append the correct Luhn check digit.
function withCheckDigit(first12) {
    for (let d = 0; d < 10; d++) {
        const candidate = first12 + d;
        if (validateChecksum(candidate)) return candidate;
    }
    throw new Error('no valid check digit for ' + first12);
}

test('accepts a known valid ID and decodes its fields', () => {
    const r = validateSouthAfricanID('8001015009087', { now: NOW });
    assert.strictEqual(r.isValid, true);
    assert.strictEqual(r.DOB, '1980-01-01');
    assert.strictEqual(r.gender, 'Male');
    assert.strictEqual(r.citizenship, 'SA Citizen');
    assert.strictEqual(r.age, 46);
});

test('tolerates spaces in the input', () => {
    const r = validateSouthAfricanID('8001 0150 09087', { now: NOW });
    assert.strictEqual(r.isValid, true);
});

test('rejects wrong length', () => {
    const r = validateSouthAfricanID('900101', { now: NOW });
    assert.strictEqual(r.isValid, false);
    assert.strictEqual(r.code, ERROR_CODES.LENGTH);
});

test('rejects non-numeric characters', () => {
    const r = validateSouthAfricanID('90010150090ab', { now: NOW });
    assert.strictEqual(r.isValid, false);
    assert.strictEqual(r.code, ERROR_CODES.NON_NUMERIC);
});

test('rejects an impossible month (13) instead of rolling over', () => {
    const r = validateSouthAfricanID('9013015009087', { now: NOW });
    assert.strictEqual(r.isValid, false);
    assert.strictEqual(r.code, ERROR_CODES.INVALID_DOB);
});

test('rejects an impossible day (32)', () => {
    const r = validateSouthAfricanID('9001325009087', { now: NOW });
    assert.strictEqual(r.isValid, false);
    assert.strictEqual(r.code, ERROR_CODES.INVALID_DOB);
});

test('rejects 30 February (previously accepted via roll-over)', () => {
    const id = withCheckDigit('900230500908');
    const r = validateSouthAfricanID(id, { now: NOW });
    assert.strictEqual(r.isValid, false);
    assert.strictEqual(r.code, ERROR_CODES.INVALID_DOB);
});

test('rejects a future date of birth when today is in the past', () => {
    // With "today" = 1935, an ID encoding 1940/2040 has no valid past reading.
    const id = withCheckDigit('400615500908');
    const r = validateSouthAfricanID(id, { now: new Date(Date.UTC(1935, 5, 15)) });
    assert.strictEqual(r.isValid, false);
    assert.strictEqual(r.code, ERROR_CODES.FUTURE_DOB);
});

test('does NOT misdate a recent two-digit year as a future date (the old pivot bug)', () => {
    // "30" must resolve to 1930 (a real past date), never 2030.
    const id = withCheckDigit('300101500908');
    const r = validateSouthAfricanID(id, { now: NOW });
    assert.strictEqual(r.isValid, true);
    assert.strictEqual(r.DOB.slice(0, 4), '1930');
});

test('flags a century-ambiguous year', () => {
    // "10" is plausible as both 1910 (age 116) and 2010 (age 16).
    const id = withCheckDigit('100101500908');
    const r = validateSouthAfricanID(id, { now: NOW });
    assert.strictEqual(r.isValid, true);
    assert.strictEqual(r.birthDateAmbiguous, true);
    assert.strictEqual(r.DOB.slice(0, 4), '2010'); // defaults to the recent reading
});

test('rejects an invalid citizenship digit', () => {
    const r = validateSouthAfricanID('8001015009287', { now: NOW });
    assert.strictEqual(r.isValid, false);
    assert.strictEqual(r.code, ERROR_CODES.INVALID_CITIZENSHIP);
});

test('rejects a bad checksum', () => {
    // 8001015009087 is valid; flipping the last digit breaks the Luhn check.
    const r = validateSouthAfricanID('8001015009088', { now: NOW });
    assert.strictEqual(r.isValid, false);
    assert.strictEqual(r.code, ERROR_CODES.CHECKSUM);
});

test('requires an ID number', () => {
    assert.strictEqual(validateSouthAfricanID('').code, ERROR_CODES.MISSING);
    assert.strictEqual(validateSouthAfricanID(null).code, ERROR_CODES.MISSING);
    assert.strictEqual(validateSouthAfricanID(undefined).code, ERROR_CODES.MISSING);
});

test('isRealCalendarDate rejects roll-over dates', () => {
    assert.strictEqual(isRealCalendarDate(1990, 12, 1), false); // month index 12
    assert.strictEqual(isRealCalendarDate(1990, 1, 30), false); // 30 Feb
    assert.strictEqual(isRealCalendarDate(1990, 0, 1), true);
});
