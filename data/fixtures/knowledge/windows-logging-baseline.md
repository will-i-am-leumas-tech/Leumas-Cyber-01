# Windows Logging Baseline

Review date: 2027-01-01

## Authentication

- Collect Event ID 4624 for successful logons and Event ID 4625 for failed logons.
- Retain identity logs long enough to investigate password spraying and brute-force activity.
- Correlate authentication events with VPN, proxy, and endpoint telemetry.

## PowerShell

- Enable PowerShell script block logging, module logging, and transcription on administrative systems.
- Forward PowerShell operational logs to central logging.
- Review encoded command executions for authorized administration context.
