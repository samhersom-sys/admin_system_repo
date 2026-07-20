# Policy Forge — Approved Baseline Register

This is the official record of every feature, page, function, and requirement that has been formally approved by the Project Sponsor and is part of the Policy Forge baseline build.

---

## What This Document Governs

Once an item is entered in this register it is part of the **approved baseline**.

- Any change to a baselined item — modification, removal, or replacement — requires a **Change Request** to be raised and approved by the Project Sponsor **before any work begins**
- No agent, developer, or AI pipeline may modify a baselined item without an approved Change Request referencing that baseline entry
- A Change Request must be raised even for changes that appear minor (e.g. changing a field label, removing a button, adjusting a status value)

If work is proposed that would affect a baselined item and no approved Change Request exists, the Orchestrator must stop and raise an open question.  This is a hard stop.

---

## Baseline Entry Format

The register is an **index and approval stamp only**.  Full detail lives in the requirements file and sponsor review checklist.  Do not duplicate content here.

```
### BL-[NNN]: [Short feature name]

Domain:       [domain name]
Approved:     YYYY-MM-DD
Requirements: [path to .requirements.md]
Review steps: docs/Project Documentation/09-Sponsor-Review-Checklist.md → [entry ID]
Status:       Active | Modified (CR-[NNN]) | Removed (CR-[NNN])
```

---

## Change Request Format

```
### CR-[NNN]: [Short description of the change]

Raised:         YYYY-MM-DD
Affects:        BL-[NNN] — [baseline entry name]
Type:           Modification | Addition to baseline | Removal from baseline
Requested by:   [who raised it]
Business reason: [why this change is needed]
Impact:         [what else in the product might be affected]

Proposed changes:
  - [specific change 1 in plain English]
  - [specific change 2]

Status:         Pending Approval | Approved YYYY-MM-DD | Rejected YYYY-MM-DD
Decision note:  [reason for approval or rejection, recorded at decision time]
```

A Change Request must be approved **before** the delivery pipeline is invoked.  Approval is recorded by the Project Sponsor writing "Approved — [date]" in the Status field.

---

## Baseline Entries

> No entries yet.  Entries are added by the Quality Guardian at Gate 4 approval, one per delivered feature.

<!-- ============================================================
     BASELINE ENTRIES APPENDED BELOW IN DELIVERY ORDER
     ============================================================ -->

### BL-001: Configurable Homepage (HOME-CFG)

Domain:       home (runtime), reporting (config UI), users (backend preferences)
Approved:     2026-06-30 (Gate 1 — Project Sponsor; Gate 2 — Solution Architect)
Requirements: frontend/src/home/homepage-config.requirements.md
Review steps: docs/Project Documentation/09-Sponsor-Review-Checklist.md → TBC (Gate 4)
Status:       In Progress — SA Approved 2026-06-30 / Awaiting Gate 4 (Quality Guardian)

---

## Change Requests

> No change requests yet.

<!-- ============================================================
     CHANGE REQUESTS APPENDED BELOW IN RAISED ORDER
     ============================================================ -->
