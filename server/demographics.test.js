const { test } = require('node:test');
const assert = require('node:assert');
const { summariseDemographics } = require('./demographics');

test('aggregates gender, age bands and citizenship, counting invalids separately', () => {
    const rows = [
        { isValid: true, gender: 'Male', age: 70, citizenship: 'SA Citizen' },
        { isValid: true, gender: 'Female', age: 10, citizenship: 'Permanent Resident' },
        { isValid: true, gender: 'Female', age: 40, citizenship: 'SA Citizen' },
        { isValid: false },
    ];
    const d = summariseDemographics(rows);

    assert.strictEqual(d.total, 4);
    assert.strictEqual(d.valid, 3);
    assert.strictEqual(d.invalid, 1);
    assert.deepStrictEqual(d.gender, { Male: 1, Female: 2 });
    assert.deepStrictEqual(d.citizenship, { 'SA Citizen': 2, 'Permanent Resident': 1 });
    assert.strictEqual(d.ageBands['60+'], 1);
    assert.strictEqual(d.ageBands['0-17'], 1);
    assert.strictEqual(d.ageBands['35-59'], 1);
    assert.strictEqual(d.ageBands['18-34'], 0);
});

test('throws on non-array input', () => {
    assert.throws(() => summariseDemographics(null), TypeError);
});
