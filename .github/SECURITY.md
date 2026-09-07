# Security Policy

The Rheo team takes the security of our local-first AI software and our users' privacy very seriously. We appreciate your efforts to responsibly disclose any vulnerabilities.

## Supported Versions

| Version | Supported          | Security Patches |
| ------- | ------------------ | ---------------- |
| 0.5.x   | :white_check_mark: | Active           |
| 0.4.x   | :warning:          | Critical Only    |
| < 0.4.0 | :x:                | End of Life      |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you believe you have discovered a security vulnerability in Rheo:

1. **GitHub Security Advisory (Preferred)**: Submit a confidential report via [GitHub Security Advisories](https://github.com/MasterZ1311/Rheo/security/advisories/new).
2. **Direct Email**: Send details to **contact@rheo.sh** with the subject line [SECURITY] Vulnerability Report - Rheo.

### Information to Include

Please provide:
- A clear description of the vulnerability and its potential impact.
- Step-by-step reproduction instructions or a minimal proof of concept (PoC).
- Affected platform(s) (macOS, Windows, Linux, Docker) and Rheo version.
- Any suggested mitigations or patches if available.

### What to Expect

- **Acknowledgment**: We aim to acknowledge reports within **48 hours**.
- **Assessment**: We will confirm the vulnerability and determine its severity rating (CVSS).
- **Remediation**: Fixes will be prepared in private and coordinated with a scheduled release.
- **Credit**: We will gladly credit your responsible disclosure in our release notes and Security Advisories.

## Security Design Principles in Rheo

Rheo is architected around **Sovereign Computing**:
- **Loopback Enforcement**: Sensitive file read operations (e.g. /transcribe) are restricted strictly to loopback interfaces (127.0.0.1, ::1).
- **Zero Remote Telemetry**: Voice clones, microphone captures, and text prompts never leave your local hardware unless you explicitly configure third-party cloud integrations.
- **Cross-Origin Protection**: Strict CORS and Host Header validation prevents browser drive-by attacks from manipulating the local API server.
