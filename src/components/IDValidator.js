import React, { useState } from 'react';
import CloudZAlogo from '../images/CloudZAlogo.png';
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
        <div className="id-validator-container" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'start' }}>
                <img src={CloudZAlogo} alt="Logo" style={{ position: 'relative', top: '-25px' }} />
            </div>
            <div style={{ marginTop: '5px' }}>
                <form onSubmit={handleSubmit}>
                    <label>
                        Enter ID Number:
                        <input
                            type="text"
                            placeholder="Enter 13 digit ID number"
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            style={{ textAlign: 'center' }}
                        />
                    </label>

                    <button
                        type="submit"
                        style={{ border: '3px solid white' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'lightgray')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                    >
                        Validate
                    </button>
                </form>
            </div>

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
