# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please **do not**
open a public GitHub issue. Instead, report it privately using one of the
following methods:

- Open a [GitHub Security Advisory](https://github.com/Samukelo-Mkhonza/sa-id-validator/security/advisories/new) for this repository, or
- Contact the maintainer, Samukelo Mkhonza, directly via the [GitHub profile](https://github.com/Samukelo-Mkhonza).

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce, or a proof-of-concept
- Any relevant logs or screenshots

You should expect an initial response within a few days. Once a fix is
available, a new release will be published and the reporter credited (unless
anonymity is requested).

## Supported Versions

This project does not yet follow a formal versioning/release policy. Security
fixes are applied to the `main` branch; please use the latest commit.

## Handling of ID Numbers

South African ID numbers are sensitive personal data. This application:

- Validates ID numbers entirely in-memory, per request
- Does not persist, log, or store submitted ID numbers on the server
- Does not send ID numbers to any third-party service

If you are deploying this project yourself, ensure your infrastructure
(reverse proxies, access logs, error trackers) does not inadvertently capture
request bodies containing ID numbers.
