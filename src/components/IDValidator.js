import React, { useState } from 'react';

function IDValidator() {
    const [idNumber, setIdNumber] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const validateIDNumber = async (idNumber) => {
        setError('');
        setResult(null);

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
                throw new Error(data.reason || 'Failed to validate ID number. Please try again later.');
            }
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
            setError(error.message);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        validateIDNumber(idNumber);
    };

    return (
        <div className="id-validator-container">
            <form onSubmit={handleSubmit}>
                <label>
                    Enter ID Number:
                    <input
                        type="text"
                        placeholder="Enter your 13 digit ID number"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        style={{ textAlign: 'center' }}
                    />
                </label>

                <button type="submit">Validate</button>
            </form>

            {error && <div className="error">{error}</div>}

            {result && (
                <div>
                    <p>Valid South African ID number</p>
                    <p>Date of Birth: {result.DOB}</p>
                    <p>Gender: {result.gender}</p>
                    <p>Citizenship: {result.citizenship}</p>
                    <p>Age: {result.age}</p>
                </div>
            )}
        </div>
    );
}

export default IDValidator;
