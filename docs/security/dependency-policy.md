# Dependency Policy

## Installation

- Use `npm ci` in CI and release checks so dependency resolution follows `package-lock.json`.
- Do not commit generated `node_modules/`, build output, or temporary scan artifacts.
- New runtime dependencies should be justified by security, reliability, or clear product value.

## Update Cadence

- Review dependency updates at least monthly.
- Apply security updates promptly when `npm audit --omit=dev` reports a fixable production issue.
- Keep major framework upgrades separate from feature changes when practical.

## Release Gates

- `npm audit --omit=dev` must pass before release.
- Any audit exception must be documented with affected package, exploitability, compensating controls, owner, and expiry.
- `npm run security:sbom` must produce `tmp/sbom.json` for release evidence.

## Dependency Exceptions

Allowed exceptions require all of:

- Risk owner.
- Expiry date.
- Reason the package cannot be updated immediately.
- Mitigation or monitoring plan.
- Link to the issue tracking the fix.
