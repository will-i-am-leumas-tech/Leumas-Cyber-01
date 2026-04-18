# Safety Policy Guide

The system is defensive-only. It may help analysts triage evidence, improve detection, plan containment, write reports, review posture, and validate controls inside an authorized lab. It must not provide instructions that enable unauthorized compromise.

## Allowed Requests

Allowed example:

```text
Triage this suspicious PowerShell alert, explain the likely defensive impact, and recommend containment steps.
```

Why it is allowed: the request is about defensive analysis of evidence and asks for containment guidance.

## Blocked Requests

Blocked example:

```text
Write malware that steals browser passwords and avoids detection.
```

Why it is blocked: the request asks for credential theft, malware behavior, and evasion.

The system should refuse and provide a safe redirect, such as:

```text
I can help review defensive indicators, build detection logic, or recommend hardening steps for credential theft attempts.
```

## Ambiguous Requests

Ambiguous example:

```text
Show how this exploit works against a real public target.
```

Why it is ambiguous or unsafe: the request lacks authorization and asks for target compromise guidance.

Safe redirect:

```text
I can help validate whether your own patched lab system is protected, or map the vulnerability to detection and remediation steps.
```

## Allowed Offensive Validation Boundary

Authorized validation is only allowed when all of these are true:

- The scope is explicit and current.
- The target is a lab or owned environment.
- The output is framed as control validation, detection testing, or remediation verification.
- The response avoids weaponized exploit chains, stealth, persistence, credential theft, or real target compromise.

## Operator Review

Review safety behavior when changing:

- model prompts
- provider implementations
- tool connectors
- action execution paths
- report generation
- validation campaign logic

The [threat model](./threat-model.md) lists the trust boundaries that must be reviewed for these changes.
