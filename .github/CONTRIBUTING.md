# Contributing to SA ID Validator

Thanks for your interest in improving this project. This guide covers how to get set up, propose changes, and submit them for review.

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you're expected to uphold it.

## Getting Started

1. Fork the repository and clone your fork:
   ```bash
   git clone https://github.com/<your-username>/sa-id-validator.git
   cd sa-id-validator
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the app locally (backend + frontend, in separate terminals):
   ```bash
   npm run dev
   npm start
   ```

See the [README](../README.md) for full setup and API details.

## Making Changes

1. Create a branch off `main` with a descriptive name:
   ```bash
   git checkout -b fix/id-checksum-edge-case
   ```
2. Make your changes, keeping them focused on a single concern per branch/PR.
3. Add or update tests where relevant, and run the test suite:
   ```bash
   npm test
   ```
4. Ensure the app still builds:
   ```bash
   npm run build
   ```

## Commit Messages

Write clear, descriptive commit messages that explain *why* a change was made, not just what changed.

## Submitting a Pull Request

1. Push your branch to your fork and open a pull request against `main`.
2. Fill out the PR template, including a summary of the change and how you tested it.
3. Link any related issues.
4. Be responsive to review feedback — small, incremental commits in response to review are welcome.

## Reporting Bugs / Requesting Features

Please use the [issue templates](ISSUE_TEMPLATE) when opening an issue so we have the context needed to help.

## Security Issues

Do not open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) for how to report them responsibly.
