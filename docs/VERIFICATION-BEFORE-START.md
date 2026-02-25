# SLOP – Verification Before Start (Rules, Plan, Skills Check)

**Date:** 2025-02-25  
**Purpose:** Confirm plan and rules are aligned, apply domain/the-fool/best-practices/TLC-style checks, and list anything missing before implementation.

---

## 1. Plan ↔ Rules Alignment ✅

| Plan section | Rules | Status |
|--------------|--------|--------|
| §3 Domain Model, §7 Data Model | slop-domain-and-data.mdc | **Aligned** – Entities, invariants, fulfillment logic match. |
| §4 Roles, §8 Auth | slop-auth.mdc | **Aligned** – @haptiq.com only, orderer vs colleague, where to enforce. |
| §5 Design & UX | slop-ux-and-ui.mdc, slop-design-system.mdc | **Aligned** – Central list, cards, omnisearch, scatter, Blinkit tokens. |
| §6 Scope | slop-scope.mdc | **Aligned** – In/out/later; notifications in-app first, no Slack MVP. |
| §8 Technical | slop-stack-and-plan.mdc, slop-styling.mdc | **Aligned** – TanStack Start, Bun, PostgreSQL, CSS Modules. |
| Context7 | context7-technical.mdc | **Aligned** – Use for TanStack Start, Bun, PostgreSQL, auth libs when implementing. |

**Minor wording:** Plan §6 "In scope" says "Slack: later (V2+)" in the same list as MVP items. Rules correctly separate "In scope (MVP)" and "Later (V2+)". No change needed; rules are the single source for scope.

---

## 2. Domain Analysis (Skill: domain-analysis)

**Subdomains (from plan §3):**

| Subdomain     | Type        | Bounded context | Cohesion |
|---------------|-------------|------------------|----------|
| **Catalog**   | Supporting  | Items (name, category, is_evergreen) | High – single responsibility. |
| **Requests**  | Core        | Request (item, requester, status, fulfillment_id) | High – core “list” behavior. |
| **Fulfillment** | Core      | Fulfillment, FulfillmentThreshold, fulfilled_at | High – when to notify, when list clears. |
| **Notifications** | Supporting | Notify orderer (immediate / threshold) | High – in-app first. |
| **Identity**  | Generic     | Users (email, role), @haptiq.com | Standard; fits auth. |

**Assessment:**  
- No inventory subdomain (intentionally out of scope).  
- “One instance per product” and “single shared list” are clear invariants in the rules.  
- **No missing bounded context** for MVP. Optional: explicit “Settings” context (FulfillmentThreshold) is already under Fulfillment; fine to keep there.

**Data consistency:**  
- Requests reference `item_id`, `fulfillment_id`, requester (user or email). Plan says "requester_id (or email)" – see §4 below for implementation choice.

---

## 3. Pre-Mortem / “What Could Be Missing?” (Skill: the-fool)

**Assumption:** We start implementation with only the plan + rules (greenfield, no app code yet).

**Failure mode 1: Auth choice deferred**  
- Plan says “magic link or SSO” and “@haptiq.com only.” If we start Phase 1 without picking one, we may wire the wrong flow or refactor later.  
- **Mitigation:** Decide before Phase 1: magic link **or** SSO (e.g. Google Workspace with domain restrict). Document in plan or STATE.md.

**Failure mode 2: Requester identity ambiguous**  
- Data model: “requester_id (or email).” If we store only email and add Users later, we may duplicate or migrate. If we require User from day one, colleagues must exist in DB before first request.  
- **Mitigation:** Decide: (A) Request.requester_id FK to Users only, or (B) Request can store email for “guest” requesters. Plan and rules imply all users are @haptiq.com and authenticated → (A) is consistent; ensure Phase 1 creates User on first sign-in.

**Failure mode 3: Threshold “list size” definition**  
- Threshold is “list size” or “distinct requesters.” “List” = pending + in_fulfillment, one request per item. So “5 items” = 5 distinct items; “3 requesters” = 3 distinct users with at least one request.  
- **Mitigation:** Decided: **min items only** (count distinct item_id on list). Plan §7 and rules updated; no min requesters in MVP.

**Failure mode 4: No explicit testing strategy**  
- Plan Phases 1–6 don’t mention tests. “bun test” is in stack; no unit/e2e/integration guidance.  
- **Mitigation:** Add a short “Testing” subsection to §8 or to a DEV.md: what to test per phase (e.g. auth flows, add-request idempotency, fulfill clears list), and use `bun test` from the start.

**Failure mode 5: Env and secrets undefined**  
- ALLOWED_EMAIL_DOMAIN is in slop-auth.mdc; no list of env vars (DB URL, auth provider keys, etc.).  
- **Mitigation:** Before Phase 1, add a small “Environment / Config” section (plan or README): e.g. `DATABASE_URL`, `ALLOWED_EMAIL_DOMAIN`, auth provider env vars, and that secrets are not committed.

---

## 4. Best Practices & Technical Gaps (Skill: best-practices)

- **HTTPS / security headers:** Not in plan; assume production deployment will enforce HTTPS and CSP. No change to plan; implement at deploy time.  
- **Auth:** Domain allowlist + magic link or SSO is stated. Need: exact provider (e.g. Better Auth, NextAuth-style, or vendor SSO) and where session is stored (cookie, DB).  
- **DB:** PostgreSQL confirmed. Not specified: driver (e.g. postgres, node-postgres, Drizzle, Kysely) or migration tool (e.g. node-pg-migrate, Drizzle Kit, custom SQL). Decide in Phase 1.  
- **Validation:** No explicit mention of input validation (e.g. add request, catalog CRUD). Assume validate in loaders/actions and return 4xx with clear messages; can add to coding guidelines when implementing.

---

## 5. TLC-Style Readiness (Skill: tlc-spec-driven)

- **Vision & goals:** Plan §1–2 and §6 cover problem, fulfillment model, and scope. ✅  
- **Roadmap:** Plan §10 Implementation Phases (1–6) are clear. ✅  
- **Verification per phase:** Phases have outcomes but not explicit “Definition of Done” or acceptance criteria.  
  - **Suggestion:** For each phase, add 2–4 bullet “Done when…” (e.g. Phase 1: “Done when: (1) User can sign in with @haptiq.com, (2) Session persists, (3) Non–haptiq.com is rejected.”). Optional file: `.specs/project/ROADMAP.md` with phases + criteria, or add to plan §10.  
- **State / decisions:** No STATE.md yet. Auth (magic link) and threshold (min items) are decided. Optional: `.specs/project/STATE.md` for “Decisions” and “Blockers.”  
- **Greenfield:** No codebase to map; no brownfield docs needed.

---

## 6. Summary: Recommended Before Starting

| Item | Action | Status |
|------|--------|--------|
| **Auth mechanism** | Choose: magic link **or** SSO; document and use consistently in Phase 1. | **Decided:** Magic link (MVP). Session cookies for persistence; no re-auth each visit. Plan §8 and slop-auth.mdc updated. |
| **Requester identity** | Commit: Request has requester_id → Users only; create User on first sign-in (no guest email). | Plan §8 updated: requester_id → Users, create User on first sign-in. |
| **Threshold semantics** | Clarify: min_pending_items vs min_pending_requesters, and whether both can be set (AND/OR). | **Decided:** Min items only (count of distinct items on list). Plan §7 and rules updated. |
| **Env / config** | Add a short list: DATABASE_URL, ALLOWED_EMAIL_DOMAIN, auth provider vars; note “no secrets in repo.” | Plan §8 updated: Environment / config subsection added. |
| **Testing** | Add a brief testing approach (what to test per phase, use `bun test`). | Plan §8 updated: Testing subsection added. |
| **Phase “Done when”** | Optionally add 2–4 acceptance bullets per phase in §10 or in `.specs/project/ROADMAP.md`. | Optional; not done. |
| **STATE.md** | Optional: create when first decision is recorded (e.g. auth choice). | Optional; not done. |

---

## 7. What’s Already Solid

- **Invariants** (single list, one per product, fulfillment on clear, no inventory, no cycles) are clear and repeated in plan + rules.  
- **Roles and enforcement** (orderer vs colleague, where to check) are specified.  
- **Stack** (TanStack Start, Bun, PostgreSQL, CSS Modules) is fixed; Context7 is mandated for docs.  
- **Scope** is clearly in/out/later; Slack is V2+.  
- **UX and design** (central list, cards, omnisearch, scatter, Blinkit tokens) are defined.  
- **Domain boundaries** (Catalog, Requests, Fulfillment, Notifications, Identity) are coherent and sufficient for MVP.

---

**Conclusion:** Plan and rules are consistent and sufficient to start. The plan was updated with: auth/requester guidance (§8), env/config and testing (§8), and threshold clarification (§7). **Auth decided:** magic link with session cookies (no re-auth each visit). **Threshold decided:** min items only (count of distinct items on list). Optional: add phase “Done when” criteria to §10 and `.specs/project/STATE.md` when recording decisions.
