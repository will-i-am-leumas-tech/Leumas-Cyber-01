# Authorized Validation

Authorized validation v2 supports lab-only control validation with signed scope records, target allowlists, safe template governance, benign telemetry replay, and evidence reports.

## Safety Boundary

- Use only approved scopes and lab targets.
- Allowed activity is benign telemetry replay, detection validation, control evidence review, and remediation planning.
- Blocked activity includes exploitation, stealth, persistence, credential theft, malware, evasion, unauthorized recon, and real-world target compromise.
- A validation campaign cannot start unless the scope is current, signed, lab-enabled when required, and the target is allowlisted.

## Scope V2

Create a signed lab scope:

```bash
curl -sS -X POST http://127.0.0.1:3001/validation/v2/scopes \
  -H 'content-type: application/json' \
  -d '{
    "name": "Approved lab validation scope v2",
    "owner": "soc@example.test",
    "approver": "security-lead@example.test",
    "targetAllowlist": ["lab-host-01.example.test", "*.lab.example.test"],
    "targetDenylist": ["prod-db-01.example.test"],
    "startsAt": "2026-04-17T00:00:00.000Z",
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "labMode": true,
    "approvedTemplateIds": ["safe-control-validation"]
  }'
```

The service computes a deterministic signature over the scope fields. If any signed field changes later, target policy denies campaigns for that scope.

## Templates

List safe templates:

```bash
curl -sS http://127.0.0.1:3001/validation/v2/templates
```

Templates define allowed telemetry, blocked content categories, required defensive controls, ATT&CK mapping, and lab-mode requirements. The MVP templates replay synthetic evidence only.

## Campaigns

Create a lab campaign:

```bash
curl -sS -X POST http://127.0.0.1:3001/validation/v2/campaigns \
  -H 'content-type: application/json' \
  -d '{
    "scopeId": "validation_scope_v2_example",
    "templateIds": ["safe-control-validation"],
    "actor": "analyst@example.test",
    "target": "lab-host-01.example.test",
    "requestedObjective": "Validate encoded PowerShell detection routing with benign replay."
  }'
```

The request is denied if the target is not allowlisted, the target is denylisted, the scope is expired, the signature is invalid, or the template was not approved.

## Replay And Evidence

Generate benign replay evidence:

```bash
curl -sS -X POST http://127.0.0.1:3001/validation/v2/campaigns/validation_campaign_v2_example/replay
```

Build the evidence report:

```bash
curl -sS http://127.0.0.1:3001/validation/v2/campaigns/validation_campaign_v2_example/evidence-report
```

Reports summarize observed detection telemetry, missing telemetry, remediation, and evidence citations. Reports must remain at control and evidence level, not procedural attack instructions.
