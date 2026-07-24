const { test } = require('node:test');
const assert = require('node:assert');
const { generateValidId, generateManyIds } = require('./generateId');
const { validateSouthAfricanID } = require('./validateId');

test('every generated ID is well-formed and passes validation', () => {
    for (let i = 0; i < 300; i++) {
        const id = generateValidId();
        const r = validateSouthAfricanID(id);
        assert.strictEqual(r.isValid, true, `generated invalid ID: ${id} (${r.code})`);
    }
});

test('respects the requested gender', () => {
    for (let i = 0; i < 30; i++) {
        assert.strictEqual(validateSouthAfricanID(generateValidId({ gender: 'Female' })).gender, 'Female');
        assert.strictEqual(validateSouthAfricanID(generateValidId({ gender: 'Male' })).gender, 'Male');
    }
});

test('generateManyIds returns the requested count, all distinct and valid', () => {
    const ids = generateManyIds(100);
    assert.strictEqual(ids.length, 100);
    assert.strictEqual(new Set(ids).size, 100);
    for (const id of ids) {
        assert.strictEqual(validateSouthAfricanID(id).isValid, true);
    }
});
