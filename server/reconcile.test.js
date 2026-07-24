const { test } = require('node:test');
const assert = require('node:assert');
const { reconcile } = require('./reconcile');
const { appendCheckDigit } = require('./generateId');

const NOW = new Date(Date.UTC(2026, 0, 15));
const A = '8001015009087';
const B = appendCheckDigit('900101500908'); // another valid ID

test('finds IDs present in both lists', () => {
    const listA = [A, 'garbage', B];
    const listB = [B, 'other-noise', A];
    const { summary, matches } = reconcile(listA, listB, { now: NOW });

    assert.strictEqual(summary.overlapCount, 2);
    const ids = matches.map((m) => m.idNumber).sort();
    assert.deepStrictEqual(ids, [A, B].sort());

    const matchA = matches.find((m) => m.idNumber === A);
    assert.deepStrictEqual(matchA.inA, [0]);
    assert.deepStrictEqual(matchA.inB, [2]);
    assert.strictEqual(matchA.isValid, true);
});

test('reports no overlap when the lists are disjoint', () => {
    const { summary } = reconcile([A], [B], { now: NOW });
    assert.strictEqual(summary.overlapCount, 0);
});

test('throws when either argument is not an array', () => {
    assert.throws(() => reconcile(A, [B]), TypeError);
});
