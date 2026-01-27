# Getting Started with Create React App

# South African ID Validator

A full-stack web application for validating South African ID numbers and extracting information such as date of birth, gender, citizenship status, and age.

## Features

- Validates 13-digit South African ID numbers
- Extracts and displays:
  - Date of Birth
  - Gender (Male/Female)
  - Citizenship Status (SA Citizen/Permanent Resident)
  - Current Age
- Checksum validation using the Luhn algorithm
- Clean, user-friendly interface
- RESTful API backend for ID validation

## Tech Stack

**Frontend:**
- React 18.2.0
- Cloudscape Design Components
- CSS3

**Backend:**
- Node.js
- Express.js
- CORS enabled for cross-origin requests

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sa-id-validator
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

The application requires both the frontend and backend to be running simultaneously.

### Development Mode

1. Start the backend server (runs on port 3001):
```bash
npm run dev
```

2. In a separate terminal, start the React frontend (runs on port 3000):
```bash
npm start
```

3. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

### Production Build

Build the React app for production:
```bash
npm run build
```

## API Endpoints

### POST `/validate-id`

Validates a South African ID number.

**Request Body:**
```json
{
  "idNumber": "9001015009087"
}
```

**Success Response (200):**
```json
{
  "isValid": true,
  "DOB": "1990-01-01",
  "gender": "Male",
  "citizenship": "SA Citizen",
  "age": 36
}
```

**Error Response (400):**
```json
{
  "isValid": false,
  "reason": "ID number must be 13 digits long."
}
```

## How South African ID Validation Works

A South African ID number is 13 digits long with the following format:

`YYMMDD SSSS C A Z`

- **YYMMDD**: Date of birth (Year, Month, Day)
- **SSSS**: Gender code (0000-4999 = Female, 5000-9999 = Male)
- **C**: Citizenship (0 = SA Citizen, 1 = Permanent Resident)
- **A**: Usually 8 or 9 (legacy race classification, no longer used)
- **Z**: Checksum digit (Luhn algorithm)

The validator checks:
1. Length is exactly 13 digits
2. Date of birth is valid
3. Citizenship digit is 0 or 1
4. Checksum passes Luhn algorithm validation

## Project Structure

```
sa-id-validator/
├── public/              # Static files
├── src/
│   ├── components/
│   │   └── IDValidator.js    # Main validation component
│   ├── images/
│   │   └── CloudZAlogo.png   # Application logo
│   ├── App.js           # Root component
│   ├── App.css          # Application styles
│   └── index.js         # Entry point
├── server.js            # Express backend server
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## Available Scripts

- `npm start` - Runs the React app in development mode
- `npm run dev` - Runs the backend server with nodemon (auto-restart)
- `npm run build` - Builds the React app for production
- `npm test` - Runs the test suite

## License

ISC

## Author

CloudZA
