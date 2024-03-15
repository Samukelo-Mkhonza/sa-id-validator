const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.post('/validate-id', (req, res) => {
    const idNumber = req.body.idNumber;

    // Basic validation: Check if the input is exactly 13 digits long
    if (!idNumber || idNumber.length !== 13 || !/^\d+$/.test(idNumber)) {
        return res.json({ isValid: false });
    }

    // Extract the date of birth from the ID
    const dobYear = parseInt(idNumber.substring(0, 2), 10);
    const dobMonth = parseInt(idNumber.substring(2, 4), 10) - 1; // Month is 0-indexed in JavaScript Date
    const dobDay = parseInt(idNumber.substring(4, 6), 10);

    // Determine century for year of birth
    const currentYear = new Date().getFullYear();
    const century = currentYear % 100 < dobYear ? 1900 : 2000;
    const dateOfBirth = new Date(century + dobYear, dobMonth, dobDay);

    // Validate the date of birth
    if (dateOfBirth.getFullYear() !== century + dobYear ||
        dateOfBirth.getMonth() !== dobMonth ||
        dateOfBirth.getDate() !== dobDay) {
        return res.json({ isValid: false });
    }

    // Determine the gender
    const genderCode = parseInt(idNumber.substring(6, 10), 10);
    const gender = genderCode < 5000 ? 'Female' : 'Male';

    // Determine the citizenship
    const citizenshipCode = parseInt(idNumber[10], 10);
    const citizenship = citizenshipCode === 0 ? 'SA Citizen' : 'Permanent Resident';

    // Calculate age
    const age = currentYear - (century + dobYear);

    // Implement the Luhn algorithm for the check digit
    let sum = 0;
    for (let i = 0; i < 13; i++) {
        let digit = parseInt(idNumber[i], 10);
        if (i % 2 === 0) { // Even indices (0-based)
            sum += digit;
        } else { // Odd indices (0-based)
            let double = digit * 2;
            sum += double > 9 ? double - 9 : double;
        }
    }

    const isValid = sum % 10 === 0;

    const result = {
        isValid: isValid,
        DOB: dateOfBirth.toISOString().substring(0, 10),
        gender: gender,
        citizenship: citizenship,
        age: age
    };

    res.json(result);
});

app.listen(3001, () => console.log('Server listening on port 3001'));
