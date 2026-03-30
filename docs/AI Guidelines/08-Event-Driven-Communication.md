# AI GUIDELINES — SECTION 8: EVENT-DRIVEN COMMUNICATION

This document defines how domains, workflows, and shared services communicate with each other without creating direct dependencies.

---

## 8.1  Why Event-Driven Communication Matters

Direct cross-domain calls create tight coupling.  When Domain A calls Domain B directly:

- A change to Domain B breaks Domain A
- Testing Domain A requires Domain B to be present
- Domain boundaries become meaningless over time
- The system becomes a distributed monolith rather than a clean architecture

Events decouple domains.  Domain A publishes what happened.  Domain B decides what to do about it.  Neither knows about the other.

---

## 8.2  The Event Bus (Shared Service)

The event bus is a shared service that lives in:

```
lib/event-bus/
  event-bus.requirements.md
  event-bus.test.ts
  event-bus.ts
```

It provides three functions:

| Function | Purpose |
|----------|---------|
| `publish(event)` | Publish an event for any subscriber to receive |
| `subscribe(eventName, handler)` | Register a handler to be called when a matching event is published |
| `unsubscribe(eventName, handler)` | Remove a handler |

The event bus must be:

- Domain-agnostic (it knows nothing about submissions, quotes, or policies)
- Multi-tenant aware (events carry tenant context)
- Synchronous for initial implementation (async may be introduced later)
- Fully testable in isolation

---

## 8.3  Event Structure

Every event must carry a standard envelope:

```ts
interface PolicyForgeEvent {
  name: string;           // e.g. 'submission.created'
  payload: unknown;       // domain-specific data
  orgCode: string;        // tenant identity
  userId: string;         // who triggered it
  timestamp: string;      // ISO 8601
  correlationId: string;  // trace ID for debugging
}
```

The payload is typed per event.  Event payload types are defined by the publishing domain.

---

## 8.4  Event Naming Convention

```
[domain].[past-tense-action]

Examples:
  submission.created
  submission.assigned
  submission.status-changed
  quote.created
  quote.accepted
  quote.declined
  policy.bound
  policy.endorsed
  claim.opened
  claim.settled
  binding-authority.created
  party.created
  notification.sent
```

Rules:

- Always lower-case
- Domain name first
- Action in past tense (something has already happened)
- No product names, no tenant names, no implementation details in the event name

---

## 8.5  Who Publishes and Who Subscribes

| Event | Published by | Subscribed by |
|-------|-------------|--------------|
| `submission.created` | Submissions domain | Notifications, Audit, Workflow |
| `submission.assigned` | Submissions domain | Notifications, Audit |
| `submission.status-changed` | Submissions domain | Notifications, Audit, Reporting |
| `quote.created` | Quotes domain | Submissions domain (via workflow), Notifications, Audit |
| `quote.accepted` | Quotes domain | Policy domain (via workflow), Notifications, Audit |
| `policy.bound` | Policy domain | Finance domain (via workflow), Notifications, Audit |
| `claim.opened` | Claims domain | Notifications, Audit, Reporting |
| `party.created` | Parties domain | Notifications, Audit |

> **Note:** Domains subscribe through workflows.  The workflow orchestrates the response to an event.  The domain does not directly subscribe to another domain's events.

---

## 8.6  Rules the AI Must Enforce

| Rule | Enforcement |
|------|-------------|
| No direct import from Domain A into Domain B | Flag as boundary violation |
| Cross-domain communication must flow through the event bus | Flag any direct domain-to-domain call |
| Events must carry tenant context (`orgCode`) | Flag any event missing `orgCode` |
| No circular event chains | Flag any subscription chain that loops |
| Event names must follow the naming convention | Flag any event with non-standard naming |
| Event payload types must be defined by the publishing domain | Flag any untyped event payload |

---

## 8.7  Open Questions (Event-Driven — Initial)

The following questions must be answered before the event bus is built:

1. Should the event bus be synchronous (in-process) or asynchronous (message queue)?  
   *Recommendation: start synchronous, design for async later.*

2. Should events be persisted for replay/audit, or fire-and-forget?  
   *Recommendation: integrate with the Audit shared service to persist domain events.*

3. Which events require guaranteed delivery (e.g. `policy.bound` triggering invoice generation)?

4. How should failed event handlers be handled — retry, dead-letter, or log?

These are logged in `Technical Documentation/08-Open-Questions.md`.
