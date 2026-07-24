// Unit tests for bulk validation + duplicate detection. Run with: node --test
const { test } = require('node:test');
const assert = require('node:assert');
const { bulkValidate, FLAGS } = require('./bulkValidate');

const NOW = new Date(Date.UTC(2026, 0, 15));
const VALID = '8001015009087';

test('summarises valid, invalid and duplicate rows', () => {
    const { summary, rows } = bulkValidate([VALID, VALID, '123'], { now: NOW });

    assert.strictEqual(summary.total, 3);
    assert.strictEqual(summary.valid, 2);
    assert.strictEqual(summary.invalid, 1);
    assert.strictEqual(summary.duplicateIdCount, 1); // one distinct ID repeated
    assert.strictEqual(summary.duplicateRowCount, 2); // two rows carry it

    assert.ok(rows[0].flags.includes(FLAGS.DUPLICATE));
    assert.ok(rows[1].flags.includes(FLAGS.DUPLICATE));
    assert.ok(rows[2].flags.includes(FLAGS.INVALID));
});

test('preserves per-row metadata for object input', () => {
    const { rows } = bulkValidate(
        [{ idNumber: VALID, employeeName: 'A. Person', dept: 'Finance' }],
        { now: NOW }
    );
    assert.strictEqual(rows[0].employeeName, 'A. Person');
    assert.strictEqual(rows[0].dept, 'Finance');
    assert.strictEqual(rows[0].isValid, true);
    assert.strictEqual(rows[0].age, 46);
});

test('optionally attaches grant indicators', () => {
    const { rows } = bulkValidate([VALID], { now: NOW, includeGrants: true });
    assert.ok(Array.isArray(rows[0].grantIndicators));
    assert.ok(rows[0].grantIndicators.includes('Disability Grant'));
});

test('throws on non-array input', () => {
    assert.throws(() => bulkValidate('not-an-array'), TypeError);
});
