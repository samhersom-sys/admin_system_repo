/**
 * CODEBASE SCAN TESTS
 *
 * These tests enforce architectural and guideline rules across the entire codebase.
 * They are the automated equivalent of a code review.
 *
 * IMPORTANT — Guideline Update Protocol:
 *   When any AI Guideline is updated with a new or changed rule, a corresponding
 *   scan test MUST be added here in the same commit.  The scan is then run against
 *   all existing files to verify retroactive compliance.
 *   See: AI Guidelines/02-Checkpoints-and-Open-Questions.md §2.6
 *
 * Run: npx jest src/__tests__/codebase-scan.test.js
 */

const fs = require('fs')
const path = require('path')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'src')

/** Recursively collect all files matching an extension filter, skipping node_modules */
function collectFiles(dir, extensions, results = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            collectFiles(full, extensions, results)
        } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
            results.push(full)
        }
    }
    return results
}

function read(filePath) {
    return fs.readFileSync(filePath, 'utf8')
}

function rel(filePath) {
    return path.relative(ROOT, filePath)
}

// Scope helpers
const srcFiles = () => collectFiles(SRC, ['.js', '.jsx', '.ts', '.tsx'])
const sharedLibFiles = () => collectFiles(path.join(SRC, 'shared', 'lib'), ['.js', '.jsx', '.ts', '.tsx'])
const sharedComponentFiles = () => collectFiles(path.join(SRC, 'shared'), ['.js', '.jsx', '.ts', '.tsx']).filter(f => !f.includes(path.join('shared', 'lib')))
const allSourceFiles = () => srcFiles()
const allTestFiles = () => allSourceFiles().filter((f) => f.includes('.test.'))
const allNonTestSourceFiles = () => allSourceFiles().filter((f) => !f.includes('.test.') && !f.includes('__tests__'))

// ---------------------------------------------------------------------------
// RULE 1 (Guideline 09 §4 / Guideline 06 §6.7)
// No direct fetch() calls outside of api-client
// ---------------------------------------------------------------------------

describe('RULE-01: No direct fetch() calls outside api-client', () => {
    const ALLOWED_FILES = [
        path.join(SRC, 'shared', 'lib', 'api-client', 'api-client.ts'),
    ]

    it('no source file outside api-client contains a bare fetch( call', () => {
        const violations = []
        for (const file of allNonTestSourceFiles()) {
            if (ALLOWED_FILES.some((allowed) => file === allowed)) continue
            const content = read(file)
            if (/(?<!\w)fetch\s*\(/.test(content)) {
                violations.push(rel(file))
            }
        }
        expect(violations).toEqual([])
    })
})

// ---------------------------------------------------------------------------
// RULE-02 (Guideline 07)
// No hardcoded hex colour literals in JSX/TSX files outside brandColors
// ---------------------------------------------------------------------------

describe('RULE-02: No hardcoded hex colour literals in JSX/TSX outside brandColors', () => {
    const ALLOWED_FILES = [
        path.join(SRC, 'shared', 'lib', 'design-tokens', 'brandColors.ts'),
    ]
    const HEX_PATTERN = /#[0-9A-Fa-f]{3,8}(?![0-9A-Fa-f])/

    it('no .jsx/.tsx file outside brandColors contains a hex colour literal', () => {
        const violations = []
        const files = allNonTestSourceFiles().filter((f) => f.endsWith('.jsx') || f.endsWith('.tsx'))
        for (const file of files) {
            if (ALLOWED_FILES.some((allowed) => file === allowed)) continue
            const lines = read(file).split('\n')
            lines.forEach((line, i) => {
                // Skip lines that are clearly comments
                const trimmed = line.trim()
                if (trimmed.startsWith('//') || trimmed.startsWith('*')) return
                if (HEX_PATTERN.test(line)) {
                    violations.push(`${rel(file)}:${i + 1}  →  ${trimmed}`)
                }
            })
        }
        if (violations.length > 0) {
            // Show the violating files clearly in the test output
            expect(
                `Files with hex colour literals (use Tailwind brand classes or brandColors token):\n  ${violations.join('\n  ')}`
            ).toBe('(none)')
        }
    })
})

// ---------------------------------------------------------------------------
// RULE-03 (Guideline 04)
// No imports from domains/ inside lib/ or components/
// ---------------------------------------------------------------------------

describe('RULE-03: No domain imports inside lib services or reusable components', () => {
    it('shared/lib/ files do not import from domains/', () => {
        const violations = []
        for (const file of sharedLibFiles()) {
            if (read(file).includes("from '@/domains/") || read(file).includes('from "../domains/')) {
                violations.push(rel(file))
            }
        }
        expect(violations).toEqual([])
    })

    it('shared component files do not import from domains/', () => {
        const violations = []
        for (const file of sharedComponentFiles()) {
            if (read(file).includes("from '@/domains/") || read(file).includes('from "../domains/')) {
                violations.push(rel(file))
            }
        }
        expect(violations).toEqual([])
    })
})

// ---------------------------------------------------------------------------
// RULE-04 (Guideline 04)
// No cross-domain imports (domains/ must not import from other domains/)
// ---------------------------------------------------------------------------

describe('RULE-04: No cross-domain imports', () => {
    // Permitted one-way module dependencies.
    const PERMITTED_DEPENDENCIES = new Set([
        'submissions -> parties',
        'quotes -> parties',
        'quotes -> submissions',
        'policies -> parties',
    ])

    it('no module imports from another module\'s internals', () => {
        const violations = []
        const businessDomains = ['submissions', 'quotes', 'parties', 'policies', 'binding-authorities', 'finance', 'reporting', 'settings', 'auth']
        for (const domain of businessDomains) {
            const domainPath = path.join(SRC, domain)
            if (!fs.existsSync(domainPath)) continue
            const files = collectFiles(domainPath, ['.js', '.jsx', '.ts', '.tsx'])
            for (const file of files) {
                if (path.basename(file).endsWith('.module.ts')) continue
                const content = read(file)
                const matches = content.match(/from ['"]@\/([a-z-]+)\//g) ?? []
                for (const match of matches) {
                    const importedModule = match.replace(/from ['"]@\//, '').replace(/\/.*/, '')
                    if (businessDomains.includes(importedModule) && importedModule !== domain) {
                        const dependency = `${domain} -> ${importedModule}`
                        if (!PERMITTED_DEPENDENCIES.has(dependency)) {
                            violations.push(`${rel(file)}  imports from module "${importedModule}"`)
                        }
                    }
                }
            }
        }
        expect(violations).toEqual([])
    })
})

// ---------------------------------------------------------------------------
// RULE-05 (Guideline 06 §6.7)
// Every test file that mocks api-client must contain an API CONTRACT comment
// ---------------------------------------------------------------------------

describe('RULE-05: api-client mocks must have an API CONTRACT comment', () => {
    it('every test file mocking api-client contains an "API CONTRACT" comment', () => {
        const violations = []
        const testFiles = allTestFiles()
        for (const file of testFiles) {
            const content = read(file)
            const mocksFetch = content.includes("mock('@/shared/lib/api-client/api-client'") ||
                content.includes('mock("@/shared/lib/api-client/api-client")')
            if (mocksFetch && !content.includes('API CONTRACT')) {
                violations.push(rel(file))
            }
        }
        if (violations.length > 0) {
            expect(
                `Test files mocking api-client without an "API CONTRACT" comment block:\n  ${violations.join('\n  ')}\n\n` +
                `Add a comment block stating the endpoint, verification status, and response shape.\n` +
                `See: AI Guidelines/06-Testing-Standards.md §6.7`
            ).toBe('(none)')
        }
    })
})

// ---------------------------------------------------------------------------
// RULE-06 (Guideline 09 §4)
// Components must not access res.data.* — backend returns raw shapes
// ---------------------------------------------------------------------------

describe('RULE-06: No res.data.* access patterns in widget/page files', () => {
    // This pattern was the root cause of all widget failures on 2026-03-06.
    // Backend returns raw arrays/objects — not { data: { ... } } wrapped responses.
    // Only the api-client itself may access .data if needed for a specific endpoint.
    const RES_DATA_PATTERN = /\bres\.data\b/

    it('no widget or page file accesses res.data', () => {
        const violations = []
        const files = srcFiles().filter((f) => !f.includes('.test.') && !f.includes('__tests__') && !f.includes(path.join('src', 'shared')))
        for (const file of files) {
            const content = read(file)
            if (RES_DATA_PATTERN.test(content)) {
                violations.push(rel(file))
            }
        }
        if (violations.length > 0) {
            expect(
                `Files accessing res.data (backend returns raw shapes — no .data wrapper):\n  ${violations.join('\n  ')}\n\n` +
                `Use the raw response directly. See: AI Guidelines/09-Full-Stack-Development.md`
            ).toBe('(none)')
        }
    })
})

// ---------------------------------------------------------------------------
// RULE-07 (Guideline 05)
// No hardcoded tenant or org values in source files
// ---------------------------------------------------------------------------

describe('RULE-07: No hardcoded tenant/org values', () => {
    const HARDCODED_PATTERNS = [
        /['"]ORG-\d{3}['"]/,    // e.g. 'ORG-001'
        /['"]TENANT-\d+['"]/,
        /orgCode\s*=\s*['"][A-Z]{3,}['"]/,  // orgCode = 'BBRK' etc.
    ]

    it('no source file contains hardcoded org or tenant identifiers', () => {
        const violations = []
        for (const file of allNonTestSourceFiles()) {
            const content = read(file)
            for (const pattern of HARDCODED_PATTERNS) {
                if (pattern.test(content)) {
                    violations.push(rel(file))
                    break
                }
            }
        }
        expect(violations).toEqual([])
    })
})

// ---------------------------------------------------------------------------
// RULE-08 (Guideline 06 §6.1 rule 8)
// Backend tests must not use soft-fail status assertions.
// expect([200, 500]).toContain(res.status) masks known bugs — forbidden.
// ---------------------------------------------------------------------------

describe('RULE-08: No soft-fail HTTP status assertions in backend tests', () => {
    it('backend test files must not use expect([...]).toContain for HTTP status', () => {
        const backendTestDir = path.join(ROOT, 'backend', '__tests__')
        let backendTestFiles = []
        try {
            backendTestFiles = collectFiles(backendTestDir, ['.test.js'])
        } catch { /* backend tests may not exist yet */ }

        const violations = []
        for (const file of backendTestFiles) {
            const content = read(file)
            // Pattern: expect([...]).toContain(res.status) or expect([200, 500, ...])
            if (/expect\(\s*\[[\d\s,]+\]\s*\)\s*\.toContain\s*\(\s*res\.status/.test(content)) {
                violations.push(rel(file))
            }
        }
        if (violations.length > 0) {
            expect(
                `Backend test files using soft-fail HTTP status assertions:\n  ${violations.join('\n  ')}\n\n` +
                `Replace: expect([200, 500]).toContain(res.status)\n` +
                `With:    expect(res.status).toBe(200)\n` +
                `See: AI Guidelines/06-Testing-Standards.md §6.1 rule 8`
            ).toBe('(none)')
        }
    })
})

// ---------------------------------------------------------------------------
// RULE-09 (Guideline 10 §10.4)
// No direct console.log / console.warn / console.error in application code.
// All debug output must go through @/lib/logger/logger.
// ---------------------------------------------------------------------------

describe('RULE-09: No direct console.log/warn/error calls in application source', () => {
    // Files permitted to call console.* directly:
    //   • logger.ts itself — it IS the console wrapper
    //   • codebase-scan.test.js — test infrastructure, not app code
    const ALLOWED_FILES = [
        path.join(SRC, 'shared', 'lib', 'logger', 'logger.ts'),
    ]


    const CONSOLE_PATTERN = /\bconsole\.(log|warn|error)\s*\(/

    it('no source file outside lib/logger calls console.log, console.warn, or console.error directly', () => {
        const violations = []
        for (const file of allNonTestSourceFiles()) {
            if (ALLOWED_FILES.some((allowed) => file === allowed)) continue
            const lines = read(file).split('\n')
            lines.forEach((line, i) => {
                const trimmed = line.trim()
                // Skip pure comment lines
                if (trimmed.startsWith('//') || trimmed.startsWith('*')) return
                if (CONSOLE_PATTERN.test(line)) {
                    violations.push(`${rel(file)}:${i + 1}  →  ${trimmed}`)
                }
            })
        }
        if (violations.length > 0) {
            expect(
                `Files with direct console.* calls (use logger from @/lib/logger/logger instead):\n  ${violations.join('\n  ')}\n\n` +
                `Replace:  console.log(...)   →  logger.log(...)\n` +
                `Replace:  console.warn(...)  →  logger.warn(...)\n` +
                `Replace:  console.error(...) →  logger.error(...)\n` +
                `See: AI Guidelines/10-Debug-And-Build-Standards.md §10.4`
            ).toBe('(none)')
        }
    })
})

// ---------------------------------------------------------------------------
// RULE-10 (Guideline 04 §4.8)
// All React component files in app/, components/, and domains/ must use the
// .tsx extension.  The sole permitted exception is app/main.jsx (entry point).
// ---------------------------------------------------------------------------

describe('RULE-10: React files must use .tsx extension, not .jsx', () => {
    const ALLOWED_JSX = [
        path.join(SRC, 'main.jsx'),
    ]

    it('no .jsx files exist outside the documented exception (src/main.jsx)', () => {
        const violations = []
        for (const file of collectFiles(SRC, ['.jsx'])) {
            if (ALLOWED_JSX.some((allowed) => file === allowed)) continue
            violations.push(rel(file))
        }
        if (violations.length > 0) {
            expect(
                `Files using .jsx instead of .tsx:\n  ${violations.join('\n  ')}\n\n` +
                `Rename to .tsx and replace JSDoc @typedef with TypeScript interfaces.\n` +
                `Only exception: src/main.jsx (Vite entry point — structural exception).\n` +
                `See: AI Guidelines/04-Architectural-Boundaries.md §4.8`
            ).toBe('(none)')
        }
    })
})

// ---------------------------------------------------------------------------
// RULE-11 (Guideline 14 §14.1 RULE 1)
// Page outer wrappers must use p-6, not p-8 or p-4.
// ---------------------------------------------------------------------------

describe('RULE-11: Page outer wrappers must use p-6 not p-8', () => {
    const EXEMPT_PATHS = [
        path.join(SRC, 'auth', 'LoginPage.tsx'),
    ]

    const P8_PATTERN = /className="[^"]*\bp-8\b/

    function isPageFile(filePath) {
        const base = path.basename(filePath)
        return base === 'index.tsx' || base.endsWith('Page.tsx') || base.endsWith('Dashboard.tsx')
    }

    it('no page file uses p-8 as a top-level layout class', () => {
        const violations = []
        const files = collectFiles(SRC, ['.tsx']).filter(f => !f.includes(path.join('src', 'shared')))
        for (const file of files) {
            if (file.includes('.test.')) continue
            if (!isPageFile(file)) continue
            if (EXEMPT_PATHS.some((e) => file === e)) continue
            if (P8_PATTERN.test(read(file))) {
                violations.push(rel(file))
            }
        }
        if (violations.length > 0) {
            expect(
                `Files using p-8 (standard page padding is p-6):\n  ${violations.join('\n  ')}\n\n` +
                `Replace p-8 with p-6. See: AI Guidelines/14-UI-Component-Standards.md §14.1`
            ).toBe('(none)')
        }
    })
})

// ---------------------------------------------------------------------------
// RULE-12 (Guideline 14 §14.1 RULE 2)
// Page outer wrappers must not set min-h-screen or bg-gray-50 (AppLayout handles these).
// ---------------------------------------------------------------------------

describe('RULE-12: Page wrappers must not set min-h-screen or bg-gray-50', () => {
    const EXEMPT_PATHS = [
        path.join(SRC, 'auth', 'LoginPage.tsx'),
    ]

    const VIOLATION_PATTERN = /className="[^"]*\b(min-h-screen|bg-gray-50)\b/
    // Lines where bg-gray-50 is used on non-wrapper elements (hover states, thead) are exempt
    const NON_WRAPPER_PATTERN = /hover:bg-gray-50|<thead\b/

    function isPageFile(filePath) {
        const base = path.basename(filePath)
        return base === 'index.tsx' || base.endsWith('Page.tsx') || base.endsWith('Dashboard.tsx')
    }

    it('no app page sets min-h-screen or bg-gray-50 on its outer wrapper', () => {
        const violations = []
        const files = collectFiles(SRC, ['.tsx']).filter(f => !f.includes(path.join('src', 'shared')))
        for (const file of files) {
            if (file.includes('.test.')) continue
            if (!isPageFile(file)) continue
            if (EXEMPT_PATHS.some((e) => file === e)) continue
            const lines = read(file).split('\n')
            lines.forEach((line, i) => {
                if (VIOLATION_PATTERN.test(line) && !NON_WRAPPER_PATTERN.test(line)) {
                    violations.push(`${rel(file)}:${i + 1}  →  ${line.trim()}`)
                }
            })
        }
        if (violations.length > 0) {
            expect(
                `Files setting min-h-screen or bg-gray-50 on a page wrapper (AppLayout already sets these):\n  ${violations.join('\n  ')}\n\n` +
                `Remove the class. See: AI Guidelines/14-UI-Component-Standards.md §14.1 RULE 2`
            ).toBe('(none)')
        }
    })
})

// ---------------------------------------------------------------------------
// RULE-13 (Guideline 14 §14.1 RULE 1)
// Page content stacks must use flex flex-col gap-6, not space-y-*.
// space-y uses a CSS sibling selector that misfires with conditional React children.
// Scope: files that are page-level wrappers only (named *Page.tsx or index.tsx directly
// inside app/features/* or domains/*/components/).  Sub-components (form fields,
// search inputs, inline create forms) legitimately use space-y-* for internal spacing.
// ---------------------------------------------------------------------------

describe('RULE-13: Use gap-6 not space-y-* for page-level content stacks', () => {
    const SPACE_Y_PATTERN = /className="[^"]*\bspace-y-\d+\b/

    /** Returns true for files that are page-level entry points, not sub-components */
    function isPageFile(filePath) {
        const base = path.basename(filePath)
        // Matches: SubmissionsPage.tsx, NewSubmissionPage.tsx, HomeDashboard.tsx, features/.../index.tsx
        return base === 'index.tsx' || base.endsWith('Page.tsx') || base.endsWith('Dashboard.tsx')
    }

    it('no page file uses space-y-* for its top-level content stack', () => {
        const violations = []
        const files = collectFiles(SRC, ['.tsx']).filter(f => !f.includes(path.join('src', 'shared')))
        for (const file of files) {
            if (file.includes('.test.')) continue
            if (!isPageFile(file)) continue
            const lines = read(file).split('\n')
            lines.forEach((line, i) => {
                if (SPACE_Y_PATTERN.test(line)) {
                    violations.push(`${rel(file)}:${i + 1}  →  ${line.trim()}`)
                }
            })
        }
        if (violations.length > 0) {
            expect(
                `Page files using space-y-* (use flex flex-col gap-6 instead — space-y uses a CSS sibling selector that misfires with conditional children):\n  ${violations.join('\n  ')}\n\n` +
                `Replace: space-y-6  →  flex flex-col gap-6\n` +
                `Note: space-y-* inside sub-components (form fields, search inputs) is permitted.\n` +
                `See: AI Guidelines/14-UI-Component-Standards.md §14.1 RULE 1`
            ).toBe('(none)')
        }
    })
})

// ---------------------------------------------------------------------------
// RULE-14 (Guideline 14 §14.3 removed — headers are forbidden)
// Authenticated app pages must not contain a page-level <h1>.
// The active nav item in the sidebar already signals the current page.
// Scope: *Page.tsx, *Dashboard.tsx, index.tsx inside app/features and domains/
// ---------------------------------------------------------------------------

describe('RULE-14: No page-level <h1> headings on authenticated app pages', () => {
    const H1_PATTERN = /<h1[\s>]/

    function isPageFile(filePath) {
        const base = path.basename(filePath)
        return base === 'index.tsx' || base.endsWith('Page.tsx') || base.endsWith('Dashboard.tsx')
    }

    it('no authenticated page file contains an <h1> element', () => {
        const violations = []
        const files = collectFiles(SRC, ['.tsx']).filter(f => !f.includes(path.join('src', 'shared')))
        for (const file of files) {
            if (file.includes('.test.')) continue
            if (file.includes(path.join('src', 'auth'))) continue
            if (!isPageFile(file)) continue
            const lines = read(file).split('\n')
            lines.forEach((line, i) => {
                if (H1_PATTERN.test(line)) {
                    violations.push(`${rel(file)}:${i + 1}  →  ${line.trim()}`)
                }
            })
        }
        if (violations.length > 0) {
            expect(
                `Page files containing <h1> (authenticated pages must not have page-level headings — the sidebar nav already provides context):\n  ${violations.join('\n  ')}\n\n` +
                `Remove the <h1> and any accompanying subtitle <p>.\n` +
                `See: AI Guidelines/14-UI-Component-Standards.md`
            ).toBe('(none)')
        }
    })
})
