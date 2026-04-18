rule Suspicious_Encoded_PowerShell_Execution
{
  meta:
    description = "Detects encoded PowerShell execution strings for defensive triage."
    severity = "high"
    purpose = "defensive detection"
  strings:
    $s1 = "-EncodedCommand" nocase
    $s2 = "FromBase64String" nocase
  condition:
    any of them
}
