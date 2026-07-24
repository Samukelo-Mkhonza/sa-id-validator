const { test } = require('node:test');
const assert = require('node:assert');
const { MockNprProvider } = require('./verificationProvider');

const VALID = '8001015009087';
const provider = new MockNprProvider();

test('always tags results as simulated', async () => {
    const r = await provider.verify(VALID);
    assert.strictEqual(r.simulated, true);
    assert.ok(r.decodedFromId);
});

test('is deterministic for the same ID', async () => {
    const a = await provider.verify(VALID);
    const b = await provider.verify(VALID);
    assert.strictEqual(a.idExists, b.idExists);
    assert.strictEqual(a.status, b.status);
});

test('reports a non-existent identity for an invalid ID', async () => {
    const r = await provider.verify('123');
    assert.strictEqual(r.simulated, true);
    assert.strictEqual(r.idExists, false);
});

test('produces a name-match verdict only when a name is supplied', async () => {
    const withoutName = await provider.verify(VALID);
    assert.strictEqual(withoutName.nameMatch, undefined);

    const withName = await provider.verify(VALID, { firstName: 'Thandi' });
    assert.ok(['match', 'no_match'].includes(withName.nameMatch));
});
