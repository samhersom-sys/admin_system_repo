1. REQ-QUO-FE-F-091: This gap-analysis requirement shall constrain REQ-QUO-FE-F-046 by stating the Quote Sections grid shall not include these attributes as columns: Written Order %, Signed Order %, Time Basis, Written Order Basis, Signed Order Basis, Written Line Total, Signed Line Total, DA Ref, DA Section Ref.
2. Acceptance Criterion for REQ-QUO-FE-F-091: When the Sections tab loads in Draft or locked status, each excluded label appears zero times as a column header while all non-excluded REQ-QUO-FE-F-046 columns remain present.
3. REQ-QUO-FE-F-092: This gap-analysis requirement shall constrain REQ-QUO-FE-F-052 by stating the excluded attributes from REQ-QUO-FE-F-091 shall not be removed from Quote Section Details and shall remain details-only.
4. Acceptance Criterion for REQ-QUO-FE-F-092: Opening section details from the grid shows Written Order %, Signed Order %, Time Basis, Written Order Basis, Signed Order Basis, Written Line Total, Signed Line Total, Delegated Authority Reference, and Delegated Authority Section Reference.
5. REQ-QUO-FE-F-093: Movement behavior for this delta shall not permit edit interaction in grid scope and shall remain display-only in details scope.
6. Acceptance Criterion for REQ-QUO-FE-F-093: Sections grid exposes no editable Movement controls and details Movement fields render read-only.
7. REQ-QUO-FE-F-094: Test coverage for this delta shall not rely on canonical requirement rewrites and shall validate only the gap constraints against existing baseline REQs.
8. Acceptance Criterion for REQ-QUO-FE-F-094: Automated tests include at least one assertion for excluded grid headers and at least one assertion for retained details fields.
9. REQ-QUO-FE-F-095: Sponsor walkthrough documentation shall include this delta as a Draft checkpoint so regressions in excluded headers and retained details fields are detectable.
10. Acceptance Criterion for REQ-QUO-FE-F-095: Sponsor checklist includes Draft steps and expected outcomes for excluded grid headers, retained details fields, and read-only Movement behavior.
11. Impact Analysis UI: REQ-QUO-FE-F-046 is adjusted by exclusion-only constraints and REQ-QUO-FE-F-052 remains authoritative for details fields.
12. Impact Analysis API: No endpoint, payload shape, or contract semantics are added or removed by this gap.
13. Impact Analysis DB: No schema change; existing section attributes remain stored and available to details workflows.
14. Sponsor Review Steps Status: Draft.
15. Sponsor Review Step 1: Log in as a user who can edit Draft quotes.
16. Sponsor Review Step 2: Open a quote with at least one section and select the Sections tab.
17. Sponsor Review Step 3: Verify none of the excluded labels from REQ-QUO-FE-F-091 are present as grid headers.
18. Sponsor Review Step 4: Open section details from the section reference link.
19. Sponsor Review Step 5: Verify all retained details fields listed in REQ-QUO-FE-F-092 are visible.
20. Sponsor Review Step 6: Verify Movement fields are visible but not editable.
21. Sponsor Expected Outcome 1: Grid displays only non-excluded baseline columns.
22. Sponsor Expected Outcome 2: Section details retains operational fields that are excluded from grid scope.
23. Sponsor Expected Outcome 3: Movement behavior remains non-editing in this delta.