const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { validateSouthAfricanID } = require('./validateId');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

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

module.exports = app;
