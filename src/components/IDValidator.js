import React, { useState } from 'react';
import HomeAffairsLogo from '../images/home-affairs-logo.png';

// Base URL for the validation API. Overridable at build time so the same UI can
// point at a deployed backend instead of the local dev server.
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

function IDValidator() {
    const [idNumber, setIdNumber] = useState('');
    const [consent, setConsent] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const validateIDNumber = async (idNumber) => {
        setError('');
        setResult(null);
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE}/validate-id`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idNumber, consent, includeGrants: true }),
            });

            const data = await response.json();
            if (response.ok) {
                if (data.isValid) {
                    setResult(data);
                } else {
                    setError(data.reason || 'Invalid ID number. Please check the format and try again.');
                }
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

    const handleChange = (e) => {
        // Keep only digits and cap at 13 characters.
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
    };

    const hasSomethingToClear = idNumber !== '' || result !== null || error !== '';
    const canSubmit = idNumber.length === 13 && consent && !isLoading;
    const grants = result && result.grants ? result.grants.indicators : [];

    return (
        <section className="card">
            {isLoading && (
                <div className="card__loading" role="status" aria-live="polite">
                    <span className="spinner spinner--lg" aria-hidden="true" />
                    <span className="card__loading-text">Validating ID number…</span>
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
                <h1 className="card__title">South African ID Validator</h1>
                <p className="card__subtitle">
                    Enter a 13-digit ID number to verify its checksum and view the
                    encoded details.
                </p>

                <form onSubmit={handleSubmit} className="form">
                    <label htmlFor="id-input" className="form__label">ID Number</label>
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

                    <label className="consent">
                        <input
                            type="checkbox"
                            className="consent__box"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                        />
                        <span className="consent__text">
                            I confirm I have the person’s consent, or a lawful basis, to
                            process this ID number (POPIA).
                        </span>
                    </label>

                    <div className="form__actions">
                        <button
                            type="submit"
                            className="form__button"
                            disabled={!canSubmit}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner" aria-hidden="true" />
                                    Validating…
                                </>
                            ) : (
                                'Validate'
                            )}
                        </button>
                        <button
                            type="button"
                            className="form__button form__button--ghost"
                            onClick={handleClear}
                            disabled={isLoading || !hasSomethingToClear}
                        >
                            Clear
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
                            Well-formed South African ID number
                        </div>
                        <dl className="result__list">
                            <div className="result__row">
                                <dt>Date of Birth</dt>
                                <dd>{result.DOB}</dd>
                            </div>
                            <div className="result__row">
                                <dt>Gender</dt>
                                <dd>{result.gender}</dd>
                            </div>
                            <div className="result__row">
                                <dt>Citizenship</dt>
                                <dd>{result.citizenship}</dd>
                            </div>
                            <div className="result__row">
                                <dt>Age</dt>
                                <dd>{result.age} years</dd>
                            </div>
                        </dl>

                        {result.birthDateAmbiguous && (
                            <div className="alert alert--warn" role="note">
                                <span className="alert__icon alert__icon--warn" aria-hidden="true">i</span>
                                <span>
                                    The two-digit year is ambiguous (could be last century).
                                    The most recent reading is shown — confirm the real date
                                    of birth against an official record.
                                </span>
                            </div>
                        )}

                        {grants.length > 0 && (
                            <div className="grants">
                                <h2 className="grants__title">Age-based grant indicators</h2>
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
                    </div>
                )}
            </div>
        </section>
    );
}

export default IDValidator;
