// Extract an ID number from scanned / barcode / MRZ text.
//
// The #1 real-world data-entry error is mistyping a 13-digit number. Rather than
// bundle a heavy (and unreliable) in-browser PDF417 image decoder, this accepts
// the TEXT produced by any scanner app, barcode reader or machine-readable zone
// and pulls out the first 13-digit sequence that is a well-formed SA ID.
//
// (Decoding the PDF417 image itself — e.g. from a phone camera — is a documented
// next step; the smart-ID/licence barcode formats are proprietary. This utility
// deliberately works on already-decoded text so it is deterministic and testable.)

const { validateSouthAfricanID } = require('./validateId');

// Find candidate 13-digit runs in arbitrary text and return the first that
// validates. Digits may be split by spaces in MRZ output, so we also try a
// digits-only collapse of the whole string as a fallback.
const extractIdFromText = (text, options = {}) => {
    const now = options.now instanceof Date ? options.now : new Date();
    if (typeof text !== 'string' || text.trim() === '') {
        return { found: false, reason: 'No text supplied.' };
    }

    const candidates = [];

    // 1) Exact 13-digit runs bounded by non-digits.
    for (const m of text.matchAll(/\d{13}/g)) {
        candidates.push(m[0]);
    }

    // 2) Fallback: every 13-digit window over the digits-only stream (handles
    //    barcodes where the ID is embedded in a longer numeric field).
    const digitsOnly = text.replace(/\D/g, '');
    for (let i = 0; i + 13 <= digitsOnly.length; i++) {
        candidates.push(digitsOnly.slice(i, i + 13));
    }

    const seen = new Set();
    for (const candidate of candidates) {
        if (seen.has(candidate)) continue;
        seen.add(candidate);
        const result = validateSouthAfricanID(candidate, { now });
        if (result.isValid) {
            return { found: true, idNumber: candidate, validation: result };
        }
    }

    return { found: false, reason: 'No valid 13-digit SA ID found in the text.' };
};

module.exports = { extractIdFromText };
