# PROJECT DOCUMENTATION — 07: EVENT-DRIVEN COMMUNICATION RULES

This document defines how domains communicate with each other through events.  It is the project-level companion to `AI Guidelines/08-Event-Driven-Communication.md`.

---

## 7.1  Why Events Instead of Direct Calls

The legacy codebase shares data between features through React Context.  For example:

- `SubmissionsContext` is consumed by the Workflow page, the dashboard, and many other components
- `PartiesContext` is consumed by the Submissions context (for insured name resolution)
- `QuotesContext` is consumed by multiple pages

This creates invisible coupling.  A change to how parties are stored can break submission name resolution.  A change to context structure can silently break any page consuming that context.

The new architecture replaces this implicit coupling with explicit event contracts.  Each domain publishes events when things happen.  Other domains (via workflows) decide whether to react — without the publishing domain knowing anything about it.

---

## 7.2  The Event Contract

An event is a promise from the publishing domain: "This thing happened.  Here is the data you need to know about it."  The publishing domain does not know who is listening.

Once an event is published, its structure is a public contract.  It must not be changed without a migration plan.

---

## 7.3  Events Catalogue

The following events are known from the initial analysis of the legacy system:

### Submissions Domain

| Event | Trigger | Payload |
|-------|---------|---------|
| `submission.created` | A submission record is created | `{ submissionId, orgCode, brokerPartyId, insuredPartyId, classOfBusiness, estimatedPremium, source }` |
| `submission.assigned` | A submission is assigned to an underwriter | `{ submissionId, orgCode, assignedTo, assignedBy }` |
| `submission.status-changed` | Workflow status changes | `{ submissionId, orgCode, previousStatus, newStatus, changedBy }` |
| `submission.declined` | A submission is declined | `{ submissionId, orgCode, declinedBy, reason }` |

### Quotes Domain

| Event | Trigger | Payload |
|-------|---------|---------|
| `quote.created` | A quote is created for a submission | `{ quoteId, submissionId, orgCode, createdBy }` |
| `quote.accepted` | A quote is accepted by the insured | `{ quoteId, submissionId, orgCode, acceptedBy }` |
| `quote.declined` | A quote is declined | `{ quoteId, submissionId, orgCode, declinedBy }` |
| `quote.referred` | A quote is referred to another insurer | `{ quoteId, submissionId, orgCode, referredTo }` |

### Policies Domain

| Event | Trigger | Payload |
|-------|---------|---------|
| `policy.bound` | A policy is bound from an accepted quote | `{ policyId, quoteId, orgCode, boundBy }` |
| `policy.endorsed` | An endorsement is applied | `{ policyId, endorsementId, orgCode, endorsedBy }` |
| `policy.movement-recorded` | A financial movement is recorded | `{ policyId, endorsementId, orgCode, movementAmount }` |

### Claims Domain

| Event | Trigger | Payload |
|-------|---------|---------|
| `claim.opened` | A new claim is created | `{ claimId, policyId, orgCode, openedBy }` |
| `claim.settled` | A claim is settled | `{ claimId, policyId, orgCode, settledBy, settlementAmount }` |

### Parties Domain

| Event | Trigger | Payload |
|-------|---------|---------|
| `party.created` | A new party record is created | `{ partyId, orgCode, partyType, createdBy }` |

---

## 7.4  Subscriber Map

Who reacts to which events:

| Event | Handled by (workflow) | Domain effect |
|-------|----------------------|--------------|
| `submission.created` | (all workflows listening) | Notifications, Audit |
| `submission.assigned` | `submission-assignment` | Notifications, Audit |
| `submission.status-changed` | Various | Notifications, Audit, Reporting |
| `quote.accepted` | `quote-to-policy` | Policy binding triggered |
| `policy.bound` | `quote-to-policy` | Invoice generation, Notifications, Audit |
| `claim.opened` | `claim-lifecycle` | Notifications, Audit |

---

## 7.5  Known Legacy Gaps

The legacy codebase does not use events.  Cross-domain communication happens through:

- Shared React Context providers (SubmissionsContext, PartiesContext, etc.)
- Direct API calls from pages that read multiple entities
- Data enrichment inside context providers (e.g. insured name resolution in submissionsContext.js)

All of these are coupling patterns that the event-driven architecture must replace.  The migration plan must identify each coupling point and map it to an event-based replacement.

---

## 7.6  Open Questions

- OQ-007: Should all events be persisted to the database for audit/replay?  Or is the audit service responsible for persistence?
- OQ-008: Should the event bus be synchronous or asynchronous for the initial build?  (Recommendation: synchronous, designed for async.)
