// South African ID number validation logic.
// Extracted into its own module so it can be reused and unit-tested
// independently of the Express server.
//
// A South African ID number is 13 digits: YYMMDD SSSS C A Z
//   YYMMDD - date of birth
//   SSSS   - gender sequence (0000-4999 = Female, 5000-9999 = Male)
//   C      - citizenship (0 = SA Citizen, 1 = Permanent Resident)
//   A      - legacy digit (historically race, no longer used)
//   Z      - Luhn checksum digit
//
// IMPORTANT: passing every check here means the number is *well-formed*, NOT
// that it exists in the National Population Register or belongs to a real
// person. Existence/identity verification requires accredited DHA (HANIS)
// access. Callers must not treat a `true` result as proof of identity.

// Oldest age we will treat as plausible. Guards against century-inference
// mistakes producing 120+ year-old "people" from two-digit years.
const MAX_PLAUSIBLE_AGE = 120;

// Machine-readable failure codes so callers (bulk processing, dashboards,
// audit logs) can branch on the reason without string-matching.
const ERROR_CODES = {
    MISSING: 'MISSING',
    LENGTH: 'LENGTH',
    NON_NUMERIC: 'NON_NUMERIC',
    INVALID_DOB: 'INVALID_DOB',
    FUTURE_DOB: 'FUTURE_DOB',
    INVALID_CITIZENSHIP: 'INVALID_CITIZENSHIP',
    CHECKSUM: 'CHECKSUM',
};

// Luhn checksum over all 13 digits.
const validateChecksum = (idNumber) => {
    let sum = 0;
    let isSecond = false;
    for (let i = idNumber.length - 1; i >= 0; i--) {
        let d = parseInt(idNumber.charAt(i), 10);

        if (isSecond) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
        isSecond = !isSecond;
    }
    return (sum % 10) === 0;
};

// Returns true only if (year, monthIndex, day) is a real calendar date.
// Building a Date and comparing the components back guards against JavaScript's
// silent roll-over (e.g. month 13 -> next January, or 31 February -> early
// March), which the previous implementation accepted as valid.
const isRealCalendarDate = (year, monthIndex, day) => {
    const d = new Date(Date.UTC(year, monthIndex, day));
    return (
        d.getUTCFullYear() === year &&
        d.getUTCMonth() === monthIndex &&
        d.getUTCDate() === day
    );
};

// Midnight UTC "today", so future-date comparisons ignore the time of day.
const startOfTodayUTC = (now) =>
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

// Whole years between a birth date and today (UTC).
const ageInYears = (dobUTCms, now) => {
    const dob = new Date(dobUTCms);
    let age = now.getUTCFullYear() - dob.getUTCFullYear();
    const beforeBirthdayThisYear =
        now.getUTCMonth() < dob.getUTCMonth() ||
        (now.getUTCMonth() === dob.getUTCMonth() &&
            now.getUTCDate() < dob.getUTCDate());
    if (beforeBirthdayThisYear) age--;
    return age;
};

// The ID stores only a two-digit year, so the century is ambiguous. Instead of
// a naive fixed pivot (the old `>= 50 ? 1900 : 2000`, which misdated anyone
// born before ~1950 and happily accepted future dates), we test both centuries
// and keep the interpretation(s) that yield a real, non-future, plausibly-aged
// date.
const resolveBirthDate = (yy, monthIndex, day, now) => {
    const todayMs = startOfTodayUTC(now);
    const candidates = [];

    for (const century of [1900, 2000]) {
        const year = century + yy;
        if (!isRealCalendarDate(year, monthIndex, day)) continue;

        const dobMs = Date.UTC(year, monthIndex, day);
        if (dobMs > todayMs) continue; // not born yet

        const age = ageInYears(dobMs, now);
        if (age < 0 || age > MAX_PLAUSIBLE_AGE) continue;

        candidates.push({ year, dobMs, age });
    }

    if (candidates.length === 0) return null;

    // If both centuries are plausible the number is genuinely ambiguous. Default
    // to the most recent (2000s) birth date and flag it so callers can surface
    // the uncertainty rather than silently trusting a guess.
    const chosen = candidates.reduce((a, b) => (b.year > a.year ? b : a));
    return { ...chosen, ambiguous: candidates.length > 1 };
};

const validateSouthAfricanID = (idNumber, options = {}) => {
    const now = options.now instanceof Date ? options.now : new Date();

    if (idNumber === undefined || idNumber === null || idNumber === '') {
        return { isValid: false, code: ERROR_CODES.MISSING, reason: 'ID number is required.' };
    }

    // Normalise to a string; accept incidental spaces so pasted/scanned input
    // ("9001 0150 09087") still validates.
    const normalised = String(idNumber).replace(/\s+/g, '');

    if (normalised.length !== 13) {
        return { isValid: false, code: ERROR_CODES.LENGTH, reason: 'ID number must be 13 digits long.' };
    }
    if (!/^\d{13}$/.test(normalised)) {
        return { isValid: false, code: ERROR_CODES.NON_NUMERIC, reason: 'ID number must contain digits only.' };
    }

    const yy = parseInt(normalised.substring(0, 2), 10);
    const monthIndex = parseInt(normalised.substring(2, 4), 10) - 1;
    const day = parseInt(normalised.substring(4, 6), 10);

    // Reject obviously impossible month/day before the century search so we can
    // give a precise reason (the search alone would just say "no candidates").
    if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) {
        return { isValid: false, code: ERROR_CODES.INVALID_DOB, reason: 'Invalid date of birth in ID number.' };
    }

    const birth = resolveBirthDate(yy, monthIndex, day, now);
    if (!birth) {
        // Distinguish "not a real calendar date" from "date is in the future".
        const anyRealCentury = [1900, 2000].some((c) =>
            isRealCalendarDate(c + yy, monthIndex, day)
        );
        if (!anyRealCentury) {
            return { isValid: false, code: ERROR_CODES.INVALID_DOB, reason: 'Invalid date of birth in ID number.' };
        }
        return { isValid: false, code: ERROR_CODES.FUTURE_DOB, reason: 'Date of birth in ID number is in the future.' };
    }

    const genderCode = parseInt(normalised.substring(6, 10), 10);
    const gender = genderCode < 5000 ? 'Female' : 'Male';

    const citizenshipCode = parseInt(normalised.substring(10, 11), 10);
    if (citizenshipCode !== 0 && citizenshipCode !== 1) {
        return {
            isValid: false,
            code: ERROR_CODES.INVALID_CITIZENSHIP,
            reason: 'Citizenship digit must be 0 (SA Citizen) or 1 (Permanent Resident).',
        };
    }
    const citizenship = citizenshipCode === 0 ? 'SA Citizen' : 'Permanent Resident';

    if (!validateChecksum(normalised)) {
        return { isValid: false, code: ERROR_CODES.CHECKSUM, reason: 'Checksum validation failed.' };
    }

    const dob = new Date(birth.dobMs);
    const formattedDOB = `${dob.getUTCFullYear()}-${String(dob.getUTCMonth() + 1).padStart(2, '0')}-${String(dob.getUTCDate()).padStart(2, '0')}`;

    return {
        isValid: true,
        DOB: formattedDOB,
        gender,
        citizenship,
        age: birth.age,
        // True when the two-digit year is plausible in both 1900s and 2000s, so
        // the century (and therefore the exact DOB/age) cannot be known from the
        // ID alone and would need confirmation against an authoritative record.
        birthDateAmbiguous: birth.ambiguous,
    };
};

module.exports = {
    validateChecksum,
    validateSouthAfricanID,
    isRealCalendarDate,
    ERROR_CODES,
    MAX_PLAUSIBLE_AGE,
};
