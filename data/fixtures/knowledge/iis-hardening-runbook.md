# IIS Hardening Runbook

Review date: 2027-01-01

## TLS and Certificates

- Enforce TLS 1.2 or newer for all IIS sites.
- Disable weak cipher suites and deprecated protocols.
- Renew certificates before expiration and monitor certificate inventory.

## Application Pools

- Run each application pool with a dedicated least-privilege identity.
- Disable unused application pools and remove sample applications.
- Recycle application pools during approved maintenance windows.

## Logging

- Enable W3C request logging with timestamp, source IP, URI, status code, and user agent.
- Forward IIS logs to the central SIEM with retention aligned to incident response needs.
- Alert on repeated 401, 403, and 500 status patterns from unusual source networks.
