# Tool Sandbox Failure

Use this runbook when a sandboxed tool run is denied, requires approval, times out, or returns incomplete artifacts.

## Triage Steps

1. Fetch the run:

```http
GET /sandbox/runs/{id}
```

2. Fetch captured artifacts:

```http
GET /sandbox/runs/{id}/artifacts
```

3. Check the run status:

- `denied`: policy blocked the request before execution.
- `approval_required`: the manifest requires explicit approval.
- `timed_out`: execution exceeded the manifest timeout.
- `failed`: the connector or no-op execution returned an error.
- `completed`: execution finished and artifacts were captured.

## Common Causes

- Manifest not found or disabled.
- Parameter names are not declared in `allowedInputs`.
- Requested `limit` exceeds `maxRecords`.
- Destination is outside the egress allowlist.
- Write-capable operation lacks approval.
- Output exceeded `maxOutputBytes` and was truncated.

## Approval Flow

Approve or reject a pending run:

```http
POST /sandbox/runs/{id}/approve
```

Approvals should include an approver identity and a reason. Approval records are audited and do not bypass tenant or route permissions.

## Artifact Review

Artifacts include type, reference, hash, size, redaction status, and summary. Secret-like output is redacted before artifact metadata is persisted.

## Safety Boundary

Do not modify manifests to enable stealth, persistence, credential theft, destructive actions, unauthorized writes, or third-party target access. Keep new tools read-only or dry-run until policy and tests cover the intended operation.
