// Identity verification adapter (Tier C) — MOCK / SIMULATION ONLY.
//
// ============================ READ THIS ============================
// Real existence/identity verification against the National Population
// Register requires ACCREDITED Department of Home Affairs (HANIS/NPR)
// access. This project has no such access and never contacts DHA.
//
// The purpose of this file is architectural: define the interface a real
// accredited provider would implement, and ship a deterministic MOCK so the
// surrounding UI, audit trail and workflow can be built and tested now. Every
// response is tagged `simulated: true`. Do NOT present these results as real.
// ==================================================================

const { validateSouthAfricanID } = require('./validateId');
const { hashId } = require('./privacy');

// The contract a real DHA/accredited provider would fulfil.
class VerificationProvider {
    // eslint-disable-next-line no-unused-vars
    async verify(idNumber, applicant = {}) {
        throw new Error('Not implemented');
    }
}

// Deterministic simulation: the same ID always yields the same fake outcome, so
// tests and demos are stable. Derived from the salted hash so it is not guessable
// from the ID digits alone.
class MockNprProvider extends VerificationProvider {
    async verify(idNumber, applicant = {}) {
        const validation = validateSouthAfricanID(idNumber);
        if (!validation.isValid) {
            return {
                simulated: true,
                idExists: false,
                reason: validation.reason,
                code: validation.code,
            };
        }

        // Turn the hash into stable pseudo-random deciles.
        const hash = hashId(idNumber);
        const nibble = (i) => parseInt(hash[i], 16); // 0..15

        const idExists = nibble(0) > 0; // ~94% of well-formed IDs "exist"
        const deceased = idExists && nibble(1) === 0; // ~6% "deceased"

        // Simulated name match, only when a name was supplied to check against.
        let nameMatch;
        if (applicant.firstName || applicant.lastName) {
            nameMatch = nibble(2) > 3 ? 'match' : 'no_match'; // ~75% match
        }

        return {
            simulated: true,
            idExists,
            status: deceased ? 'deceased' : idExists ? 'alive' : 'not_found',
            nameMatch,
            decodedFromId: {
                DOB: validation.DOB,
                gender: validation.gender,
                citizenship: validation.citizenship,
            },
            disclaimer:
                'SIMULATED result. Not a real Home Affairs verification. Do not use for any real decision.',
        };
    }
}

module.exports = { VerificationProvider, MockNprProvider };
