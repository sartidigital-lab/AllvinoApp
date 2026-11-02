---
phase: 1
slug: architecture-and-base
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-17
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js Build & Lint (Compiler) |
| **Config file** | next.config.js / tsconfig.json |
| **Quick run command** | `npm run lint` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd-verify-work`:** Full build must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | ARCH-01 | — | N/A | integration | `npm run lint` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | ARCH-02 | — | N/A | integration | `npx tailwindcss build` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 2 | ARCH-03 | — | N/A | unit | `npm run build` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 3 | ARCH-04 | — | N/A | manual | N/A | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package.json` — configure scripts `lint` and `build`
- [ ] `next.config.js` — core config

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CI/CD Pipeline | ARCH-04 | External systems | Abrir PR no GitHub e checar se o workflow rodou; e se o Vercel deploy concluiu. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
