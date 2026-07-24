// End-to-end API tests. Boots the Express app on an ephemeral port and calls it
// with the built-in fetch — no supertest / extra dependency required.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('./index');

let server;
let base;

before(async () => {
    await new Promise((resolve) => {
        server = app.listen(0, resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
    if (server) server.close();
});

const post = (p, body) =>
    fetch(base + p, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: await r.json() }));

const getJson = (p) => fetch(base + p).then(async (r) => ({ status: r.status, body: await r.json() }));

test('GET /health', async () => {
    const { status, body } = await getJson('/health');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.status, 'ok');
});

test('POST /validate-id (valid) returns decoded fields + grants', async () => {
    const { status, body } = await post('/validate-id', {
        idNumber: '8001015009087',
        includeGrants: true,
        consent: true,
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.isValid, true);
    assert.ok(body.grants);
});

test('POST /validate-id (invalid) returns 400 + code', async () => {
    const { status, body } = await post('/validate-id', { idNumber: '9013015009087' });
    assert.strictEqual(status, 400);
    assert.strictEqual(body.code, 'INVALID_DOB');
});

test('POST /validate-bulk flags duplicates and includes demographics', async () => {
    const { status, body } = await post('/validate-bulk', {
        idNumbers: ['8001015009087', '8001015009087', '123'],
        consent: true,
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.summary.duplicateRowCount, 2);
    assert.ok(body.demographics);
    assert.strictEqual(body.demographics.valid, 2);
});

test('POST /reconcile finds the overlapping ID', async () => {
    const { body } = await post('/reconcile', {
        listA: ['8001015009087', '111'],
        listB: ['222', '8001015009087'],
    });
    assert.strictEqual(body.summary.overlapCount, 1);
    assert.strictEqual(body.matches[0].idNumber, '8001015009087');
});

test('POST /extract-id pulls an ID out of text', async () => {
    const { body } = await post('/extract-id', { text: 'ID: 8001015009087 issued 2015' });
    assert.strictEqual(body.found, true);
    assert.strictEqual(body.idNumber, '8001015009087');
});

test('POST /generate-id returns synthetic valid IDs', async () => {
    const { body } = await post('/generate-id', { count: 5 });
    assert.strictEqual(body.synthetic, true);
    assert.strictEqual(body.ids.length, 5);
});

test('POST /verify-identity is a labelled simulation', async () => {
    const { body } = await post('/verify-identity', { idNumber: '8001015009087' });
    assert.strictEqual(body.simulated, true);
});

test('GET /audit/summary returns PII-free counts', async () => {
    const { status, body } = await getJson('/audit/summary');
    assert.strictEqual(status, 200);
    assert.strictEqual(typeof body.total, 'number');
    assert.ok(body.bySource);
});

test('GET /openapi.json serves the spec', async () => {
    const { status, body } = await getJson('/openapi.json');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.openapi, '3.0.3');
});
