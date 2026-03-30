# Terminology Library

> Authoritative reference for abbreviations, acronyms, and domain-specific terms used across PolicyForge.
> When writing UI labels, documentation, or code comments, use the **Display Form** column as the canonical spelling.

---

## Insurance Domain Terms

| Abbreviation / Short Form | Full Term | Display Form | Notes |
|---|---|---|---|
| BA | Binding Authority | Binding Authority | Use full form in headings and labels; BA acceptable in code identifiers and compact UI contexts |
| GWP | Gross Written Premium | GWP | Always capitalised as acronym |
| YTD | Year to Date | YTD | Always capitalised as acronym |
| YTD GWP | Year to Date Gross Written Premium | YTD GWP | Compound acronym — no expansion needed in UI |
| YoA | Year of Account | Year of Account | Abbreviated form `YoA` acceptable in compact table columns |
| LOB | Line of Business | Line of Business | Abbreviated form `LOB` acceptable in compact table columns |
| UMR | Unique Market Reference | UMR | Always capitalised as acronym |
| NTU | Not Taken Up | NTU | Always capitalised as acronym |
| EPI | Estimated Premium Income | EPI | Always capitalised as acronym |
| TCV | Total Contract Value | TCV | Always capitalised as acronym |
| RI | Reinsurance | Reinsurance | Write in full in headings; RI acceptable in identifiers |
| P&C | Property and Casualty | Property & Casualty | Use `P&C` only in compact contexts |
| E&O | Errors and Omissions | Errors & Omissions | Use `E&O` only in compact contexts |
| D&O | Directors and Officers | Directors & Officers | Use `D&O` only in compact contexts |

---

## Platform / Technical Terms

| Abbreviation / Short Form | Full Term | Display Form | Notes |
|---|---|---|---|
| org | Organisation | Organisation | `orgCode` is acceptable as a code identifier; display as "Organisation" in UI |
| orgCode | Organisation Code | Organisation Code | Internal identifier — not displayed directly to users |
| JWT | JSON Web Token | JWT | Always capitalised as acronym — not expanded in UI |
| API | Application Programming Interface | API | Always capitalised as acronym |
| BE | Backend | Backend | Dev shorthand only — not used in user-facing text |
| FE | Frontend | Frontend | Dev shorthand only — not used in user-facing text |
| DB | Database | Database | Dev shorthand only — not used in user-facing text |
| BA (tech) | Binding Authority (domain) | Binding Authority | Context distinguishes from "Business Analyst" — PolicyForge always means Binding Authority |
| KPI | Key Performance Indicator | Key Performance Indicator | Full form in headings; KPI acceptable in chart labels |
| PWA | Progressive Web App | Progressive Web App | Dev context only |

---

## Submission / Workflow Status Terms

| Term | Meaning | Canonical Status String |
|---|---|---|
| Created | Submission received; not yet reviewed | `Created` |
| In Review | Underwriter is actively reviewing | `In Review` |
| Quoted | A quote has been issued against the submission | `Quoted` |
| Bound | Risk has been bound; policy issued | `Bound` |
| Declined | Submission rejected | `Declined` |
| Referred | Flagged for senior review | `Referred` |
| NTU | Risk not taken up after quoting | `NTU` |
| Lapsed | Submission expired without action | `Lapsed` |

---

## UI Label Conventions

- Acronyms listed above are **exceptions** to the §14.10 Title Case rule — do not rewrite them to sentence form.
- When an acronym appears within a Title Case label, keep it capitalised: `YTD GWP Summary`, `BA Contract Details`.
- Do not invent new abbreviations. If a new term is needed, add it to this library first.

---

*Last updated: 2026-03-16*
