import React, { useMemo, useState } from 'react';
import { useI18n } from '../i18n';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

function parseIds(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const ids = [];
    lines.forEach((line, i) => {
        const first = line.split(/[,;\t]/)[0].replace(/\s+/g, '');
        if (i === 0 && !/\d/.test(first)) return; // header row
        ids.push(first);
    });
    return ids;
}

function maskId(id) {
    const d = String(id || '');
    return d.length < 4 ? '•'.repeat(d.length) : '•'.repeat(d.length - 4) + d.slice(-4);
}

function ReconcileValidator() {
    const { t } = useI18n();
    const [textA, setTextA] = useState('');
    const [textB, setTextB] = useState('');
    const [consent, setConsent] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [reveal, setReveal] = useState(false);

    const idsA = useMemo(() => parseIds(textA), [textA]);
    const idsB = useMemo(() => parseIds(textB), [textB]);

    const run = async () => {
        setError('');
        setData(null);
        if (idsA.length === 0 || idsB.length === 0) {
            setError('Add ID numbers to both lists.');
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/reconcile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listA: idsA, listB: idsB, consent }),
            });
            const body = await response.json();
            if (!response.ok) setError(body.message || 'Reconciliation failed.');
            else setData(body);
        } catch (err) {
            console.error(err);
            setError('Could not reach the validation service. Is the server running?');
        } finally {
            setIsLoading(false);
        }
    };

    const canSubmit = idsA.length > 0 && idsB.length > 0 && consent && !isLoading;

    return (
        <section className="card card--wide">
            {isLoading && (
                <div className="card__loading" role="status" aria-live="polite">
                    <span className="spinner spinner--lg" aria-hidden="true" />
                    <span className="card__loading-text">{t('validating')}</span>
                </div>
            )}

            <div className="card__body">
                <h1 className="card__title">{t('reconcileTitle')}</h1>
                <p className="card__subtitle">{t('reconcileSubtitle')}</p>

                <div className="reconcile__grid">
                    <div>
                        <label htmlFor="list-a" className="form__label">
                            {t('listA')} ({idsA.length})
                        </label>
                        <textarea
                            id="list-a"
                            className="bulk__textarea"
                            rows={7}
                            placeholder={'One ID per line'}
                            value={textA}
                            onChange={(e) => setTextA(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="list-b" className="form__label">
                            {t('listB')} ({idsB.length})
                        </label>
                        <textarea
                            id="list-b"
                            className="bulk__textarea"
                            rows={7}
                            placeholder={'One ID per line'}
                            value={textB}
                            onChange={(e) => setTextB(e.target.value)}
                        />
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
                    <button type="button" className="form__button" onClick={run} disabled={!canSubmit}>
                        {isLoading ? t('validating') : t('findOverlaps')}
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
                            <span className="chip">{t('listA')} <b>{data.summary.listACount}</b></span>
                            <span className="chip">{t('listB')} <b>{data.summary.listBCount}</b></span>
                            <span className={`chip ${data.summary.overlapCount ? 'chip--bad' : 'chip--ok'}`}>
                                Overlap <b>{data.summary.overlapCount}</b>
                            </span>
                        </div>

                        {data.summary.overlapCount > 0 && (
                            <>
                                <div className="bulk__toolbar">
                                    <label className="bulk__reveal">
                                        <input type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} />
                                        {t('showFullIds')}
                                    </label>
                                </div>
                                <div className="table-wrap">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>ID number</th>
                                                <th>In {t('listA')}</th>
                                                <th>In {t('listB')}</th>
                                                <th>{t('dob')}</th>
                                                <th>{t('age')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.matches.map((m) => (
                                                <tr key={m.idNumber} className="row--bad">
                                                    <td className="mono">{reveal ? m.idNumber : maskId(m.idNumber)}</td>
                                                    <td>rows {m.inA.map((i) => i + 1).join(', ')}</td>
                                                    <td>rows {m.inB.map((i) => i + 1).join(', ')}</td>
                                                    <td>{m.DOB || '—'}</td>
                                                    <td>{m.age ?? '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

export default ReconcileValidator;
