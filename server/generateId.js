// Synthetic (fake-but-valid) ID number generator.
//
// POPIA safeguard: developers, testers and demos should NEVER paste real
// citizens' ID numbers. This produces numbers that are structurally valid and
// pass the Luhn checksum, but are randomly generated and do not belong to any
// real person. Useful for populating the bulk/reconcile tools during testing.

const { validateChecksum, validateSouthAfricanID } = require('./validateId');

// Append the Luhn check digit that makes `first12` a valid 13-digit number.
const appendCheckDigit = (first12) => {
    for (let d = 0; d < 10; d++) {
        if (validateChecksum(first12 + d)) return first12 + d;
    }
    // Unreachable: exactly one check digit always satisfies Luhn.
    throw new Error('could not compute check digit');
};

const pad = (n, len) => String(n).padStart(len, '0');

// options: { minAge, maxAge, gender: 'Male'|'Female', citizen: boolean, random }
const generateValidId = (options = {}) => {
    const rand = typeof options.random === 'function' ? options.random : Math.random;
    const now = options.now instanceof Date ? options.now : new Date();
    const minAge = Number.isFinite(options.minAge) ? options.minAge : 1;
    const maxAge = Number.isFinite(options.maxAge) ? options.maxAge : 90;

    const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));

    // Pick an age, then a birth date within that year that is not in the future.
    const age = randInt(Math.min(minAge, maxAge), Math.max(minAge, maxAge));
    const birthYear = now.getUTCFullYear() - age;
    const month = randInt(1, 12);
    const daysInMonth = new Date(Date.UTC(birthYear, month, 0)).getUTCDate();
    let day = randInt(1, daysInMonth);

    // Guard against generating a future date within the current year.
    const candidate = Date.UTC(birthYear, month - 1, day);
    if (candidate > Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) {
        day = 1;
    }

    const yy = pad(birthYear % 100, 2);
    const mm = pad(month, 2);
    const dd = pad(day, 2);

    // Gender sequence: 0000-4999 = Female, 5000-9999 = Male.
    let seq;
    if (options.gender === 'Female') seq = randInt(0, 4999);
    else if (options.gender === 'Male') seq = randInt(5000, 9999);
    else seq = randInt(0, 9999);

    const citizen = options.citizen === false ? 1 : options.citizen === true ? 0 : randInt(0, 1);
    const aDigit = randInt(0, 9); // legacy digit, unconstrained

    const first12 = `${yy}${mm}${dd}${pad(seq, 4)}${citizen}${aDigit}`;
    return appendCheckDigit(first12);
};

// Generate `count` distinct valid IDs.
const generateManyIds = (count, options = {}) => {
    const n = Math.max(0, Math.min(Number(count) || 0, 10000));
    const ids = new Set();
    let guard = 0;
    while (ids.size < n && guard < n * 20 + 100) {
        ids.add(generateValidId(options));
        guard++;
    }
    return [...ids];
};

module.exports = { generateValidId, generateManyIds, appendCheckDigit, validateSouthAfricanID };
