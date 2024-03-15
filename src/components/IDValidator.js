import React, { useState } from 'react';

function IDValidator() {
    const [idNumber, setIdNumber] = useState('');
    const [result, setResult] = useState(null);

    const validateChecksum = (idNumber) => {
        let sum = 0;
        let isSecond = false;
        for (let i = idNumber.length - 1; i >= 0; i--) {
            let d = parseInt(idNumber.charAt(i), 10);

            if (isSecond) {
                d *= 2;
                if (d > 9) d -= 9;
            }
            sum += d;
            isSecond = !isSecond;
        }
        return (sum % 10) === 0;
    };

    const validateSouthAfricanID = (idNumber) => {
        if (idNumber.length !== 13) return { isValid: false };

        const dobYear = parseInt(idNumber.substring(0, 2), 10);
        const dobMonth = parseInt(idNumber.substring(2, 4), 10) - 1;
        const dobDay = parseInt(idNumber.substring(4, 6), 10);
        const dob = new Date(dobYear >= 50 ? 1900 + dobYear : 2000 + dobYear, dobMonth, dobDay);

        const genderCode = parseInt(idNumber.substring(6, 10), 10);
        const gender = genderCode < 5000 ? "Female" : "Male";

        const citizenship = parseInt(idNumber.substring(10, 11), 10) === 0 ? "SA Citizen" : "Permanent Resident";

        if (!validateChecksum(idNumber)) return { isValid: false };

        let age = new Date().getFullYear() - dob.getFullYear();
        if (new Date().getMonth() - dob.getMonth() < 0 || (new Date().getMonth() - dob.getMonth() === 0 && new Date().getDate() < dob.getDate())) {
            age--;
        }

        const formattedDOB = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, '0')}-${String(dob.getDate()).padStart(2, '0')}`;

        return {
            isValid: true,
            DOB: formattedDOB,
            gender: gender,
            citizenship: citizenship,
            age: age
        };
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validationResults = validateSouthAfricanID(idNumber);
        setResult(validationResults);
    };

    return (
        <div className="id-validator-container"> {/* Apply the CSS class here */}
            <form onSubmit={handleSubmit}>
                <label>
                    Enter ID Number:
                
                    <input type="text" placeholder="e.g 1712255627186" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
                </label>
                
                <button type="submit">Validate</button>
            </form>
            
            {result && (
                <div>
                    {result.isValid ? (
                        <div>
                            <p>Valid South African ID number</p>
                            <p>Date of Birth: {result.DOB}</p>
                            <p>Gender: {result.gender}</p>
                            <p>Citizenship: {result.citizenship}</p>
                            <p>Age: {result.age}</p>
                        </div>
                    ) : (
                        <p>Invalid South African ID number.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default IDValidator;
