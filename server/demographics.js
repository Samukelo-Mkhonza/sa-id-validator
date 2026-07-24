// Aggregate demographics from a batch of validated rows.
//
// This is the POPIA-friendly way to USE ID data: instead of exposing individuals,
// produce anonymous aggregates (gender split, age bands, citizenship mix) that
// support planning — clinic/school/grant capacity, etc. No single person is
// identifiable from the output.

const AGE_BANDS = [
    { label: '0-17', min: 0, max: 17 },
    { label: '18-34', min: 18, max: 34 },
    { label: '35-59', min: 35, max: 59 },
    { label: '60+', min: 60, max: Infinity },
];

const bandFor = (age) => {
    const band = AGE_BANDS.find((b) => age >= b.min && age <= b.max);
    return band ? band.label : 'unknown';
};

// rows: the `rows` array returned by bulkValidate (objects with isValid, gender,
// age, citizenship). Invalid rows are counted but excluded from breakdowns.
const summariseDemographics = (rows) => {
    if (!Array.isArray(rows)) {
        throw new TypeError('summariseDemographics expects an array of rows.');
    }

    const gender = { Male: 0, Female: 0 };
    const citizenship = { 'SA Citizen': 0, 'Permanent Resident': 0 };
    const ageBands = Object.fromEntries(AGE_BANDS.map((b) => [b.label, 0]));

    let valid = 0;
    let invalid = 0;

    for (const row of rows) {
        if (!row || row.isValid !== true) {
            invalid++;
            continue;
        }
        valid++;
        if (row.gender in gender) gender[row.gender]++;
        if (row.citizenship in citizenship) citizenship[row.citizenship]++;
        if (typeof row.age === 'number') ageBands[bandFor(row.age)]++;
    }

    return {
        total: rows.length,
        valid,
        invalid,
        gender,
        citizenship,
        ageBands,
    };
};

module.exports = { summariseDemographics, AGE_BANDS };
