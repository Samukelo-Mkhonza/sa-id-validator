import React, { useMemo, useState } from 'react';
import { useI18n } from '../i18n';

// Base URL for the validation API. Overridable at build time so the same UI can
// point at a deployed backend instead of the local dev server.
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

// Parse pasted/loaded text into a list of ID numbers. One record per line; the
// first comma/semicolon/tab-separated field is the ID. A leading header line
// (first field with no digits) is skipped.
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

// Simple horizontal bar for the demographics panel.
function Bar({ label, value, total }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div className="demo__row">
            <span className="demo__label">{label}</span>
            <span className="demo__track"><span className="demo__fill" style={{ width: `${pct}%` }} /></span>
            <span className="demo__value">{value}</span>
        </div>
    );
}

function BulkValidator() {
    const { t } = useI18n();
    const [text, setText] = useState('');
    const [consent, setConsent] = useState(false);
    const [data, setData] = useState(null);
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
        e.target.value = '';
    };

    const insertSamples = async () => {
        try {
            const response = await fetch(`${API_BASE}/generate-id`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count: 8 }),
            });
            const body = await response.json();
            if (body.ids) {
                // Include a deliberate duplicate so the fraud flag is visible in the demo.
                const withDup = [...body.ids, body.ids[0]];
                setText((prev) => (prev ? prev + '\n' : '') + withDup.join('\n'));
            }
        } catch (err) {
            console.error(err);
            setError('Could not reach the generator service.');
        }
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
    const demo = data && data.demographics;

    return (
        <section className="card card--wide">
            {isLoading && (
                <div className="card__loading" role="status" aria-live="polite">
                    <span className="spinner spinner--lg" aria-hidden="true" />
                    <span className="card__loading-text">{t('validating')}</span>
                </div>
            )}

            <div className="card__body">
                <h1 className="card__title">{t('bulkTitle')}</h1>
                <p className="card__subtitle">
                    {t('bulkSubtitle')} <strong>{'('}</strong>duplicates = ghost-employee / double-dipping signal<strong>{')'}</strong>
                </p>

                <div className="bulk__inputs">
                    <label htmlFor="bulk-text" className="form__label">
                        {t('idLabel')} ({ids.length})
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
                            <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={handleFile} hidden />
                        </label>
                        <button type="button" className="form__button form__button--ghost bulk__file-btn" onClick={insertSamples}>
                            {t('insertSamples')}
                        </button>
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
                    <span className="consent__text">{t('consent')}</span>
                </label>

                <div className="form__actions">
                    <button type="button" className="form__button" onClick={runBatch} disabled={!canSubmit}>
                        {isLoading ? t('validating') : `${t('validate')} (${ids.length})`}
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
                        {t('clear')}
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
                            <span className="chip chip--warn">Duplicates <b>{data.summary.duplicateRowCount}</b></span>
                        </div>

                        {demo && demo.valid > 0 && (
                            <div className="demo">
                                <h2 className="grants__title">{t('demographicsTitle')}</h2>
                                <div className="demo__cols">
                                    <div className="demo__group">
                                        <Bar label={t('gender')} value={demo.gender.Male} total={demo.valid} />
                                        <div className="demo__sub">
                                            <span>Male {demo.gender.Male}</span>
                                            <span>Female {demo.gender.Female}</span>
                                        </div>
                                    </div>
                                    <div className="demo__group">
                                        {Object.entries(demo.ageBands).map(([band, n]) => (
                                            <Bar key={band} label={band} value={n} total={demo.valid} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bulk__toolbar">
                            <label className="bulk__reveal">
                                <input type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} />
                                {t('showFullIds')}
                            </label>
                            <button type="button" className="form__button form__button--ghost bulk__download" onClick={downloadCSV}>
                                {t('downloadCsv')}
                            </button>
                        </div>

                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>{t('idLabel')}</th>
                                        <th>Status</th>
                                        <th>Flags</th>
                                        <th>{t('dob')}</th>
                                        <th>{t('age')}</th>
                                        <th>{t('gender')}</th>
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
