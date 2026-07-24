import React, { useState } from 'react';
import HomeAffairsLogo from '../images/home-affairs-logo.png';

function IDValidator() {
    const [idNumber, setIdNumber] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const validateIDNumber = async (idNumber) => {
        setError('');
        setResult(null);
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3001/validate-id', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ idNumber }),
            });

            const data = await response.json();
            if (response.ok) {
                if (data.isValid) {
                    setResult(data);
                } else {
                    setError(data.reason || 'Invalid ID number. Please check the format and try again.');
                }
            } else {
                setError(data.reason || 'Invalid ID number. Please check the format and try again.');
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

    return (
        <section className="card">
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
                        placeholder="e.g. 9001015009087"
                        value={idNumber}
                        onChange={handleChange}
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        className="form__button"
                        disabled={isLoading || idNumber.length !== 13}
                    >
                        {isLoading ? 'Validating…' : 'Validate'}
                    </button>
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
                            Valid South African ID number
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
                    </div>
                )}
            </div>
        </section>
    );
}

export default IDValidator;
