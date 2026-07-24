// SASSA grant eligibility indicators derived from a validated ID number.
//
// SCOPE / HONESTY NOTE: an ID number only tells us age, gender and citizenship
// class. It CANNOT tell us income, disability status, who a child's caregiver
// is, or whether someone is already receiving a grant. So this module returns
// *age-based indicators only* — a pre-screening hint, never an eligibility
// decision. Every real grant is still subject to a means test, supporting
// documents and SASSA verification.

// Age thresholds are the durable, age-based part of the SASSA rules. The
// amounts and means-test limits change with each budget and are deliberately
// NOT encoded here — they belong in a config that gets reviewed regularly.
const OLDER_PERSON_AGE = 60;
const CHILD_MAX_AGE = 18; // Child Support / Foster / Care Dependency apply to children under 18.

// Returns age-based grant indicators for a validated ID result.
// `validated` must be the object returned by validateSouthAfricanID with
// isValid === true.
const deriveGrantIndicators = (validated) => {
    if (!validated || validated.isValid !== true) {
        return { eligible: false, indicators: [], note: 'Grant screening requires a valid ID number.' };
    }

    const { age, citizenship, birthDateAmbiguous } = validated;
    const indicators = [];

    // Grants generally require SA citizenship, permanent residency or refugee
    // status. We can only see the first two from the ID; flag the rest as a
    // documentation check rather than assuming ineligibility.
    const citizenshipOk = citizenship === 'SA Citizen' || citizenship === 'Permanent Resident';

    if (age >= OLDER_PERSON_AGE) {
        indicators.push({
            grant: "Older Person's Grant",
            basis: `Age ${age} is 60 or older.`,
            subjectTo: 'Means test and confirmation of residency.',
        });
    }

    if (age < CHILD_MAX_AGE) {
        indicators.push({
            grant: 'Child Support Grant',
            basis: `Age ${age} is under 18.`,
            subjectTo: "Applied for by a primary caregiver; caregiver's means test applies.",
        });
        indicators.push({
            grant: 'Foster Child / Care Dependency Grant',
            basis: `Age ${age} is under 18.`,
            subjectTo: 'Court order (foster) or medical assessment (care dependency).',
        });
    }

    if (age >= CHILD_MAX_AGE && age < OLDER_PERSON_AGE) {
        indicators.push({
            grant: 'Disability Grant',
            basis: 'Working-age adult.',
            subjectTo: 'Medical/functional assessment confirming disability, plus means test.',
        });
    }

    const notes = [];
    if (!citizenshipOk) {
        notes.push('Citizenship/residency status must be confirmed with documents.');
    }
    if (birthDateAmbiguous) {
        notes.push('Date of birth is century-ambiguous; confirm the applicant\'s real age before relying on age-based grants.');
    }
    notes.push('Indicators are age-based only and are not a grant decision.');

    return {
        eligible: indicators.length > 0 && citizenshipOk,
        indicators,
        note: notes.join(' '),
    };
};

module.exports = { deriveGrantIndicators, OLDER_PERSON_AGE, CHILD_MAX_AGE };
