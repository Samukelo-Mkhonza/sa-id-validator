// Cross-list reconciliation.
//
// The highest-value audit use case that needs no DHA access: given TWO lists of
// ID numbers, find the IDs that appear in both. Real examples the Auditor-General
// flags every year:
//   - a person on the payroll who is also a paid supplier (conflict of interest),
//   - the same beneficiary in two grant programmes (double-dipping),
//   - an employee who is also listed as a dependant/beneficiary.
//
// This relies only on local validation logic.

const { validateSouthAfricanID } = require('./validateId');

// Build an index of normalised ID -> list of row positions where it appears.
const indexBy = (list) => {
    const map = new Map();
    list.forEach((raw, i) => {
        const isObject = raw !== null && typeof raw === 'object';
        const id = String((isObject ? raw.idNumber : raw) ?? '').replace(/\s+/g, '');
        if (!id) return;
        if (!map.has(id)) map.set(id, []);
        map.get(id).push(i);
    });
    return map;
};

// listA / listB: arrays of ID strings (or { idNumber, ... } objects).
// Returns { summary, matches } where matches are the IDs present in BOTH lists.
const reconcile = (listA, listB, options = {}) => {
    const now = options.now instanceof Date ? options.now : new Date();
    if (!Array.isArray(listA) || !Array.isArray(listB)) {
        throw new TypeError('reconcile expects two arrays of ID numbers.');
    }

    const idxA = indexBy(listA);
    const idxB = indexBy(listB);

    const matches = [];
    for (const [id, positionsA] of idxA) {
        if (!idxB.has(id)) continue;
        const validation = validateSouthAfricanID(id, { now });
        matches.push({
            idNumber: id,
            inA: positionsA,
            inB: idxB.get(id),
            isValid: validation.isValid,
            DOB: validation.isValid ? validation.DOB : undefined,
            age: validation.isValid ? validation.age : undefined,
            gender: validation.isValid ? validation.gender : undefined,
        });
    }

    // Most-repeated / cross-referenced first.
    matches.sort((a, b) => b.inA.length + b.inB.length - (a.inA.length + a.inB.length));

    return {
        summary: {
            listACount: listA.length,
            listBCount: listB.length,
            distinctInA: idxA.size,
            distinctInB: idxB.size,
            overlapCount: matches.length,
        },
        matches,
    };
};

module.exports = { reconcile };
