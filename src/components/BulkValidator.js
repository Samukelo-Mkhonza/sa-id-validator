import React, { useMemo, useState } from 'react';

// Base URL for the validation API. Overridable at build time so the same UI can
// point at a deployed backend instead of the local dev server.
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

// Parse pasted/loaded text into a list of ID numbers.
// One record per line; the first comma/semicolon/tab-separated field is treated
// as the ID. A leading header line (a first field with no digits) is skipped.
function parseIds(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const ids = [];
    lines.forEach((line, i) => {
        const firstField = line.split(/[,;\t]/)[0].replace(/\s+/g, '');
        if (i === 0 && !/\d/.test(firstField)) return; // header row
        ids.push(firstField);
    });
    return ids;
}

// Mask all but the last 4 digits for on-screen display (POPIA data minimisation).
function maskId(id) {
    const digits = String(id || '');
    if (digits.length < 4) return '•'.repeat(digits.length);
    return '•'.repeat(digits.length - 4) + digits.slice(-4);
}

// Build a CSV export from the validated rows + the original IDs.
function toCSV(rows, ids) {
    const header = ['row', 'id_number', 'status', 'flags', 'DOB', 'age', 'gender', 'citizenship', 'reason'];
    const escape = (v) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((r) =>
        [
            r.index + 1,
            ids[r.index] ?? '',
            r.isValid ? 'valid' : 'invalid',
            (r.flags || []).join('|'),
            r.DOB ?? '',
            r.age ?? '',
            r.gender ?? '',
            r.citizenship ?? '',
            r.reason ?? '',
        ]
            .map(escape)
            .join(',')
    );
    return [header.join(','), ...lines].join('\n');
}

function BulkValidator() {
    const [text, setText] = useState('');
    const [consent, setConsent] = useState(false);
    const [data, setData] = useState(null); // { summary, rows }
    const [parsedIds, setParsedIds] = useState([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [reveal, setReveal] = useState(false);

    const ids = useMemo(() => parseIds(text), [text]);

    const handleFile = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setText(String(reader.result || ''));
        reader.readAsText(file);
        e.target.value = ''; // allow re-selecting the same file
    };

    const runBatch = async () => {
        setError('');
        setData(null);
        if (ids.length === 0) {
            setError('Add at least one ID number (one per line).');
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/validate-bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idNumbers: ids, consent, includeGrants: true }),
            });
            const body = await response.json();
            if (!response.ok) {
                setError(body.message || 'Batch validation failed.');
            } else {
                setData(body);
                setParsedIds(ids);
            }
        } catch (err) {
            console.error(err);
            setError('Could not reach the validation service. Is the server running?');
        } finally {
            setIsLoading(false);
        }
    };

    const downloadCSV = () => {
        const csv = toCSV(data.rows, parsedIds);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'id-validation-results.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const canSubmit = ids.length > 0 && consent && !isLoading;

    return (
        <section className="card card--wide">
            {isLoading && (
                <div className="card__loading" role="status" aria-live="polite">
                    <span className="spinner spinner--lg" aria-hidden="true" />
                    <span className="card__loading-text">Validating batch…</span>
                </div>
            )}

            <div className="card__body">
                <h1 className="card__title">Bulk ID Validation</h1>
                <p className="card__subtitle">
                    Check a whole list at once — payroll, grant beneficiaries or vendor
                    records. Flags malformed IDs and <strong>duplicates</strong> (the
                    classic ghost-employee / double-dipping signal).
                </p>

                <div className="bulk__inputs">
                    <label htmlFor="bulk-text" className="form__label">
                        ID numbers ({ids.length} detected)
                    </label>
                    <textarea
                        id="bulk-text"
                        className="bulk__textarea"
                        rows={7}
                        placeholder={'One ID per line, e.g.\n8001015009087\n9202204720080, J. Dlamini, Finance'}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <div className="bulk__file">
                        <label className="form__button form__button--ghost bulk__file-btn">
                            Upload .csv / .txt
                            <input
                                type="file"
                                accept=".csv,.txt,text/csv,text/plain"
                                onChange={handleFile}
                                hidden
                            />
                        </label>
                        <span className="bulk__hint">First column is used as the ID; a header row is ignored.</span>
                    </div>
                </div>

                <label className="consent">
                    <input
                        type="checkbox"
                        className="consent__box"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span className="consent__text">
                        I confirm I have a lawful basis to process these ID numbers (POPIA).
                    </span>
                </label>

                <div className="form__actions">
                    <button type="button" className="form__button" onClick={runBatch} disabled={!canSubmit}>
                        {isLoading ? 'Validating…' : `Validate ${ids.length || ''} record${ids.length === 1 ? '' : 's'}`}
                    </button>
                    <button
                        type="button"
                        className="form__button form__button--ghost"
                        onClick={() => {
                            setText('');
                            setData(null);
                            setError('');
                        }}
                        disabled={isLoading || (text === '' && !data)}
                    >
                        Clear
                    </button>
                </div>

                {error && (
                    <div className="alert alert--error" role="alert">
                        <span className="alert__icon" aria-hidden="true">!</span>
                        <span>{error}</span>
                    </div>
                )}

                {data && (
                    <div className="bulk__results">
                        <div className="chips">
                            <span className="chip">Total <b>{data.summary.total}</b></span>
                            <span className="chip chip--ok">Valid <b>{data.summary.valid}</b></span>
                            <span className="chip chip--bad">Invalid <b>{data.summary.invalid}</b></span>
                            <span className="chip chip--warn">
                                Duplicates <b>{data.summary.duplicateRowCount}</b>
                            </span>
                        </div>

                        <div className="bulk__toolbar">
                            <label className="bulk__reveal">
                                <input
                                    type="checkbox"
                                    checked={reveal}
                                    onChange={(e) => setReveal(e.target.checked)}
                                />
                                Show full IDs
                            </label>
                            <button type="button" className="form__button form__button--ghost bulk__download" onClick={downloadCSV}>
                                Download results (CSV)
                            </button>
                        </div>

                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>ID number</th>
                                        <th>Status</th>
                                        <th>Flags</th>
                                        <th>DOB</th>
                                        <th>Age</th>
                                        <th>Gender</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.rows.map((r) => {
                                        const raw = parsedIds[r.index] ?? '';
                                        return (
                                            <tr key={r.index} className={r.isValid ? '' : 'row--bad'}>
                                                <td>{r.index + 1}</td>
                                                <td className="mono">{reveal ? raw : maskId(raw)}</td>
                                                <td>
                                                    <span className={`pill ${r.isValid ? 'pill--ok' : 'pill--bad'}`}>
                                                        {r.isValid ? 'Valid' : 'Invalid'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {(r.flags || [])
                                                        .filter((f) => f !== 'INVALID')
                                                        .map((f) => (
                                                            <span key={f} className="pill pill--warn">{f}</span>
                                                        ))}
                                                    {!r.isValid && <span className="cell-note">{r.reason}</span>}
                                                </td>
                                                <td>{r.DOB || '—'}</td>
                                                <td>{r.age ?? '—'}</td>
                                                <td>{r.gender || '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

export default BulkValidator;
