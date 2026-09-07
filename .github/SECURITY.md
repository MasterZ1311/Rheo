# Security Policy for Rheo

Security and privacy are fundamental pillars of **Rheo**. Because Rheo executes deep learning models directly on user workstations, we maintain rigorous security practices regarding process isolation, local networking, and dependency integrity.

---

## Supported Versions

Security updates and critical vulnerability patches are actively maintained for the current release series:

| Version | Supported |
| :--- | :--- |
| **0.1.x** | :white_check_mark: Active Support |

---

## Reporting a Vulnerability

If you identify a security vulnerability in Rheo, please disclose it responsibly. **Do not create public GitHub issues for sensitive security vulnerabilities.**

### Reporting Process
1. Contact the maintainer directly by emailing: **[thenappanmasterz1311@gmail.com](mailto:thenappanmasterz1311@gmail.com)**.
2. Alternatively, submit a private disclosure through GitHub Security Advisories at [MasterZ1311/Rheo/security/advisories](https://github.com/MasterZ1311/Rheo/security/advisories).
3. Please include:
   - A description of the vulnerability and attack vector.
   - Exact steps or proof-of-concept code to reproduce the issue.
   - The operating system, runtime environment, and Rheo version tested.
   - Any potential mitigations or remediation strategies.

### Response Commitment
- **Initial Response:** Within 48 hours of receipt.
- **Triage & Assessment:** Regular updates on validation and patch development.
- **Public Disclosure:** Coordinated public advisory once an update has been released.

---

## Architecture & Security Principles

- **Zero Data Ingestion:** Rheo does not transmit audio recordings, synthetic generations, or user transcripts to any external servers.
- **Localhost Binding:** Backend HTTP, WebSocket, and MCP endpoints bind to loopback addresses (`127.0.0.1`) by default with strict CORS and origin verification.
- **Model Integrity:** Weight downloads verify HuggingFace checksums and hashes before loading tensors into host memory.

---

© 2026 MasterZ1311 · Rheo — Sovereign Local-First AI Voice Studio
