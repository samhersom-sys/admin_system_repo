/**
 * generate-requirements-excel.js
 *
 * Parses every *.requirements.md file in the workspace and generates a
 * Requirements Register Excel workbook for Policy Forge.
 *
 * Columns: Req ID | Domain | Requirement | Priority | Status
 *
 * Status values:
 *   Implemented — feature is built and working
 *   Requirement — agreed requirement not yet built
 *   Concept      — constraint / aspirational item not yet formally specified
 *
 * Priority is derived from:
 *   - Security type (S)       → High
 *   - Core business domains   → High (Auth, Submissions, Quotes, Policies, BA, Claims, Parties)
 *   - Supporting domains      → Medium (Finance, Reporting, Settings, Workflow, Search, Profile, Home, PSS-BRK)
 *   - Platform infrastructure → Low (Shell, Shared Lib, Website, PWA, Locations)
 *   - Non-functional (NF/C)   → Low
 *
 * Run from the Cleaned root:
 *   node tools/generate-requirements-excel.js
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs   = require('fs');

// ---------------------------------------------------------------------------
// Domain display names (keyed by REQ prefix without type-code + number)
// ---------------------------------------------------------------------------
const DOMAIN_DISPLAY = {
  'AUTH': 'Auth', 'AUTH-SES': 'Auth', 'AUTH-BE': 'Auth', 'LOGOUT': 'Auth',
  'LAYOUT': 'Shell / App Layout', 'SIDEBAR': 'Shell / App Layout',
  'API-CLIENT': 'Shared Library', 'PERM': 'Shared Library',
  'TOKENS': 'Shared Library', 'FMT': 'Shared Library',
  'LOG': 'Shared Library', 'WIN-SIZE': 'Shared Library',
  'NOTIF-DOCK': 'Notifications', 'NOTIF-SVC': 'Notifications',
  'HOME': 'Home Dashboard',
  'SUB': 'Submissions', 'SUB-DOM': 'Submissions', 'SUB-LIST': 'Submissions',
  'SUB-NEW': 'Submissions', 'SUB-VIEW': 'Submissions', 'SUB-BE-NE': 'Submissions',
  'QUO': 'Quotes', 'QUO-FE': 'Quotes', 'QUO-BE-NE': 'Quotes',
  'POL': 'Policies', 'POL-FE': 'Policies', 'POL-BE': 'Policies',
  'POL-BE-NE': 'Policies', 'POR-FE': 'Policies',
  'BA': 'Binding Authorities', 'BA-FE': 'Binding Authorities', 'BA-BE-NE': 'Binding Authorities',
  'CLM': 'Claims', 'CLM-FE': 'Claims',
  'PAR': 'Parties', 'PAR-DOM': 'Parties',
  'FIN': 'Finance', 'FIN-FE': 'Finance',
  'RPT': 'Reporting', 'RPT-FE': 'Reporting', 'RPT-BE': 'Reporting', 'RPT-DB': 'Reporting',
  'SETTINGS': 'Settings', 'SETTINGS-DASH': 'Settings', 'SETTINGS-ADMIN': 'Settings',
  'SETTINGS-GRID': 'Settings', 'SETTINGS-DQUALITY': 'Settings', 'SETTINGS-ORG': 'Settings',
  'SETTINGS-PRODUCTS': 'Settings', 'SETTINGS-RATING': 'Settings', 'SETTINGS-BE': 'Settings',
  'LOC': 'Locations Schedule', 'LOC-FE': 'Locations Schedule',
  'WF': 'Workflow', 'WF-FE': 'Workflow',
  'SEARCH': 'Search', 'SEARCH-FE': 'Search',
  'PROFILE': 'Profile',
  'PSS-BRK': 'Broker Submissions', 'PSS-BRK-BE': 'Broker Submissions',
  'PSS-BRK-DOM': 'Broker Submissions', 'PSS-BRK-LIST': 'Broker Submissions',
  'PSS-BRK-NEW': 'Broker Submissions',
  'WEB': 'Website', 'PWA': 'Website / PWA',
  'MOVE': 'Movements (Shared)',
  'HOME-DASH': 'Home Dashboard',
  'POL-BE-NE-F-GWP': 'Policies',
  'POL-BE-NE-GWP': 'Policies',
};

const DOMAIN_PRIORITY = {
  'Auth': 'High', 'Submissions': 'High', 'Quotes': 'High', 'Policies': 'High',
  'Binding Authorities': 'High', 'Claims': 'High', 'Parties': 'High',
  'Finance': 'Medium', 'Reporting': 'Medium', 'Settings': 'Medium',
  'Workflow': 'Medium', 'Search': 'Medium', 'Profile': 'Medium',
  'Home Dashboard': 'Medium', 'Broker Submissions': 'Medium', 'Notifications': 'Medium',
  'Shell / App Layout': 'Low', 'Shared Library': 'Low',
  'Website': 'Low', 'Website / PWA': 'Low',
  'Locations Schedule': 'Low', 'Movements (Shared)': 'Low',
};

const DOMAIN_STATUS = {
  'Auth': 'Implemented', 'Shell / App Layout': 'Implemented',
  'Shared Library': 'Implemented', 'Notifications': 'Implemented',
  'Submissions': 'Implemented', 'Quotes': 'Implemented',
  'Parties': 'Implemented', 'Search': 'Implemented',
  'Profile': 'Implemented', 'Settings': 'Implemented',
  'Locations Schedule': 'Implemented', 'Website': 'Implemented',
  'Home Dashboard': 'Requirement', 'Workflow': 'Requirement',
  'Policies': 'Requirement', 'Claims': 'Requirement',
  'Finance': 'Requirement', 'Binding Authorities': 'Requirement',
  'Reporting': 'Requirement', 'Broker Submissions': 'Requirement',
  'Website / PWA': 'Requirement', 'Movements (Shared)': 'Requirement',
};

const DOMAIN_ORDER = [
  'Auth', 'Shell / App Layout', 'Shared Library', 'Notifications',
  'Home Dashboard', 'Submissions', 'Quotes', 'Policies',
  'Binding Authorities', 'Claims', 'Parties', 'Finance', 'Reporting',
  'Settings', 'Locations Schedule', 'Workflow', 'Search', 'Profile',
  'Broker Submissions', 'Website', 'Website / PWA', 'Movements (Shared)',
];

const TYPE_CODES = new Set(['F', 'S', 'NF', 'NE', 'C']);

function extractPrefix(reqId) {
  const parts = reqId.replace(/^REQ-/, '').split('-');
  while (parts.length > 1 && /^\d/.test(parts[parts.length - 1])) parts.pop();
  if (parts.length > 1 && TYPE_CODES.has(parts[parts.length - 1])) parts.pop();
  return parts.join('-');
}

function extractTypeCode(reqId) {
  const parts = reqId.replace(/^REQ-/, '').split('-');
  while (parts.length > 1 && /^\d/.test(parts[parts.length - 1])) parts.pop();
  const last = parts[parts.length - 1];
  return TYPE_CODES.has(last) ? last : 'F';
}

function cleanText(text) {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function toBusinessText(text) {
  if (!text || text === '(no text)') return text;

  const actionByVerb = {
    GET: 'a view action',
    POST: 'a create action',
    PUT: 'an update action',
    PATCH: 'an update action',
    DELETE: 'a delete action',
  };

  return text
    .replace(/\b(GET|POST|PUT|PATCH|DELETE)\s+\/[A-Za-z0-9_\-./:]+/g, (_, verb) => actionByVerb[verb] || 'a system action')
    .replace(/\bPOST\b/g, 'create')
    .replace(/\bPUT\b/g, 'update')
    .replace(/\bPATCH\b/g, 'update')
    .replace(/\bGET\b/g, 'view')
    .replace(/\bDELETE\b/g, 'delete')
    .replace(/\bAPI\b/gi, 'system')
    .replace(/\bendpoint\b/gi, 'process')
    .replace(/\bpayload\b/gi, 'submitted information')
    .replace(/\brequest\b/gi, 'submission')
    .replace(/\bresponse\b/gi, 'result')
    .replace(/\bcontroller\b/gi, 'process')
    .replace(/\bmethod\b/gi, 'process')
    .replace(/\bJWT\b/g, 'secure sign-in token')
    .replace(/\b401\b/g, 'access denied')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function findRequirementsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
      results.push(...findRequirementsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.requirements.md')) {
      results.push(full);
    }
  }
  return results;
}

function parseFile(filePath) {
  const lines   = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  const found   = [];
  let currentId = null;
  let textParts = [];

  const flush = () => {
    if (currentId) {
      const text = textParts.join(' ').replace(/\s+/g, ' ').trim();
      found.push({ id: currentId, text: text || '(no text)' });
    }
    currentId = null;
    textParts = [];
  };

  for (const line of lines) {
    // Format 1: **REQ-XXX-F-001:** description text
    const boldMatch = line.match(/^\*\*REQ-([A-Z0-9][A-Z0-9-]+):\*\*\s*(.*)/);
    // Format 2: ### REQ-XXX-F-001 — short title (description may follow on next lines)
    const headingMatch = !boldMatch && line.match(/^#{1,4}\s+REQ-([A-Z0-9][A-Z0-9-]+)\s+[—–-]\s*(.*)/);

    if (boldMatch || headingMatch) {
      flush();
      const m = boldMatch || headingMatch;
      currentId = m[1].trim();
      if (m[2] && m[2].trim()) textParts.push(m[2].trim());
    } else if (currentId) {
      if (!line.trim() || /^#{1,4}\s/.test(line) || line.startsWith('|') ||
          line.startsWith('>') || line.trimStart().startsWith('---')) {
        flush();
      } else {
        const stripped = line.replace(/^[-*]\s+/, '').trim();
        if (stripped) textParts.push(stripped);
      }
    }
  }
  flush();
  return found;
}

// ---------------------------------------------------------------------------
// NOTE: the hand-crafted list below is kept only as legacy reference.
// The generator now builds the Excel from parsed requirements files.
// ---------------------------------------------------------------------------
const _unused_requirements = [
  // ── AUTH ──────────────────────────────────────────────────────────────────
  { domain: 'Auth', requirement: 'Users can log in to the platform using their email address and password.', priority: 'High', status: 'Implemented' },
  { domain: 'Auth', requirement: 'Users can log out and their session is securely ended.', priority: 'High', status: 'Requirement' },
  { domain: 'Auth', requirement: 'Users can change their own password from within the platform.', priority: 'High', status: 'Implemented' },
  { domain: 'Auth', requirement: 'New user accounts can be registered and activated by an administrator.', priority: 'Medium', status: 'Concept' },
  { domain: 'Auth', requirement: 'User roles and permissions control which areas of the platform each user can access.', priority: 'High', status: 'Implemented' },

  // ── SUBMISSIONS ───────────────────────────────────────────────────────────
  { domain: 'Submissions', requirement: 'Users can create a new insurance submission capturing the insured name, placing broker, class of business, and estimated premium.', priority: 'High', status: 'Implemented' },
  { domain: 'Submissions', requirement: 'Users can view a list of all submissions and search or filter by status.', priority: 'High', status: 'Implemented' },
  { domain: 'Submissions', requirement: 'Users can view the full details of a submission including status history, notes, and linked records.', priority: 'High', status: 'Implemented' },
  { domain: 'Submissions', requirement: 'A submission can be assigned to an underwriter for review.', priority: 'High', status: 'Implemented' },
  { domain: 'Submissions', requirement: 'A submission can be moved through workflow stages: New → Clearance → In Review → Quoted / Declined.', priority: 'High', status: 'Implemented' },
  { domain: 'Submissions', requirement: 'A submission can be declined with a recorded reason.', priority: 'High', status: 'Implemented' },
  { domain: 'Submissions', requirement: 'Users can filter the submissions list by status (e.g. New, Clearance, Quoted, Bound, Declined).', priority: 'Medium', status: 'Requirement' },
  { domain: 'Submissions', requirement: 'Users can see other submissions from the same insured on the submission record.', priority: 'Medium', status: 'Requirement' },
  { domain: 'Submissions', requirement: 'Users can see which binding authority contracts are linked to a submission.', priority: 'Medium', status: 'Requirement' },
  { domain: 'Submissions', requirement: 'A submission flagged for clearance shows a dedicated Clearance action button that launches the clearance workflow.', priority: 'Medium', status: 'Requirement' },
  { domain: 'Submissions', requirement: 'The submissions list shows a live count of records matching the current filter.', priority: 'Low', status: 'Requirement' },

  // ── QUOTES ────────────────────────────────────────────────────────────────
  { domain: 'Quotes', requirement: 'Users can create a quote linked to an existing submission.', priority: 'High', status: 'Implemented' },
  { domain: 'Quotes', requirement: 'A quote can have one or more sections, each covering a different class of business.', priority: 'High', status: 'Implemented' },
  { domain: 'Quotes', requirement: 'Each quote section can have coverages defined, including limits, excesses, and rates.', priority: 'High', status: 'Requirement' },
  { domain: 'Quotes', requirement: 'Deductions such as brokerage, overrider, and commission can be recorded against each section.', priority: 'High', status: 'Implemented' },
  { domain: 'Quotes', requirement: 'Insurer participation (line shares) can be recorded for each section.', priority: 'High', status: 'Implemented' },
  { domain: 'Quotes', requirement: 'The system automatically calculates premium at Whole, Market, and Line level based on coverages and deductions.', priority: 'High', status: 'Implemented' },
  { domain: 'Quotes', requirement: 'A quote can progress through statuses: Draft → Referred → Accepted → Declined / Bound.', priority: 'High', status: 'Implemented' },
  { domain: 'Quotes', requirement: 'Users can accept or decline a quote from within the quote record.', priority: 'High', status: 'Implemented' },
  { domain: 'Quotes', requirement: 'Users can copy an existing quote to create a new draft with the same structure and coverages.', priority: 'Medium', status: 'Implemented' },
  { domain: 'Quotes', requirement: 'Risk codes can be added and removed at the section level of a quote.', priority: 'Medium', status: 'Implemented' },
  { domain: 'Quotes', requirement: 'A quote section can have a location schedule attached, listing all insured properties or locations.', priority: 'Medium', status: 'Implemented' },

  // ── POLICIES ──────────────────────────────────────────────────────────────
  { domain: 'Policies', requirement: 'An accepted quote can be bound to create a policy record.', priority: 'High', status: 'Requirement' },
  { domain: 'Policies', requirement: 'Users can view the full details of a bound policy including sections, coverages, and financial summary.', priority: 'High', status: 'Requirement' },
  { domain: 'Policies', requirement: 'Mid-term changes (endorsements) can be created against a policy.', priority: 'High', status: 'Requirement' },
  { domain: 'Policies', requirement: 'Financial movements (premium adjustments) are recorded and tracked for each endorsement.', priority: 'High', status: 'Requirement' },
  { domain: 'Policies', requirement: 'A full audit trail is maintained for all changes made to a policy.', priority: 'Medium', status: 'Requirement' },
  { domain: 'Policies', requirement: 'Policy coverages at section level can be viewed and updated.', priority: 'High', status: 'Requirement' },
  { domain: 'Policies', requirement: 'The system can generate an invoice when a policy is bound.', priority: 'High', status: 'Concept' },

  // ── BINDING AUTHORITIES ───────────────────────────────────────────────────
  { domain: 'Binding Authorities', requirement: 'Users can create and manage binding authority contracts.', priority: 'High', status: 'Requirement' },
  { domain: 'Binding Authorities', requirement: 'Each binding authority can have sections defining the authorised risk codes and capacity limits.', priority: 'High', status: 'Requirement' },
  { domain: 'Binding Authorities', requirement: 'Insurer and coverholder participations can be recorded against a binding authority.', priority: 'High', status: 'Requirement' },
  { domain: 'Binding Authorities', requirement: 'Endorsements (mid-term changes) can be created on a binding authority contract.', priority: 'Medium', status: 'Requirement' },
  { domain: 'Binding Authorities', requirement: 'Bordereaux transactions can be recorded and tracked against a binding authority.', priority: 'High', status: 'Requirement' },
  { domain: 'Binding Authorities', requirement: 'Contract documents can be stored and accessed from within the binding authority record.', priority: 'Medium', status: 'Requirement' },
  { domain: 'Binding Authorities', requirement: 'Rating configuration (rating profiles) can be assigned to a binding authority section.', priority: 'Medium', status: 'Implemented' },

  // ── CLAIMS ────────────────────────────────────────────────────────────────
  { domain: 'Claims', requirement: 'Users can create a claim record linked to an existing policy.', priority: 'High', status: 'Requirement' },
  { domain: 'Claims', requirement: 'Users can view the current status and financial position of a claim.', priority: 'High', status: 'Requirement' },
  { domain: 'Claims', requirement: 'Financial transactions (payments and reserve movements) are recorded against a claim.', priority: 'High', status: 'Requirement' },
  { domain: 'Claims', requirement: 'Claims can progress through statuses (e.g. Open, Under Review, Settled, Closed).', priority: 'Medium', status: 'Requirement' },
  { domain: 'Claims', requirement: 'Reserve calculations are automatically updated as transactions are recorded.', priority: 'Medium', status: 'Requirement' },

  // ── PARTIES ───────────────────────────────────────────────────────────────
  { domain: 'Parties', requirement: 'Users can create and manage party records for insureds, brokers, insurers, and coverholders.', priority: 'High', status: 'Implemented' },
  { domain: 'Parties', requirement: 'Users can search for a party when creating or editing a submission, quote, or policy.', priority: 'High', status: 'Implemented' },
  { domain: 'Parties', requirement: 'Users can view the full profile of a party including contact details, address, and SIC classification.', priority: 'High', status: 'Implemented' },
  { domain: 'Parties', requirement: 'SIC codes (US 1987 or UK 2007) can be assigned to a party and searched by code or description.', priority: 'Medium', status: 'Implemented' },
  { domain: 'Parties', requirement: 'Users can view all submissions, quotes, and policies linked to a party from within the party record.', priority: 'High', status: 'Implemented' },
  { domain: 'Parties', requirement: 'Entities (subsidiaries or related organisations) can be added and managed under a party record.', priority: 'Medium', status: 'Implemented' },
  { domain: 'Parties', requirement: 'Organisations can be structured into hierarchies (branches and departments).', priority: 'Medium', status: 'Concept' },
  { domain: 'Parties', requirement: 'Insurer syndicate records are maintained within the platform.', priority: 'Medium', status: 'Concept' },

  // ── FINANCE ───────────────────────────────────────────────────────────────
  { domain: 'Finance', requirement: 'The system creates an invoice when a policy is bound or endorsed.', priority: 'High', status: 'Concept' },
  { domain: 'Finance', requirement: 'Payments can be recorded and matched against outstanding invoices.', priority: 'High', status: 'Concept' },
  { domain: 'Finance', requirement: 'Payments can be grouped into settlement batches for cash reconciliation.', priority: 'High', status: 'Concept' },
  { domain: 'Finance', requirement: 'A trial balance report showing debits and credits is available to finance users.', priority: 'Medium', status: 'Concept' },
  { domain: 'Finance', requirement: 'Tax calculations are applied automatically where applicable.', priority: 'Medium', status: 'Concept' },

  // ── REPORTING & DASHBOARDS ────────────────────────────────────────────────
  { domain: 'Reporting', requirement: 'The home dashboard displays live summary widgets (e.g. open submissions, recent quotes, outstanding tasks).', priority: 'High', status: 'Requirement' },
  { domain: 'Reporting', requirement: 'Users can configure which widgets appear on their dashboard and how they are arranged.', priority: 'Medium', status: 'Concept' },
  { domain: 'Reporting', requirement: 'Users can create custom reports by selecting fields, applying filters, and setting a schedule.', priority: 'Medium', status: 'Concept' },
  { domain: 'Reporting', requirement: 'Reports can be exported to CSV or Excel.', priority: 'Low', status: 'Concept' },
  { domain: 'Reporting', requirement: 'Charts and graphical views are available for key metrics (e.g. premium volumes, claims ratios).', priority: 'Low', status: 'Concept' },

  // ── SETTINGS ──────────────────────────────────────────────────────────────
  { domain: 'Settings', requirement: 'Administrators can create and manage rating profiles that define how premiums are calculated.', priority: 'High', status: 'Implemented' },
  { domain: 'Settings', requirement: 'Rating profiles support group-based rule conditions using IF / AND / OR logic.', priority: 'High', status: 'Implemented' },
  { domain: 'Settings', requirement: 'Rating profiles have effective date ranges and an active/inactive status.', priority: 'High', status: 'Implemented' },
  { domain: 'Settings', requirement: 'Administrators can define product configurations that control the fields and options available for each risk type.', priority: 'High', status: 'Implemented' },
  { domain: 'Settings', requirement: 'Data quality rules can be configured to flag incomplete or inconsistent submission data.', priority: 'Medium', status: 'Implemented' },
  { domain: 'Settings', requirement: 'Organisation-level settings (name, branding, contact details) can be managed by an administrator.', priority: 'Medium', status: 'Implemented' },
  { domain: 'Settings', requirement: 'Field labels and visibility can be configured per tenant without code changes.', priority: 'Medium', status: 'Concept' },

  // ── WORKFLOW & CLEARANCE ──────────────────────────────────────────────────
  { domain: 'Workflow', requirement: 'A dedicated clearance screen allows underwriters to review and approve or reject a submission before quoting.', priority: 'High', status: 'Requirement' },
  { domain: 'Workflow', requirement: 'Tasks generated during the workflow (e.g. "review clearance") can be assigned and tracked to completion.', priority: 'Medium', status: 'Concept' },
  { domain: 'Workflow', requirement: 'Workflow rules can be configured by an administrator to automate routing and assignment.', priority: 'Low', status: 'Concept' },

  // ── LOCATIONS SCHEDULE ────────────────────────────────────────────────────
  { domain: 'Locations', requirement: 'A location schedule can be attached to a quote or policy section, listing all insured properties.', priority: 'Medium', status: 'Implemented' },
  { domain: 'Locations', requirement: 'Multiple location rows can be imported in bulk via a CSV file.', priority: 'Medium', status: 'Implemented' },
  { domain: 'Locations', requirement: 'Location coverages and sum insured amounts can be set per location.', priority: 'Medium', status: 'Implemented' },
  { domain: 'Locations', requirement: 'Different versions of a location schedule can be saved and compared.', priority: 'Low', status: 'Implemented' },
  { domain: 'Locations', requirement: 'Previously included but removed locations are visible in a "Previously Included" sub-tab for audit purposes.', priority: 'Low', status: 'Implemented' },

  // ── PLATFORM / INFRASTRUCTURE ─────────────────────────────────────────────
  { domain: 'Platform', requirement: 'The platform supports multiple organisations (tenants) with complete data separation between them.', priority: 'High', status: 'Implemented' },
  { domain: 'Platform', requirement: 'All significant user actions are recorded in an audit trail, including who made the change and when.', priority: 'High', status: 'Implemented' },
  { domain: 'Platform', requirement: 'Users receive in-app notifications for key events such as assignment, status changes, and approvals.', priority: 'Medium', status: 'Implemented' },
  { domain: 'Platform', requirement: 'Users can search across submissions, quotes, policies, parties, and binding authorities from a single search bar.', priority: 'High', status: 'Implemented' },
  { domain: 'Platform', requirement: 'The platform can be deployed to production using Docker containers.', priority: 'High', status: 'Requirement' },
  { domain: 'Platform', requirement: 'Concurrent access by multiple users on the same record is detected and a warning is displayed.', priority: 'Medium', status: 'Implemented' },
  { domain: 'Platform', requirement: 'AI-assisted extraction of key data from email submissions reduces manual data entry.', priority: 'Medium', status: 'Concept' },
  { domain: 'Platform', requirement: 'PDF documents can be generated for quotes and policies.', priority: 'Medium', status: 'Concept' },
  { domain: 'Platform', requirement: 'An internal team messaging / chat dock supports communication within a deal record.', priority: 'Low', status: 'Concept' },
]; // end _unused_requirements

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------
const C = {
  headerBg: '1F3864', headerFont: 'FFFFFF',
  domainBg: 'D6E4F0', domainFont: '1F3864',
  rowAlt: 'F5F9FF', rowBase: 'FFFFFF',
  implemented: 'C6EFCE', implementedFont: '276221',
  requirement: 'FFEB9C', requirementFont: '9C5700',
  concept:     'FCE4D6', conceptFont:     '833C00',
  high:   'F4CCCC', highFont:   '990000',
  medium: 'FCE8B2', mediumFont: '7D4A00',
  low:    'D9EAD3', lowFont:    '274E13',
};
const STATUS_STYLE   = { Implemented: { bg: C.implemented, font: C.implementedFont }, Requirement: { bg: C.requirement, font: C.requirementFont }, Concept: { bg: C.concept, font: C.conceptFont } };
const PRIORITY_STYLE = { High: { bg: C.high, font: C.highFont }, Medium: { bg: C.medium, font: C.mediumFont }, Low: { bg: C.low, font: C.lowFont } };

// ---------------------------------------------------------------------------
// Build workbook
// ---------------------------------------------------------------------------
async function generate() {
  const root  = path.join(__dirname, '..');
  const files = findRequirementsFiles(root);
  files.sort();

  const all  = [];
  const seen = new Set();
  const idSources = new Map();

  for (const f of files) {
    const relFile = f.replace(root + path.sep, '').replace(/\\/g, '/');
    for (const { id, text } of parseFile(f)) {
      if (!idSources.has(id)) idSources.set(id, [relFile]);
      else if (!idSources.get(id).includes(relFile)) idSources.get(id).push(relFile);

      if (seen.has(id)) continue;
      seen.add(id);
      const prefix   = extractPrefix(id);
      const typeCode = extractTypeCode(id);
      const domain   = DOMAIN_DISPLAY[prefix] || prefix;
      const priority = typeCode === 'S' ? 'High' : typeCode === 'NF' || typeCode === 'C' ? 'Low' : (DOMAIN_PRIORITY[domain] || 'Medium');
      const status   = typeCode === 'C' ? 'Concept' : (DOMAIN_STATUS[domain] || 'Requirement');
      const requirement = toBusinessText(cleanText(text) || '(no text)');
      all.push({ id, domain, requirement, priority, status });
    }
  }

  const duplicateIds = [...idSources.entries()]
    .filter(([, sources]) => sources.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (duplicateIds.length) {
    console.error(`\n❌ Duplicate REQ IDs found: ${duplicateIds.length}`);
    duplicateIds.forEach(([id, sources]) => {
      console.error(`   ${id}`);
      sources.forEach(src => console.error(`     - ${src}`));
    });
    throw new Error('Duplicate requirement IDs must be resolved before Excel generation.');
  }

  all.sort((a, b) => {
    const ai = DOMAIN_ORDER.indexOf(a.domain);
    const bi = DOMAIN_ORDER.indexOf(b.domain);
    if (ai !== bi) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.id.localeCompare(b.id);
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Policy Forge';
  wb.created = new Date();

  // ── Shared helper: populate a worksheet with requirement rows ───────────
  const TAB_NAMES = {
    'Shell / App Layout':  'Shell',
    'Shared Library':      'Shared Lib',
    'Home Dashboard':      'Home',
    'Binding Authorities': 'Binding Auth',
    'Locations Schedule':  'Locations',
    'Broker Submissions':  'Broker Subs',
    'Website / PWA':       'Website PWA',
    'Movements (Shared)':  'Movements',
  };

  function getMoscow(req) {
    if (req.status === 'Concept') return "Won't Have";
    if (req.priority === 'High') return 'Must Have';
    if (req.priority === 'Medium') return 'Should Have';
    return 'Could Have';
  }

  function getInvestFlags(req) {
    const textLen = (req.requirement || '').length;
    return {
      independent: textLen <= 240 ? 'Yes' : 'No',
      negotiable: req.status === 'Concept' ? 'Yes' : 'No',
      valuable: 'Yes',
      estimable: req.status === 'Concept' ? 'No' : 'Yes',
      small: textLen <= 320 ? 'Yes' : 'No',
      testable: req.status === 'Concept' ? 'No' : 'Yes',
    };
  }

  function populateSheet(ws, rows, includesDomainSeparators) {
    ws.columns = [
      { key: 'no',          header: '#',            width: 5  },
      { key: 'id',          header: 'Req ID',        width: 28 },
      { key: 'domain',      header: 'Domain',        width: 22 },
      { key: 'requirement', header: 'Requirement',   width: 75 },
      { key: 'acceptanceCriteria', header: 'Acceptance Criteria', width: 44 },
      { key: 'priority',    header: 'Priority',      width: 12 },
      { key: 'status',      header: 'Status',        width: 16 },
      { key: 'moscow',      header: 'Moscow',        width: 14 },
      { key: 'independent', header: 'Independent',   width: 13 },
      { key: 'negotiable',  header: 'Negotiable',    width: 13 },
      { key: 'valuable',    header: 'Valuable',      width: 11 },
      { key: 'estimable',   header: 'Estimable',     width: 12 },
      { key: 'small',       header: 'Small',         width: 10 },
      { key: 'testable',    header: 'Testable',      width: 11 },
      { key: 'manuallyValidated', header: 'Manually Validated', width: 18 },
    ];

    ws.getRow(1).eachCell(cell => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
      cell.font      = { bold: true, color: { argb: C.headerFont }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border    = { bottom: { style: 'medium', color: { argb: C.headerFont } } };
    });
    ws.getRow(1).height = 24;

    let rowNum = 2;
    let currentDomain = null;

    rows.forEach((req, idx) => {
      if (includesDomainSeparators && req.domain !== currentDomain) {
        currentDomain = req.domain;
        const sep = ws.addRow({ no: '', id: '', domain: `  ${req.domain}`, requirement: '', acceptanceCriteria: '', priority: '', status: '', moscow: '', independent: '', negotiable: '', valuable: '', estimable: '', small: '', testable: '', manuallyValidated: '' });
        sep.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.domainBg } };
          cell.font = { bold: true, color: { argb: C.domainFont }, size: 11, italic: true };
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        });
        sep.height = 20;
        rowNum++;
      }

      const invest = getInvestFlags(req);
      const row = ws.addRow({
        no: idx + 1,
        id: req.id,
        domain: req.domain,
        requirement: req.requirement,
        acceptanceCriteria: req.requirement,
        priority: req.priority,
        status: req.status,
        moscow: getMoscow(req),
        independent: invest.independent,
        negotiable: invest.negotiable,
        valuable: invest.valuable,
        estimable: invest.estimable,
        small: invest.small,
        testable: invest.testable,
        manuallyValidated: 'No',
      });
      const baseBg = rowNum % 2 === 0 ? C.rowBase : C.rowAlt;

      ['no', 'id', 'domain', 'requirement', 'acceptanceCriteria', 'moscow', 'independent', 'negotiable', 'valuable', 'estimable', 'small', 'testable', 'manuallyValidated'].forEach(k => {
        row.getCell(k).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      });
      row.getCell('id').font      = { name: 'Courier New', size: 9 };
      row.getCell('id').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      const ps = PRIORITY_STYLE[req.priority];
      if (ps) { row.getCell('priority').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ps.bg } }; row.getCell('priority').font = { bold: true, color: { argb: ps.font }, size: 10 }; }
      row.getCell('priority').alignment = { vertical: 'middle', horizontal: 'center' };

      const ss = STATUS_STYLE[req.status];
      if (ss) { row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ss.bg } }; row.getCell('status').font = { bold: true, color: { argb: ss.font }, size: 10 }; }
      row.getCell('status').alignment = { vertical: 'middle', horizontal: 'center' };

      row.getCell('no').alignment          = { vertical: 'middle', horizontal: 'center' };
      row.getCell('domain').alignment      = { vertical: 'middle', horizontal: 'left', indent: 1 };
      row.getCell('requirement').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
      row.getCell('acceptanceCriteria').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
      row.getCell('moscow').alignment      = { vertical: 'middle', horizontal: 'center' };
      row.getCell('independent').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('negotiable').alignment  = { vertical: 'middle', horizontal: 'center' };
      row.getCell('valuable').alignment    = { vertical: 'middle', horizontal: 'center' };
      row.getCell('estimable').alignment   = { vertical: 'middle', horizontal: 'center' };
      row.getCell('small').alignment       = { vertical: 'middle', horizontal: 'center' };
      row.getCell('testable').alignment    = { vertical: 'middle', horizontal: 'center' };
      row.getCell('manuallyValidated').alignment = { vertical: 'middle', horizontal: 'center' };
      row.height = 36;
      rowNum++;
    });

    ws.eachRow((row, rn) => {
      if (rn < 2) return;
      row.eachCell({ includeEmpty: true }, cell => {
        cell.border = { top: { style: 'thin', color: { argb: 'D0D0D0' } }, left: { style: 'thin', color: { argb: 'D0D0D0' } }, bottom: { style: 'thin', color: { argb: 'D0D0D0' } }, right: { style: 'thin', color: { argb: 'D0D0D0' } } };
      });
    });
    ws.autoFilter = { from: 'A1', to: 'O1' };
  }

  // ── Per-domain sheets ────────────────────────────────────────────────────
  const domains = [...new Set(all.map(r => r.domain))].sort((a, b) => {
    const ai = DOMAIN_ORDER.indexOf(a);
    const bi = DOMAIN_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  for (const domain of domains) {
    const domainRows = all.filter(r => r.domain === domain);
    const tabName    = TAB_NAMES[domain] || domain.slice(0, 31);
    const wsDomain   = wb.addWorksheet(tabName, {
      views: [{ state: 'frozen', ySplit: 1 }],
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });
    populateSheet(wsDomain, domainRows, false);
  }

  // ── Summary sheet ────────────────────────────────────────────────────────
  const ws2 = wb.addWorksheet('Summary');
  ws2.columns = [{ key: 'label', header: 'Category', width: 30 }, { key: 'count', header: 'Count', width: 12 }];
  ws2.getRow(1).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
    cell.font = { bold: true, color: { argb: C.headerFont }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  ws2.getRow(1).height = 24;

  const totalCount       = all.length;
  const implementedCount = all.filter(r => r.status === 'Implemented').length;
  const requirementCount = all.filter(r => r.status === 'Requirement').length;
  const conceptCount     = all.filter(r => r.status === 'Concept').length;

  const summaryRows = [
    { label: '── By Status ──', count: '' },
    { label: 'Implemented',                     count: implementedCount },
    { label: 'Requirement (to build)',           count: requirementCount },
    { label: 'Concept (constraint / future)',    count: conceptCount },
    { label: 'Total', count: totalCount },
    { label: '', count: '' },
    { label: '── By Priority ──', count: '' },
    { label: 'High',   count: all.filter(r => r.priority === 'High').length },
    { label: 'Medium', count: all.filter(r => r.priority === 'Medium').length },
    { label: 'Low',    count: all.filter(r => r.priority === 'Low').length },
    { label: '', count: '' },
    { label: '── By Domain ──', count: '' },
    ...DOMAIN_ORDER.map(d => ({ label: d, count: all.filter(r => r.domain === d).length })).filter(r => r.count > 0),
  ];

  summaryRows.forEach(item => {
    const row = ws2.addRow(item);
    row.getCell('count').alignment = { horizontal: 'center' };
    row.height = 20;
    const lbl = String(item.label);
    if (lbl.startsWith('──')) { row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.domainBg } }; cell.font = { bold: true, color: { argb: C.domainFont } }; }); }
    if (lbl === 'Implemented')          row.getCell('count').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.implemented } };
    if (lbl.startsWith('Requirement'))  row.getCell('count').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.requirement } };
    if (lbl.startsWith('Concept'))      row.getCell('count').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.concept } };
    if (lbl === 'High')                 row.getCell('count').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.high } };
    if (lbl === 'Medium')               row.getCell('count').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.medium } };
    if (lbl === 'Low')                  row.getCell('count').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.low } };
  });

  // ── Write ──────────────────────────────────────────────────────────────
  const outPath = path.join(root, 'Policy-Forge-Requirements-Register.xlsx');
  await wb.xlsx.writeFile(outPath);

  const unknownPrefixes = [...new Set(all.filter(r => !Object.values(DOMAIN_DISPLAY).includes(r.domain)).map(r => extractPrefix(r.id)))];

  console.log(`\n✅  Excel written to:\n    ${outPath}\n`);
  console.log(`    Total requirements:  ${totalCount}`);
  console.log(`    Implemented:         ${implementedCount}`);
  console.log(`    To build:            ${requirementCount}`);
  console.log(`    Concept:             ${conceptCount}`);
  if (unknownPrefixes.length) {
    console.log(`\n⚠️   Unrecognised prefixes (shown raw in Domain column):`);
    unknownPrefixes.forEach(p => console.log(`       ${p}`));
  }
  console.log();
}

generate().catch(err => {
  console.error('Failed to generate Excel:', err);
  process.exit(1);
});
