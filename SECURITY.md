# Security Policy

## Supported Versions

Security fixes are expected to land on the active `main` branch first.

If you are running an older fork or deployment, plan to upgrade regularly rather than expecting backports.

## Reporting A Vulnerability

Please do not open public issues for security-sensitive bugs.

Preferred path:

1. Use GitHub's private vulnerability reporting for this repository, if it is enabled.
2. If private reporting is unavailable, contact the maintainer privately through GitHub and ask for a confidential channel.

Please include:

- affected routes, files, or features
- reproduction steps or a minimal proof of concept
- impact assessment
- any required configuration or environment assumptions

## Scope

We are especially interested in reports involving:

- auth and session handling
- API key, webhook, and claim-link security
- billing and payment flows
- browser/PDF worker trust boundaries
- SSRF, secret disclosure, or privilege escalation

## Disclosure

Please allow time for a fix before public disclosure. Once the issue is understood and patched, coordinated disclosure is welcome.
