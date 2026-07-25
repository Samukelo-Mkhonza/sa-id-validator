import React, { useCallback, useState } from 'react';
import HomeAffairsLogo from '../images/home-affairs-logo.png';
import { useI18n } from '../i18n';
import CameraScanner from './CameraScanner';

// Base URL for the validation API. Overridable at build time so the same UI can
// point at a deployed backend instead of the local dev server.
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

function IDValidator() {
    const { t } = useI18n();
    const [idNumber, setIdNumber] = useState('');
    const [consent, setConsent] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [scanText, setScanText] = useState('');
    const [scanError, setScanError] = useState('');
    const [scanning, setScanning] = useState(false);

    const [verify, setVerify] = useState(null);
    const [verifyLoading, setVerifyLoading] = useState(false);

    const validateIDNumber = async (idNumber) => {
        setError('');
        setResult(null);
        setVerify(null);
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE}/validate-id`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idNumber, consent, includeGrants: true }),
            });

            const data = await response.json();
            if (response.ok && data.isValid) {
                setResult(data);
            } else {
                setError(data.reason || data.message || 'Invalid ID number. Please check the format and try again.');
            }
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
            setError('Could not reach the validation service. Please make sure the server is running and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Send scanned/pasted text to the extraction endpoint and, if a valid ID is
    // found, drop it into the input. Shared by the camera scanner and the
    // paste-text fallback.
    const runExtraction = useCallback(async (text) => {
        setScanError('');
        if (!text || text.trim() === '') return;
        try {
            const response = await fetch(`${API_BASE}/extract-id`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            const data = await response.json();
            if (data.found) {
                setIdNumber(data.idNumber);
                setScanError('');
            } else {
                setScanError(t('scanNotFound'));
            }
        } catch (err) {
            console.error(err);
            setScanError('Could not reach the extraction service.');
        }
    }, [t]);

    const handleScanResult = useCallback(
        (text) => {
            setScanning(false);
            runExtraction(text);
        },
        [runExtraction]
    );

    const runVerify = async () => {
        setVerifyLoading(true);
        setVerify(null);
        try {
            const response = await fetch(`${API_BASE}/verify-identity`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idNumber }),
            });
            setVerify(await response.json());
        } catch (err) {
            console.error(err);
            setVerify({ error: 'Could not reach the verification service.' });
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleChange = (e) => {
        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 13);
        setIdNumber(digitsOnly);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        validateIDNumber(idNumber);
    };

    const handleClear = () => {
        setIdNumber('');
        setResult(null);
        setError('');
        setVerify(null);
        setScanText('');
        setScanError('');
    };

    const hasSomethingToClear = idNumber !== '' || result !== null || error !== '';
    const canSubmit = idNumber.length === 13 && consent && !isLoading;
    const grants = result && result.grants ? result.grants.indicators : [];

    return (
        <section className="card">
            {isLoading && (
                <div className="card__loading" role="status" aria-live="polite">
                    <span className="spinner spinner--lg" aria-hidden="true" />
                    <span className="card__loading-text">{t('validating')}</span>
                </div>
            )}

            <div className="card__brand">
                <img
                    src={HomeAffairsLogo}
                    alt="Department of Home Affairs, Republic of South Africa"
                    className="card__logo"
                />
            </div>

            <div className="card__body">
                <h1 className="card__title">{t('appTitle')}</h1>
                <p className="card__subtitle">{t('singleSubtitle')}</p>

                <form onSubmit={handleSubmit} className="form">
                    <label htmlFor="id-input" className="form__label">{t('idLabel')}</label>
                    <input
                        id="id-input"
                        className="form__input"
                        type="text"
                        inputMode="numeric"
                        maxLength={13}
                        placeholder="e.g. 8001015009087"
                        value={idNumber}
                        onChange={handleChange}
                        autoComplete="off"
                    />

                    <details className="scan">
                        <summary className="scan__summary">{t('scanTitle')}</summary>

                        <button
                            type="button"
                            className="form__button scan__camera"
                            onClick={() => {
                                setScanError('');
                                setScanning(true);
                            }}
                        >
                            📷 {t('scanCamera')}
                        </button>
                        <p className="scan__note">{t('scanCameraNote')}</p>

                        <div className="scan__or">{t('scanOr')}</div>
                        <textarea
                            className="scan__textarea"
                            rows={3}
                            placeholder="Paste scanned barcode / MRZ text here"
                            value={scanText}
                            onChange={(e) => setScanText(e.target.value)}
                        />
                        <button
                            type="button"
                            className="form__button form__button--ghost scan__button"
                            onClick={() => runExtraction(scanText)}
                            disabled={scanText.trim() === ''}
                        >
                            {t('scanExtract')}
                        </button>
                        {scanError && <p className="scan__error">{scanError}</p>}
                    </details>

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
                        <button type="submit" className="form__button" disabled={!canSubmit}>
                            {isLoading ? (
                                <>
                                    <span className="spinner" aria-hidden="true" />
                                    {t('validating')}
                                </>
                            ) : (
                                t('validate')
                            )}
                        </button>
                        <button
                            type="button"
                            className="form__button form__button--ghost"
                            onClick={handleClear}
                            disabled={isLoading || !hasSomethingToClear}
                        >
                            {t('clear')}
                        </button>
                    </div>
                </form>

                {error && (
                    <div className="alert alert--error" role="alert">
                        <span className="alert__icon" aria-hidden="true">!</span>
                        <span>{error}</span>
                    </div>
                )}

                {result && (
                    <div className="result" role="status">
                        <div className="result__badge">
                            <span className="result__check" aria-hidden="true">✓</span>
                            {t('resultValid')}
                        </div>
                        <dl className="result__list">
                            <div className="result__row"><dt>{t('dob')}</dt><dd>{result.DOB}</dd></div>
                            <div className="result__row"><dt>{t('gender')}</dt><dd>{result.gender}</dd></div>
                            <div className="result__row"><dt>{t('citizenship')}</dt><dd>{result.citizenship}</dd></div>
                            <div className="result__row"><dt>{t('age')}</dt><dd>{result.age} years</dd></div>
                        </dl>

                        {result.birthDateAmbiguous && (
                            <div className="alert alert--warn" role="note">
                                <span className="alert__icon alert__icon--warn" aria-hidden="true">i</span>
                                <span>
                                    The two-digit year is ambiguous (could be last century). The
                                    most recent reading is shown — confirm the real date of birth
                                    against an official record.
                                </span>
                            </div>
                        )}

                        {grants.length > 0 && (
                            <div className="grants">
                                <h2 className="grants__title">{t('grantsTitle')}</h2>
                                <ul className="grants__list">
                                    {grants.map((g) => (
                                        <li key={g.grant} className="grants__item">
                                            <span className="grants__name">{g.grant}</span>
                                            <span className="grants__note">{g.subjectTo}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="grants__disclaimer">
                                    Pre-screening hint only — not a grant decision. Every grant
                                    remains subject to a means test and SASSA verification.
                                </p>
                            </div>
                        )}

                        <div className="verify">
                            <h2 className="grants__title">{t('verifyTitle')}</h2>
                            <button
                                type="button"
                                className="form__button form__button--ghost"
                                onClick={runVerify}
                                disabled={verifyLoading}
                            >
                                {verifyLoading ? t('validating') : t('verifyRun')}
                            </button>
                            {verify && !verify.error && (
                                <div className="verify__box">
                                    <p className="verify__row">
                                        <span>ID exists (simulated)</span>
                                        <b>{verify.idExists ? 'Yes' : 'No'}</b>
                                    </p>
                                    {verify.status && (
                                        <p className="verify__row"><span>Status</span><b>{verify.status}</b></p>
                                    )}
                                    <p className="verify__disclaimer">⚠ {verify.disclaimer}</p>
                                </div>
                            )}
                            {verify && verify.error && <p className="scan__error">{verify.error}</p>}
                        </div>
                    </div>
                )}
            </div>

            {scanning && (
                <CameraScanner
                    onResult={handleScanResult}
                    onClose={() => setScanning(false)}
                    label={t('scanCamera')}
                    hint={t('scanPoint')}
                    closeLabel={t('scanClose')}
                />
            )}
        </section>
    );
}

export default IDValidator;
