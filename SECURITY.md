# Security Policy

## Reporting A Vulnerability

LifeOS uses GitHub Security Advisories for private vulnerability reporting.

If you believe you found a security issue:

1. Do not open a public issue or pull request with exploit details.
2. Open a private security advisory for the repository.
3. Include the minimum reproducible steps, impact, and affected area.
4. If secrets may be exposed, say so explicitly in the advisory title.

## What Counts As Security Relevant

Report anything that could reasonably affect confidentiality, integrity, or availability, including:

- secret leakage
- auth bypass
- local bridge compromise
- unsafe remote model routing for restricted data
- signing or verification failures
- dependency or supply-chain compromise

## Response Expectations

Maintainers will:

- acknowledge the report
- validate impact
- coordinate a fix or mitigation
- credit the reporter if requested

## Scope

This policy applies to the repository, the GitHub project, the web app, the server, the local bridge, Convex, and any release artifacts derived from this codebase.
