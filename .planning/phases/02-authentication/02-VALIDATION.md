---
phase: 02
slug: authentication
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-17
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest / bash tests (curl for API) |
| **Config file** | none |
| **Quick run command** | `npm run lint` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | AUTH-01 | — | Supabase SSR utils block insecure cookies | unit/lint | `npm run lint` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | AUTH-02 | — | OAuth callback exchange handles code | unit/lint | `npm run lint` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | AUTH-03 | — | Middleware blocks unauthenticated routes | unit/lint | `npm run lint` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | AUTH-04 | — | Modal correctly manages state | unit/lint | `npm run lint` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Instalar pacotes `@supabase/ssr` e `@supabase/supabase-js`.

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Login Flow | AUTH-01 | Requires real Google OAuth interaction | Open localhost, click login with google, verify redirect and session creation |
| Middleware Redirect | AUTH-03 | Hard to mock cookie flow | Access `/conta` without session, verify redirect to `/?login=true` and modal opens |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
