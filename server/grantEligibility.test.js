// Unit tests for age-based grant indicators. Run with: node --test
const { test } = require('node:test');
const assert = require('node:assert');
const { validateSouthAfricanID, validateChecksum } = require('./validateId');
const { deriveGrantIndicators } = require('./grantEligibility');

const NOW = new Date(Date.UTC(2026, 5, 15)); // 15 Jun 2026

function withCheckDigit(first12) {
    for (let d = 0; d < 10; d++) {
        if (validateChecksum(first12 + d)) return first12 + d;
    }
    throw new Error('no valid check digit');
}

function grantsFor(first12) {
    const validated = validateSouthAfricanID(withCheckDigit(first12), { now: NOW });
    assert.strictEqual(validated.isValid, true, 'test ID should be valid');
    return deriveGrantIndicators(validated).indicators.map((i) => i.grant);
}

test('60+ qualifies for the Older Person\'s Grant', () => {
    // 1960-01-01 -> age 66 at NOW.
    const grants = grantsFor('600101500908');
    assert.ok(grants.includes("Older Person's Grant"));
});

test('under 18 qualifies for the Child Support Grant', () => {
    // 2015-01-01 -> age 11 at NOW.
    const grants = grantsFor('150101500908');
    assert.ok(grants.includes('Child Support Grant'));
});

test('working-age adult maps to the Disability Grant indicator', () => {
    const validated = validateSouthAfricanID('8001015009087', { now: NOW }); // age 46
    const grants = deriveGrantIndicators(validated).indicators.map((i) => i.grant);
    assert.ok(grants.includes('Disability Grant'));
    assert.ok(!grants.includes("Older Person's Grant"));
});

test('an invalid input yields no eligibility', () => {
    const result = deriveGrantIndicators({ isValid: false });
    assert.strictEqual(result.eligible, false);
    assert.strictEqual(result.indicators.length, 0);
});
