# PROJECT DOCUMENTATION — 01: ARCHITECTURAL OVERVIEW

This document describes the overall structure of the Policy Forge platform in the new `Cleaned` architecture.  It is the primary reference for understanding how the system is organised and how its parts relate to each other.

---

## 1.1  What Policy Forge Is

Policy Forge is a web-based insurance management platform for the London Market and specialty insurance sector.  It supports the full lifecycle of insurance contracts:

```
SUBMISSION → QUOTE → POLICY → CLAIM
```

It serves multiple organisations (tenants) on the same platform, with strict data isolation between them.  Users may be underwriters, brokers, claims handlers, finance staff, or administrators.

Key characteristics:
- **Multi-tenant**: Multiple organisations, strict data isolation per tenant
- **Role-based**: Users see and do different things depending on their role
- **Workflow-driven**: Business processes follow defined stages with structured transitions
- **Event-driven**: Domains communicate through events to avoid tight coupling
- **AI-assisted**: Submissions can be extracted from broker emails using AI
- **Configurable**: Products, rating rules, and field metadata are configurable without code changes

---

## 1.2  The Structural Layers

The architecture is organised into six structural layers:

```
┌──────────────────────────────────────────────────────────────────┐
│                      PAGES / APP SHELL                           │
│   /app/pages/    — user-facing pages and route targets           │
│   /app/features/ — app-level features (chat, workspace tabs)     │
└────────────────────────────┬─────────────────────────────────────┘
                             │ uses
┌────────────────────────────▼─────────────────────────────────────┐
│                          WORKFLOWS                                │
│   /workflows/   — orchestration across domains                   │
└──────┬─────────────────────────────────────────┬─────────────────┘
       │ uses                                    │ uses
┌──────▼──────────┐     ┌───────────────┐   ┌───▼────────────────── ┐
│     DOMAINS     │     │    SHARED     │   │    SHARED SERVICES    │
│   /domains/     │  ←  │    MODULES    │   │      /shared/         │
│  business logic │  events  /sharedmodules/ │  domain-agnostic tools│
│                 │  →  │  cross-domain │   │                       │
└──────┬──────────┘     │  concepts     │   └───────────────────────┘
       │ uses           └───────────────┘
┌──────▼────────────────────────────────────────────────────────────┐
│                     REUSABLE UI PRIMITIVES                        │
│   /components/   — domain-agnostic UI building blocks             │
└───────────────────────────────────────────────────────────────────┘
```

Each layer has strict rules about what it can import from.  See `AI Guidelines/04-Architectural-Boundaries.md`.

---

## 1.3  Domains

Domains are vertical slices of the system.  Each domain owns a specific area of business logic.  Domains do not call each other directly — they communicate through the event bus.

See `Project Documentation/02-Domain-Definitions.md` for the full list.

---

## 1.4  Workflows

Workflows orchestrate behaviour across domains.  They listen for events from domains, decide what should happen next, and trigger the appropriate domain actions.

See `Project Documentation/03-Workflow-Definitions.md` for the full list.

---

## 1.5  Shared Services

Shared services provide capabilities used by all domains.  They are domain-agnostic utilities.  Examples: `api-client`, `formatters`, `event-bus`, `auth-session`, `notifications`, `design-tokens`.  They never import from domains.  They receive all data as parameters.

See `Project Documentation/04-Shared-Service-Definitions.md` for the full list.

---

## 1.5a  Shared Modules

Shared modules are cross-domain business concepts that have their own data model and UI components but are not owned by any single domain.  They are distinct from shared services because they carry business-relevant data, not just utility logic.

**The rule of shared modules:**
- A concept becomes a shared module when two or more domains need to read or display it in identical ways.
- The module owns the data shape, the API route(s), and the UI components for displaying that concept.
- Individual domain routes may reference the module's data (e.g. a quote has a list of locations) but they do not duplicate the module's components.
- Shared modules may not import from any domain.

**Currently identified shared modules:**

| Module | Why it is shared |
|--------|------------------|
| `invoices` | Created by quote issuance and endorsement issuance; consumed by finance for cash allocation and aged debt monitoring.  The creation logic and output format are identical regardless of which domain triggers it. |
| `locations` | A submission, quote, policy, and endorsement can all carry a list of locations.  The data shape, the entry form, and the display component are identical across all four. |

Shared modules live in `sharedmodules/`.

---

## 1.5b  App Features

App features are application-level capabilities that serve the user but are not part of any core business workflow and are not owned by any domain.  They are distinct from both domains and shared services.

**The rule of app features:**
- An item becomes an app feature when it enriches or supports the use of the application without being tied to a specific business object (submission, quote, policy, etc.).
- App features may use shared services.  They may not import from domains.
- App features are mounted in the application shell, not inside domain pages.

**Currently identified app features:**

| Feature | Description |
|---------|-------------|
| `workspace-tabs` | Allows users to hold multiple open records in named tabs within a session.  Does not own any domain data itself. |
| `chat-dock` | Allows users within the same organisation to send messages to each other within the application.  Scoped to the same `org_code`.  Not tied to any specific domain. |

App features live in `app/features/`.

---

## 1.6  Reusable UI Primitives

UI primitives are domain-agnostic React components.  They render structure (grids, tables, modals, tabs) and user interactions (buttons, inputs, selects).  They contain no domain logic.  All behaviour is configured through props.

See `Project Documentation/05-Reusable-UI-Primitive-Catalogue.md` for the full list.

---

## 1.7  Application Pages

Application pages live in `/app/pages/`.  They assemble domains, workflows, shared modules, and UI primitives into user-facing screens.  Pages call backend routes via the `api-client` shared service; they do not import domain logic directly.

The first two pages being structured are:
- `/app/pages/auth/` — login and session management
- `/app/pages/home/` — the authenticated homepage dashboard

---

## 1.8  Multi-Tenancy

Every layer of the system is multi-tenant aware.  Tenant identity (org code) is established at authentication time and flows through every request, every query, and every event.

See `Project Documentation/06-Multi-Tenant-Rules.md` and `AI Guidelines/05-Multi-Tenant-Rules.md`.

---

## 1.9  The Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (JSX/TSX), React Router, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| AI Integration | OpenAI API |
| Email Monitoring | IMAP (email-scheduler) |
| Containerisation | Docker, Docker Compose |
| Testing | Jest, Playwright |
| PDF Generation | Custom document-generator |

---

## 1.10  Folder Structure Summary

```
Cleaned/
  AI Guidelines/             ← How the AI must behave
  Project Documentation/     ← Architecture and domain docs
  Technical Documentation/   ← Migration notes and plans
  domains/                   ← Business logic vertical slices
  workflows/                 ← Orchestration across domains
  shared/                    ← Domain-agnostic utilities (api-client, formatters, etc.)
  sharedmodules/             ← Cross-domain business concepts (invoices, locations)
  components/                ← Reusable UI primitives (no domain logic)
  app/
    pages/
      auth/                  ← Login page
      home/                  ← Homepage dashboard
    features/
      workspace-tabs/        ← App-level tab management
      chat-dock/             ← In-app org-scoped messaging
    layouts/                 ← AppLayout, PublicLayout
```

See `Project Documentation/08-Folder-Structure.md` for the full expanded structure.
