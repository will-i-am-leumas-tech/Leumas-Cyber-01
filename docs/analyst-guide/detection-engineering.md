# Detection Engineering

Detection engineering v2 turns a generated case detection into a lifecycle record with translated rule formats, validation evidence, corpus testing, false-positive simulation, deployment tracking, and coverage summaries.

## Safety Boundary

- Rules must stay defensive and detection-focused.
- Do not include payloads, exploitation steps, evasion instructions, credential theft guidance, or destructive actions in rule text.
- Offensive validation belongs only in authorized lab workflows and must be represented as telemetry expectations, not target compromise instructions.

## Supported MVP Formats

- `sigma-like-json`: internal structured rule used by deterministic corpus tests.
- `kql`: export for Microsoft Sentinel or Defender XDR-style analytics.
- `spl`: export for Splunk search and Enterprise Security workflows.
- `yara`: defensive static signature text for file or memory scanning workflows.

List formats:

```bash
curl -sS http://127.0.0.1:3001/detections/formats
```

## Lifecycle Flow

Generate detections from a case:

```bash
curl -sS -X POST http://127.0.0.1:3001/cases/case_example/detections
```

The response includes the original structured rule plus v2 variants in KQL, SPL, YARA, and Sigma-like JSON.

Validate a v2 rule:

```bash
curl -sS -X POST http://127.0.0.1:3001/cases/case_example/detections/detection_rule_001/v2/validate \
  -H 'content-type: application/json' \
  -d '{"format":"kql"}'
```

Run a corpus:

```bash
curl -sS -X POST http://127.0.0.1:3001/cases/case_example/detections/detection_rule_001/test-corpus \
  -H 'content-type: application/json' \
  -d '{
    "corpusItems": [
      {
        "label": "positive",
        "source": "fixture",
        "expectedMatch": true,
        "eventData": {
          "process": {
            "image": "powershell.exe",
            "command_line": "-EncodedCommand SQBFAFgA"
          }
        },
        "tags": ["encoded PowerShell"]
      }
    ]
  }'
```

Simulate false positives:

```bash
curl -sS -X POST http://127.0.0.1:3001/cases/case_example/detections/detection_rule_001/simulate-false-positives \
  -H 'content-type: application/json' \
  -d '{
    "corpusItems": [
      {
        "label": "benign",
        "source": "admin fixture",
        "expectedMatch": false,
        "eventData": {
          "process": {
            "image": "powershell.exe",
            "command_line": "Get-Service WinRM"
          }
        },
        "tags": ["admin automation"]
      }
    ]
  }'
```

Record deployment status:

```bash
curl -sS -X POST http://127.0.0.1:3001/cases/case_example/detections/detection_rule_v2_002/deployments \
  -H 'content-type: application/json' \
  -d '{
    "backend": "microsoft-sentinel",
    "version": "1.0.0",
    "status": "planned",
    "owner": "detection-engineering"
  }'
```

Review coverage:

```bash
curl -sS http://127.0.0.1:3001/cases/case_example/detections/coverage
```

## Review Checklist

- Rule metadata includes evidence refs, data sources, owner, severity, and technique mapping.
- Validation passes syntax and safety checks.
- Positive corpus items match and benign items do not.
- False-positive risk is reviewed before deployment.
- Deployment records include backend, version, owner, and drift status.
