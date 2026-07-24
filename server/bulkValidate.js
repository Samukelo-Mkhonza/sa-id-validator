// Bulk validation for lists of ID numbers.
//
// This is the feature with the most direct government/public-sector value: run
// a payroll file, a grant beneficiary list or a procurement vendor list through
// it and get back, per row, whether the ID is well-formed PLUS batch-level fraud
// signals — chiefly DUPLICATE ids, the classic "ghost employee" / double-dipping
// grant fingerprint. It relies only on the local validation logic (no DHA
// access), so it works today.

const { validateSouthAfricanID } = require('./validateId');
const { deriveGrantIndicators } = require('./grantEligibility');

const MAX_BATCH_SIZE = 50000;

// Fraud / data-quality flags surfaced per row.
const FLAGS = {
    DUPLICATE: 'DUPLICATE', // this exact ID appears more than once in the batch
    INVALID: 'INVALID', // failed structural validation
    AMBIGUOUS_DOB: 'AMBIGUOUS_DOB', // century of birth cannot be determined
};

// idNumbers: array of raw values (strings/numbers). Optional per-item metadata
// is preserved by passing objects of the form { idNumber, ...anything }.
// Returns { summary, rows }.
const bulkValidate = (input, options = {}) => {
    const now = options.now instanceof Date ? options.now : new Date();
    const includeGrants = options.includeGrants === true;

    if (!Array.isArray(input)) {
        throw new TypeError('bulkValidate expects an array of ID numbers.');
    }
    if (input.length > MAX_BATCH_SIZE) {
        throw new RangeError(`Batch too large: ${input.length} rows (max ${MAX_BATCH_SIZE}).`);
    }

    // First pass: normalise + count occurrences so we can flag duplicates.
    const items = input.map((raw, index) => {
        const isObject = raw !== null && typeof raw === 'object';
        const idNumber = isObject ? raw.idNumber : raw;
        const meta = isObject ? { ...raw } : {};
        delete meta.idNumber;
        const normalised = String(idNumber ?? '').replace(/\s+/g, '');
        return { index, idNumber, normalised, meta };
    });

    const counts = new Map();
    for (const item of items) {
        if (item.normalised) {
            counts.set(item.normalised, (counts.get(item.normalised) || 0) + 1);
        }
    }

    let validCount = 0;
    let invalidCount = 0;
    const duplicateIds = new Set();

    // Second pass: validate each row and attach flags.
    const rows = items.map((item) => {
        const result = validateSouthAfricanID(item.normalised, { now });
        const flags = [];

        if (item.normalised && counts.get(item.normalised) > 1) {
            flags.push(FLAGS.DUPLICATE);
            duplicateIds.add(item.normalised);
        }
        if (!result.isValid) {
            flags.push(FLAGS.INVALID);
            invalidCount++;
        } else {
            validCount++;
            if (result.birthDateAmbiguous) flags.push(FLAGS.AMBIGUOUS_DOB);
        }

        const row = {
            index: item.index,
            ...item.meta,
            isValid: result.isValid,
            flags,
        };

        if (result.isValid) {
            row.DOB = result.DOB;
            row.gender = result.gender;
            row.citizenship = result.citizenship;
            row.age = result.age;
            if (includeGrants) {
                row.grantIndicators = deriveGrantIndicators(result).indicators.map((i) => i.grant);
            }
        } else {
            row.code = result.code;
            row.reason = result.reason;
        }

        return row;
    });

    return {
        summary: {
            total: rows.length,
            valid: validCount,
            invalid: invalidCount,
            duplicateIdCount: duplicateIds.size,
            duplicateRowCount: rows.filter((r) => r.flags.includes(FLAGS.DUPLICATE)).length,
        },
        rows,
    };
};

module.exports = { bulkValidate, FLAGS, MAX_BATCH_SIZE };
