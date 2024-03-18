const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

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
    if (idNumber.length !== 13) return { isValid: false, reason: "ID number must be 13 digits long." };

    const dobYear = parseInt(idNumber.substring(0, 2), 10) + (parseInt(idNumber.substring(0, 2), 10) >= 50 ? 1900 : 2000);
    const dobMonth = parseInt(idNumber.substring(2, 4), 10) - 1;
    const dobDay = parseInt(idNumber.substring(4, 6), 10);

    const dob = new Date(Date.UTC(dobYear, dobMonth, dobDay, 12, 0, 0));

    if (isNaN(dob.getTime())) {
        return { isValid: false, reason: "Invalid date of birth in ID number." };
    }

    const genderCode = parseInt(idNumber.substring(6, 10), 10);
    const gender = genderCode < 5000 ? "Female" : "Male";

    const citizenshipCode = parseInt(idNumber.substring(10, 11), 10);
    if (citizenshipCode !== 0 && citizenshipCode !== 1) {
        return { isValid: false, reason: "Citizenship digit must be 0 (SA Citizen) or 1 (Permanent Resident)." };
    }
    const citizenship = citizenshipCode === 0 ? "SA Citizen" : "Permanent Resident";

    if (!validateChecksum(idNumber)) {
        return { isValid: false, reason: "Checksum validation failed." };
    }

    const now = new Date();
    const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0);
    let age = new Date(utcNow).getUTCFullYear() - dob.getUTCFullYear();
    if (new Date(utcNow).getUTCMonth() < dob.getUTCMonth() || (new Date(utcNow).getUTCMonth() === dob.getUTCMonth() && new Date(utcNow).getUTCDate() < dob.getUTCDate())) {
        age--;
    }

    const formattedDOB = `${dob.getUTCFullYear()}-${String(dob.getUTCMonth() + 1).padStart(2, '0')}-${String(dob.getUTCDate()).padStart(2, '0')}`;

    return {
        isValid: true,
        DOB: formattedDOB,
        gender: gender,
        citizenship: citizenship,
        age: age
    };
};

app.post('/validate-id', (req, res) => {
    const { idNumber } = req.body;
    if (!idNumber) {
        return res.status(400).send({ message: 'ID number is required.' });
    }
    const validationResults = validateSouthAfricanID(idNumber);
    if (!validationResults.isValid) {
        return res.status(400).send(validationResults);
    }
    res.json(validationResults);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
