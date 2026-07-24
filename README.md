# South African ID Validator

A full-stack toolkit for working with South African ID numbers: validate a single
ID, validate a whole list (with fraud/duplicate flags), derive age-based social
grant indicators, and keep a POPIA-conscious audit trail — all without depending
on any external identity service.

## What it does — and what it deliberately does not

South African ID numbers encode real personal information (date of birth, gender
and citizenship) in a checksum-verified 13-digit format. This project parses and
**structurally validates** that format.

> **Important:** a well-formed, checksum-passing number is **not** proof that the
> ID exists in the National Population Register or belongs to a real person. True
> identity/existence verification requires accredited **Department of Home Affairs
> (HANIS/NPR)** access, which is out of scope here. Treat a valid result as
> "well-formed", never as "verified identity".

Everything in this repo works *today*, offline, with no DHA integration — which is
exactly why it is useful for data-quality, pre-screening and fraud-signalling work.

## Features

### Core validation (hardened)
- 13-digit length and digits-only checks (tolerates incidental spaces)
- **Strict calendar-date validation** — rejects impossible dates like month `13`
  or `30 February` instead of silently rolling them over
- **Rejects future dates of birth**
- **Century-aware year handling** — instead of a naive fixed pivot, both the 1900s
  and 2000s readings are tested and the plausible, non-future one is chosen;
  genuinely ambiguous years are flagged (`birthDateAmbiguous`)
- Luhn checksum validation
- Machine-readable failure `code`s (e.g. `INVALID_DOB`, `CHECKSUM`) for automation
- Decodes date of birth, gender, citizenship status and current age

### Bulk validation + fraud signals
- Validate thousands of IDs in one request (payroll, grant beneficiary or vendor
  lists)
- Flags **duplicate IDs** across the batch — the classic ghost-employee /
  double-dipping fingerprint — plus invalid and century-ambiguous rows
- Paste a list or upload a `.csv` / `.txt`, then **download the results as CSV**

### SASSA grant pre-screening
- Derives **age-based grant indicators** from a validated ID
  (Older Person's, Child Support / Foster / Care Dependency, Disability)
- Clearly labelled as a pre-screening hint only — never a grant decision

### POPIA-conscious design
- Full ID numbers are **never written to logs**
- Append-only audit trail stores only a **salted hash** + **masked ID** + outcome
- On-screen bulk results are **masked by default** with an opt-in reveal
- Consent confirmation required before processing
- Basic hardening: security headers, no-store caching, request size limit and a
  simple rate limiter
- **Optional API-key auth** and an OpenAPI spec so other systems can integrate

### Cross-list reconciliation
- Upload **two** lists and find IDs present in both — e.g. a payroll employee who
  is also a paid supplier (conflict of interest), or the same person in two grant
  programmes (double-dipping). This is the kind of finding the Auditor-General
  flags every year.

### Aggregate demographics
- After a bulk run, see an anonymous rollup (gender split, age bands, citizenship
  mix) — the POPIA-friendly way to use ID data for planning, exposing no one.

### Scan / barcode / MRZ extraction
- Paste text from any scanner app, barcode reader or machine-readable zone and the
  first valid 13-digit SA ID is extracted for you — removes the #1 typing error.

### Synthetic ID generator (POPIA safeguard)
- Generate fake-but-checksum-valid IDs so real citizens' numbers never end up in
  dev, test or demo data.

### Simulated identity verification (Tier C — mock only)
- A pluggable verification **adapter** with a deterministic **mock** provider,
  clearly tagged `simulated: true`. It exists to show how an accredited DHA
  (HANIS/NPR) integration would slot in. **It is not a real verification.**

### Localisation & accessibility
- UI language switch across **English / isiZulu / Afrikaans** (translations are a
  starting point — have them reviewed by a professional before production), plus
  labelled form controls and a document `lang` attribute.

## Tech Stack

**Frontend:** React 18, plain CSS (Home Affairs colour scheme)
**Backend:** Node.js, Express, no runtime dependencies for the validation logic
**Tests:** Node's built-in test runner (`node:test`) — no extra tooling

## Prerequisites

- Node.js (v18 or higher — the server tests use the built-in test runner)
- npm

## Installation

```bash
git clone <repository-url>
cd sa-id-validator
npm install
```

## Running the Application

Start the Express backend (port **3001**) and React frontend (port **3000**)
together:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). Press `Ctrl+C` once to
stop both.

> If you see `EADDRINUSE` on 3001 or "Something is already running on port 3000",
> a previous process is still running — stop it, then re-run `npm run dev`.

Run the sides separately if you prefer:

```bash
npm run server   # backend only (port 3001, auto-restart via nodemon)
npm run client   # frontend only (port 3000)
```

## API Endpoints

### `POST /validate-id`

Validate a single ID number.

**Request:**
```json
{ "idNumber": "8001015009087", "consent": true, "includeGrants": true }
```

**Success (200):**
```json
{
  "isValid": true,
  "DOB": "1980-01-01",
  "gender": "Male",
  "citizenship": "SA Citizen",
  "age": 46,
  "birthDateAmbiguous": false,
  "grants": {
    "eligible": true,
    "indicators": [
      { "grant": "Disability Grant", "basis": "Working-age adult.", "subjectTo": "..." }
    ],
    "note": "Indicators are age-based only and are not a grant decision."
  }
}
```

**Failure (400):**
```json
{ "isValid": false, "code": "CHECKSUM", "reason": "Checksum validation failed." }
```

### `POST /validate-bulk`

Validate a list of IDs and get per-row results plus batch fraud signals.

**Request:**
```json
{ "idNumbers": ["8001015009087", "8001015009087", "123"], "consent": true }
```

**Response (200):**
```json
{
  "summary": { "total": 3, "valid": 2, "invalid": 1, "duplicateIdCount": 1, "duplicateRowCount": 2 },
  "rows": [
    { "index": 0, "isValid": true, "flags": ["DUPLICATE"], "DOB": "1980-01-01", "age": 46, "gender": "Male", "citizenship": "SA Citizen" },
    { "index": 1, "isValid": true, "flags": ["DUPLICATE"], "DOB": "1980-01-01", "age": 46, "gender": "Male", "citizenship": "SA Citizen" },
    { "index": 2, "isValid": false, "flags": ["INVALID"], "code": "LENGTH", "reason": "ID number must be 13 digits long." }
  ]
}
```

### `POST /reconcile`

Find IDs present in both lists.

```json
{ "listA": ["8001015009087", "..."], "listB": ["...", "8001015009087"] }
```
Returns `{ summary: { overlapCount, ... }, matches: [ { idNumber, inA, inB, ... } ] }`.

### `POST /extract-id`

Pull a valid ID out of scanned/barcode/MRZ text.

```json
{ "text": "Surname: DLAMINI  ID No: 8001015009087" }
```
Returns `{ "found": true, "idNumber": "8001015009087", "validation": { ... } }`.

### `POST /generate-id`

Generate synthetic (fake-but-valid) IDs for testing.

```json
{ "count": 5, "gender": "Female", "minAge": 18, "maxAge": 65 }
```
Returns `{ "synthetic": true, "count": 5, "ids": [ ... ] }`.

### `POST /verify-identity` — MOCK / simulation only

Returns a deterministic **simulated** result tagged `"simulated": true`. Not a
real Home Affairs check; do not use for any real decision.

### `GET /audit/summary`

PII-free rollup of the audit log (counts by outcome / source / code only).

### `GET /openapi.json`

The OpenAPI 3.0 specification for all endpoints.

### `GET /health`

Returns `{ "status": "ok" }`.

## Configuration (environment variables)

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Backend port | `3001` |
| `REACT_APP_API_BASE` | API base URL the frontend calls | `http://localhost:3001` |
| `ID_HASH_SALT` | Salt for hashing IDs in the audit log — **set a real secret in production** | insecure dev fallback |
| `API_KEYS` | Comma-separated keys; if set, protected endpoints require an `x-api-key` header | unset (open dev mode) |
| `AUDIT_RETENTION_DAYS` | Age after which audit entries are purged on startup | `90` |

## Docker

```bash
docker build -t sa-id-validator .
docker run -p 3001:3001 -e ID_HASH_SALT=change-me sa-id-validator
```

The image builds the React client and serves both the API and the static app from
Express on port `3001`.

## How South African ID validation works

A 13-digit number in the format `YYMMDD SSSS C A Z`:

- **YYMMDD** — date of birth
- **SSSS** — gender sequence (`0000`–`4999` = Female, `5000`–`9999` = Male)
- **C** — citizenship (`0` = SA Citizen, `1` = Permanent Resident)
- **A** — legacy digit (historically race; no longer used)
- **Z** — Luhn checksum digit

> Example valid test ID: **`8001015009087`** (born 1980-01-01). Note that the
> previously-documented `9001015009087` actually *fails* the Luhn check.

## POPIA & the audit trail

Verification events are appended to `server/audit.log` (git-ignored) as one JSON
object per line, containing a salted SHA-256 hash of the ID, a masked ID, the
outcome and a consent flag — **never the raw ID**. Set a real secret in production:

```bash
# .env (git-ignored)
ID_HASH_SALT=<a-long-random-secret>
```

## Testing

```bash
npm run test:server   # validator, grant and bulk logic (node:test)
npm test              # React component tests (CRA/Jest)
```

## Project Structure

```
sa-id-validator/
├── src/                         # React frontend
│   ├── components/
│   │   ├── IDValidator.js       # Single-ID validation + grants + consent
│   │   └── BulkValidator.js     # CSV/paste batch validation + results table
│   ├── App.js                   # Tabs (single / bulk), layout, footer
│   └── App.css                  # Styles
├── server/                      # Express backend
│   ├── index.js                 # Routes, security headers, rate limit, audit
│   ├── validateId.js            # Core validation logic
│   ├── grantEligibility.js      # SASSA age-based grant indicators
│   ├── bulkValidate.js          # Batch validation + duplicate detection
│   ├── privacy.js               # Masking, hashing, POPIA audit log
│   └── *.test.js                # node:test unit tests
├── package.json
└── README.md
```

## Roadmap toward real government value

This repo covers everything achievable without privileged access. The natural next
steps, in order of increasing barrier:

1. **Name/DOB cross-checks** against an authoritative record (needs data).
2. **Deceased-status checks** against DHA death records (grant-fraud prevention).
3. **Live existence verification** via accredited DHA HANIS/NPR integration.

Items 2–3 require formal DHA accreditation; the surrounding workflow, audit and UI
here are designed to plug into them.

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) and the
[Code of Conduct](.github/CODE_OF_CONDUCT.md).

## Security

Report vulnerabilities via [SECURITY.md](.github/SECURITY.md).

## License

[ISC](LICENSE).

## Author

Samukelo Mkhonza
