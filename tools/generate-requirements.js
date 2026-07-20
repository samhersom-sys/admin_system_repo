/**
 * generate-requirements.js
 *
 * Generates a requirements tracker Excel file (requirements-tracker.xlsx)
 * in the project root.
 *
 * Run from the Cleaned root:
 *   node tools/generate-requirements.js
 *
 * Requires: exceljs  (npm install exceljs --save-dev in this folder)
 */

const ExcelJS = require('exceljs');
const path = require('path');

// ---------------------------------------------------------------------------
// Status colour fills
// ---------------------------------------------------------------------------
const FILL = {
  implemented: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } }, // soft green
  requirement:  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }, // soft amber
  concept:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD0E4F7' } }, // soft blue
};

const PRIORITY_FILL = {
  High:   { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE5CD' } },
  Medium: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDEDED' } },
  Low:    { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDEDED' } },
};

// ---------------------------------------------------------------------------
// Requirements data
// Columns: domain, requirement, priority, status
// status values: 'implemented' | 'requirement' | 'concept'
// ---------------------------------------------------------------------------
const ROWS = [
  // ── Authentication & Security ──────────────────────────────────────────
  ['Authentication & Security', 'Users can log in with their email address and password',                                                                      'High',   'implemented'],
  ['Authentication & Security', 'Each user only sees the functions and data their role permits (e.g. underwriter vs. broker vs. admin)',                       'High',   'implemented'],
  ['Authentication & Security', 'Sessions expire after inactivity; users can log out securely at any time',                                                    'High',   'implemented'],
  ['Authentication & Security', 'Passwords are stored securely and can be changed by the user from their profile',                                             'High',   'implemented'],

  // ── Platform Shell & Navigation ───────────────────────────────────────
  ['Platform Shell & Navigation', 'The application provides a consistent navigation menu and layout across all screens',                                        'High',   'implemented'],
  ['Platform Shell & Navigation', 'Each organisation\'s data is completely isolated — users from one company cannot see another company\'s records',            'High',   'implemented'],
  ['Platform Shell & Navigation', 'The platform supports multiple organisations (tenants) on a single system without code changes',                             'High',   'implemented'],

  // ── Audit Trail ───────────────────────────────────────────────────────
  ['Audit Trail', 'Every action taken on a record (who viewed it, who changed what and when) is automatically logged',                                          'High',   'implemented'],
  ['Audit Trail', 'When two users open the same record at the same time, both are shown a warning so they do not overwrite each other\'s changes',              'Medium', 'implemented'],
  ['Audit Trail', 'Duplicate audit log entries within a 10-second window are suppressed to keep the log clean',                                                 'Low',    'implemented'],

  // ── Home / Dashboard ─────────────────────────────────────────────────
  ['Home / Dashboard', 'A configurable home dashboard shows summary widgets relevant to the user\'s role (e.g. submissions pending, open quotes)',              'Medium', 'requirement'],
  ['Home / Dashboard', 'Dashboard widgets can be added, removed, or rearranged by administrators',                                                              'Low',    'concept'],

  // ── Submissions ───────────────────────────────────────────────────────
  ['Submissions', 'An underwriter can create a new insurance submission by filling in a form (insured name, broker, class of business, dates, estimated premium)','High',  'implemented'],
  ['Submissions', 'Broker emails are automatically read and the key submission details are extracted using AI, creating a draft submission without manual entry','High',   'implemented'],
  ['Submissions', 'AI-extracted submissions are flagged for review when the system is less confident, and routed to a pending queue when confidence is low',     'High',   'implemented'],
  ['Submissions', 'A filterable list of all submissions is displayed with reference, insured, broker, class of business, inception date, and status',           'High',   'implemented'],
  ['Submissions', 'Clicking a submission opens a detailed view showing all fields, linked quotes, related submissions, and the audit trail',                    'High',   'implemented'],
  ['Submissions', 'A submission can be assigned to a specific underwriter, changing its assignment status independently of its workflow status',                'High',   'implemented'],
  ['Submissions', 'A submission moves through defined stages: New → In Review → Clearance → Quoted / Declined / Bound',                                         'High',   'implemented'],
  ['Submissions', 'Submissions that share the same insured are automatically linked and shown in a "Related Submissions" tab',                                   'Medium', 'implemented'],
  ['Submissions', 'When a submission is for a Binding Authority Contract, the associated BA contracts are listed in a dedicated tab',                           'Medium', 'implemented'],
  ['Submissions', 'A "Clearance" button appears on a submission when it reaches the Clearance stage, linking to the clearance workflow',                        'High',   'implemented'],

  // ── Quotes ────────────────────────────────────────────────────────────
  ['Quotes', 'A quote can be created from a submission, inheriting the insured and broker details',                                                              'High',   'implemented'],
  ['Quotes', 'A quote is structured in sections by class of business, each section being independently priced',                                                  'High',   'implemented'],
  ['Quotes', 'Each section allows coverages to be defined with limits, excesses, and rates',                                                                     'High',   'implemented'],
  ['Quotes', 'Deductions (brokerage, overrider, commission) are recorded per section as percentages or fixed amounts',                                           'High',   'implemented'],
  ['Quotes', 'Insurer participations (line shares) are recorded per section, showing who takes what proportion of the risk',                                     'High',   'implemented'],
  ['Quotes', 'Premium is automatically calculated at three levels: Whole (100%), Market (subscribed lines), and Line (each insurer\'s share)',                   'High',   'implemented'],
  ['Quotes', 'A quote can be formally accepted (agreed by the broker/client) or declined, with the status tracked on the record',                               'High',   'implemented'],
  ['Quotes', 'An existing quote can be copied to create a new draft, preserving all sections, coverages, and deductions',                                        'Medium', 'implemented'],
  ['Quotes', 'Risk codes can be added or removed on a quote section to record the types of risk covered',                                                        'Medium', 'implemented'],
  ['Quotes', 'Quote section coverages can be added, edited, and removed through the Coverages tab within each section',                                          'High',   'requirement'],
  ['Quotes', 'Quote status follows a defined lifecycle: Draft → Referred → Accepted / Declined / Bound',                                                         'High',   'implemented'],

  // ── Parties ───────────────────────────────────────────────────────────
  ['Parties', 'A searchable list of all parties (insureds, brokers, insurers, coverholders) is available',                                                       'High',   'implemented'],
  ['Parties', 'A party record can be opened to view and edit full details: contact information, address, classification, and financial data',                    'High',   'implemented'],
  ['Parties', 'SIC (Standard Industrial Classification) codes can be searched and assigned to a party, supporting both US and UK SIC standards',               'Medium', 'implemented'],
  ['Parties', 'Entities linked to a party (e.g. Lloyd\'s syndicates associated with an insurer) can be viewed, added, edited, and removed',                    'Medium', 'implemented'],
  ['Parties', 'All submissions and quotes linked to a party are visible from within the party record',                                                            'Medium', 'implemented'],
  ['Parties', 'A new party can be created through a simple form',                                                                                                'High',   'implemented'],

  // ── Search ────────────────────────────────────────────────────────────
  ['Search', 'A global search bar allows users to search across submissions, quotes, policies, parties, and binding authorities from anywhere in the app',       'High',   'implemented'],
  ['Search', 'Search results display the record type, reference, and a summary, and clicking a result navigates directly to that record',                        'High',   'implemented'],

  // ── User Profile ──────────────────────────────────────────────────────
  ['User Profile', 'Users can view and update their own profile (name, email, job title)',                                                                        'Medium', 'implemented'],
  ['User Profile', 'Users can change their own password from the profile screen',                                                                                 'Medium', 'implemented'],

  // ── Platform Settings ─────────────────────────────────────────────────
  ['Platform Settings', 'Administrators can configure rating rules and rating profiles used to calculate premiums for different types of risk',                   'High',   'implemented'],
  ['Platform Settings', 'Administrators can define and manage insurance products available on the platform',                                                      'High',   'implemented'],
  ['Platform Settings', 'Administrators can manage organisation details, user accounts, and role assignments',                                                    'High',   'implemented'],
  ['Platform Settings', 'Data quality rules can be configured to flag submissions or quotes that are missing required information',                               'Medium', 'implemented'],

  // ── Workflow & Clearance ──────────────────────────────────────────────
  ['Workflow & Clearance', 'Before a submission proceeds, a clearance check is run to ensure there is no conflict with existing records (duplicate risk, sanctions)',   'High', 'requirement'],
  ['Workflow & Clearance', 'Underwriters receive notifications when a submission is assigned to them and can accept or reassign it through a structured workflow',  'High', 'requirement'],
  ['Workflow & Clearance', 'Broker emails arrive in a monitored inbox and are automatically processed to create submissions without manual intervention',            'High', 'requirement'],

  // ── Policies ──────────────────────────────────────────────────────────
  ['Policies', 'When a quote is accepted by the client, it can be bound to create a live policy record',                                                          'High',   'requirement'],
  ['Policies', 'The bound policy inherits all sections and coverages from the quote, providing a complete record of what was agreed',                             'High',   'requirement'],
  ['Policies', 'Mid-term changes (endorsements) can be recorded against a policy, capturing what changed and when',                                               'High',   'requirement'],
  ['Policies', 'Each endorsement generates a financial movement record showing the premium impact of the change',                                                  'High',   'requirement'],
  ['Policies', 'Policy section coverages can be viewed and edited within the policy record',                                                                      'High',   'requirement'],
  ['Policies', 'An invoice is automatically triggered when a policy is bound or endorsed',                                                                         'Medium', 'concept'],
  ['Policies', 'A full audit trail of all policy changes is maintained and visible on the policy record',                                                          'High',   'requirement'],

  // ── Claims ────────────────────────────────────────────────────────────
  ['Claims', 'A claim can be logged against a live policy, recording the date, description, and initial reserve',                                                 'High',   'concept'],
  ['Claims', 'Claim financial transactions (payments to claimants, reserve movements) are recorded and totalled',                                                 'High',   'concept'],
  ['Claims', 'Claims move through a defined status lifecycle (Open → In Review → Settled / Closed)',                                                              'High',   'concept'],
  ['Claims', 'Outstanding reserves are automatically calculated from the difference between total reserves set and total payments made',                           'Medium', 'concept'],

  // ── Finance ───────────────────────────────────────────────────────────
  ['Finance', 'Invoices generated from policy binding and endorsements are visible and manageable in a finance module',                                           'High',   'concept'],
  ['Finance', 'Premium receipts and outward payments can be recorded and matched against invoices',                                                               'High',   'concept'],
  ['Finance', 'A financial summary report can be generated showing premiums written, received, and outstanding',                                                   'Medium', 'concept'],

  // ── Binding Authorities ───────────────────────────────────────────────
  ['Binding Authorities', 'Delegated underwriting authority (binding authority) contracts can be created and managed on the platform',                             'High',   'requirement'],
  ['Binding Authorities', 'Each binding authority has sections defining the authorised risk codes and capacity limits',                                            'High',   'requirement'],
  ['Binding Authorities', 'Insurer line shares (participations) on a binding authority section are recorded and managed',                                          'High',   'requirement'],
  ['Binding Authorities', 'Bordereaux transactions (batch premium entries from the coverholder) are recorded against the binding authority',                       'High',   'requirement'],
  ['Binding Authorities', 'Rating schedules can be configured for binding authority sections to calculate premiums on individual risks',                           'Medium', 'implemented'],
  ['Binding Authorities', 'A document library holds contract documents and endorsements linked to the binding authority',                                           'Medium', 'requirement'],

  // ── Reporting ─────────────────────────────────────────────────────────
  ['Reporting', 'Operational reports can be generated (e.g. submissions by status, quote conversion rate, premium written by class of business)',                 'Medium', 'concept'],
  ['Reporting', 'Managers can view KPI dashboards showing business performance over a selected time period',                                                      'Low',    'concept'],
  ['Reporting', 'Reports can be exported to Excel for further analysis',                                                                                           'Low',    'concept'],

  // ── Locations ─────────────────────────────────────────────────────────
  ['Locations', 'A schedule of insured locations can be recorded against a quote or policy (address, property type, insured value)',                               'Medium', 'requirement'],
  ['Locations', 'Locations can be imported in bulk from a CSV file, with validation on import',                                                                    'Medium', 'implemented'],
  ['Locations', 'Multiple versions of a location schedule are maintained, allowing comparison between versions',                                                   'Medium', 'implemented'],
  ['Locations', 'Locations that were present in a previous version but removed from the current version are shown in a "Previously Included" view',               'Low',    'implemented'],
];

// ---------------------------------------------------------------------------
// Build workbook
// ---------------------------------------------------------------------------
async function generate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Policy Forge';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Requirements', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // ── Column definitions ─────────────────────────────────────────────────
  sheet.columns = [
    { header: 'Domain',      key: 'domain',      width: 28 },
    { header: 'Requirement', key: 'requirement',  width: 80 },
    { header: 'Priority',    key: 'priority',     width: 12 },
    { header: 'Status',      key: 'status',       width: 16 },
  ];

  // ── Header row styling ─────────────────────────────────────────────────
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
    cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF999999' } },
    };
  });
  headerRow.height = 22;

  // ── Add auto-filter ────────────────────────────────────────────────────
  sheet.autoFilter = { from: 'A1', to: 'D1' };

  // ── Data rows ─────────────────────────────────────────────────────────
  let prevDomain = '';
  let domainFill = false;

  ROWS.forEach(([domain, requirement, priority, status]) => {
    const row = sheet.addRow({ domain, requirement, priority, status });

    // Alternate domain background for readability
    if (domain !== prevDomain) {
      domainFill = !domainFill;
      prevDomain = domain;
    }

    const rowBg = domainFill
      ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }
      : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.alignment = { vertical: 'middle', wrapText: colNum === 2 };
      cell.font = { size: 10 };
      cell.fill = rowBg;
    });

    // Status cell — coloured by status value
    const statusCell = row.getCell('status');
    statusCell.fill = FILL[status] || rowBg;
    statusCell.font = { size: 10, bold: true };
    statusCell.alignment = { vertical: 'middle', horizontal: 'center' };
    statusCell.value = status.charAt(0).toUpperCase() + status.slice(1);

    // Priority cell
    const priorityCell = row.getCell('priority');
    priorityCell.alignment = { vertical: 'middle', horizontal: 'center' };

    row.height = requirement.length > 100 ? 30 : 20;
  });

  // ── Legend sheet ──────────────────────────────────────────────────────
  const legend = workbook.addWorksheet('Legend');
  legend.columns = [
    { header: 'Status',      key: 'status',  width: 16 },
    { header: 'Meaning',     key: 'meaning', width: 60 },
  ];

  const legendHeader = legend.getRow(1);
  legendHeader.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  legendHeader.height = 22;

  const legendData = [
    ['Implemented', 'The feature is built and tested. It is live in the application.'],
    ['Requirement',  'The requirement is defined and agreed. Development has not yet started.'],
    ['Concept',      'The need is understood at a high level. Detailed requirements have not yet been written.'],
  ];

  legendData.forEach(([status, meaning]) => {
    const r = legend.addRow({ status, meaning });
    r.height = 20;
    r.getCell('status').fill = FILL[status.toLowerCase()];
    r.getCell('status').font = { bold: true, size: 10 };
    r.getCell('status').alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell('meaning').font = { size: 10 };
    r.getCell('meaning').alignment = { vertical: 'middle' };
  });

  // ── Save ──────────────────────────────────────────────────────────────
  const outputPath = path.join(__dirname, '..', 'requirements-tracker.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅  Saved: ${outputPath}`);
}

generate().catch((err) => {
  console.error('❌  Failed to generate:', err.message);
  process.exit(1);
});
