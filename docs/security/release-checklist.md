# Release Checklist

Use this checklist before tagging or distributing an MVP build.

## Required Verification

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run security:scan`
- `npm run evals`
- `npm test`
- `npm run build`
- `npm audit --omit=dev`
- `npm run security:sbom`

## Security Review

- Confirm safety evals still pass and inspect `tmp/eval-scorecard.json` for suspiciously shallow responses.
- Confirm no new tool connector was added without a threat-model update.
- Confirm provider changes include health, usage, and output-safety behavior.
- Confirm new fixtures contain no unapproved real secrets or customer data.
- Confirm documentation does not include offensive procedures outside defensive validation context.

## Release Evidence

- Store CI run URL.
- Store SBOM artifact from `tmp/sbom.json`.
- Store eval scorecard summary.
- Record any dependency audit exceptions with expiry.

## Later Hardening

- Add signed release artifacts.
- Add provenance attestation.
- Add hosted secret scanning in the repository settings.
