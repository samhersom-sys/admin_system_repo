/**
 * WEB Architectural Constraints — Codebase Scan
 *
 * Traceable to: website/website.requirements.md
 * Domain code:  WEB
 * Covers:       REQ-WEB-C-001, C-002, C-013, C-014, C-015
 *               (C-012 is structural — verified by the presence of website/package.json)
 *
 * This file mirrors the role of frontend/app/__tests__/codebase-scan.test.js
 * but scoped to the website/ app.
 *
 * Uses Node's fs/path (no component imports) so it can run independently of
 * whether the page files exist yet (Step 4).
 */

const fs = require('fs')
const path = require('path')

// website/ root — one level up from __tests__/
const WEBSITE_ROOT = path.resolve(__dirname, '..')

// Files that legitimately define hex values and are exempt from the hex scan
const HEX_SCAN_EXEMPT = [
    path.join('lib', 'design-tokens', 'brandColors.ts'),
    'tailwind.config.js', // defines the Tailwind brand palette extension
    'jest.config.js',
    'jest.setup.ts',
    'jest.fileMock.js',
    'jest.styleMock.js',
]

/**
 * Recursively collects all .ts / .tsx / .js / .jsx source files under `dir`,
 * skipping node_modules, .next, .git, and __tests__ directories,
 * and excluding test files themselves.
 */
function getSourceFiles(dir) {
    const results = []
    let items
    try {
        items = fs.readdirSync(dir)
    } catch {
        return results
    }
    for (const item of items) {
        if (['node_modules', '.next', '.git', '__tests__'].includes(item)) continue
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
            results.push(...getSourceFiles(fullPath))
        } else if (
            /\.(ts|tsx|js|jsx)$/.test(item) &&
            !/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(item)
        ) {
            results.push(fullPath)
        }
    }
    return results
}

const allSourceFiles = getSourceFiles(WEBSITE_ROOT)

// Helper: read a file and return its lines with 1-based line numbers
function readLines(filePath) {
    return fs.readFileSync(filePath, 'utf8').split('\n')
}

// Helper: true when a line is a pure comment (// or * block comment)
function isCommentLine(line) {
    const trimmed = line.trim()
    return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')
}

// ──────────────────────────────────────────────────────────────────────────────

describe('WEB Architectural Constraints — codebase scan', () => {
    it('scan infrastructure: source file list is non-empty', () => {
        expect(allSourceFiles.length).toBeGreaterThan(0)
    })

    // ── REQ-WEB-C-001 / REQ-WEB-C-015 ────────────────────────────────────────
    // No website/ file may import from frontend/, backend/, or domains/ paths.
    it('T-WEB-arch-C001-C015: no website/ file imports from frontend/, backend/, or domains/', () => {
        const violations = []
        for (const file of allSourceFiles) {
            const lines = readLines(file)
            lines.forEach((line, i) => {
                if (isCommentLine(line)) return
                // Catch cross-app relative imports traversing up to sibling apps
                if (
                    /import[^'"]*from\s+['"].*\.\.(\/|\\)(frontend|backend|domains)/.test(line)
                ) {
                    violations.push(
                        `${path.relative(WEBSITE_ROOT, file)}:${i + 1} — ${line.trim()}`
                    )
                }
            })
        }
        expect(violations).toEqual([])
    })

    // ── REQ-WEB-C-002 ─────────────────────────────────────────────────────────
    // No website/ file may call fetch() directly (all pages are static; no API client).
    it('T-WEB-arch-C002: no fetch() calls in website/ source files', () => {
        const violations = []
        for (const file of allSourceFiles) {
            const lines = readLines(file)
            lines.forEach((line, i) => {
                if (isCommentLine(line)) return
                if (/\bfetch\s*\(/.test(line)) {
                    violations.push(
                        `${path.relative(WEBSITE_ROOT, file)}:${i + 1} — ${line.trim()}`
                    )
                }
            })
        }
        expect(violations).toEqual([])
    })

    // ── REQ-WEB-C-013 ─────────────────────────────────────────────────────────
    // No raw hex colour literals in .ts/.tsx source files.
    // Exempt: brandColors.ts (defines the tokens), tailwind.config.js (extends palette).
    // Allowed: %23RRGGBB (URL-encoded hex inside SVG data URIs).
    it('T-WEB-arch-C013: no raw hex colour literals in website/ source files outside token/config files', () => {
        const nonTokenFiles = allSourceFiles.filter((f) => {
            const rel = path.relative(WEBSITE_ROOT, f)
            return !HEX_SCAN_EXEMPT.some((exempt) => rel.endsWith(exempt) || rel === exempt)
        })

        const violations = []
        for (const file of nonTokenFiles) {
            const lines = readLines(file)
            lines.forEach((line, i) => {
                if (isCommentLine(line)) return
                // Remove %23-encoded hex (SVG data URI, allowed per REQ-WEB-C-013)
                const stripped = line.replace(/%23[0-9A-Fa-f]{0,5}/g, '')
                // Detect bare hex literals: #RGB, #RRGGBB (word boundary prevents false positives)
                if (/#[0-9A-Fa-f]{3,6}\b/.test(stripped)) {
                    violations.push(
                        `${path.relative(WEBSITE_ROOT, file)}:${i + 1} — ${line.trim()}`
                    )
                }
            })
        }
        expect(violations).toEqual([])
    })

    // ── REQ-WEB-C-014 ─────────────────────────────────────────────────────────
    // The production app URL (app.policyforge.com) must not be hardcoded in source.
    // It must always be read from NEXT_PUBLIC_APP_URL.
    // The localhost:5173 dev fallback on the same line as the env var read is permitted.
    it('T-WEB-arch-C014: production app URL not hardcoded in website/ source files', () => {
        const violations = []
        for (const file of allSourceFiles) {
            const lines = readLines(file)
            lines.forEach((line, i) => {
                if (isCommentLine(line)) return
                // If the line also reads NEXT_PUBLIC_APP_URL, it is the approved pattern
                if (/process\.env\.NEXT_PUBLIC_APP_URL/.test(line)) return
                // Hardcoded production domain — not permitted outside the env var read
                if (/app\.policyforge\.com/.test(line)) {
                    violations.push(
                        `${path.relative(WEBSITE_ROOT, file)}:${i + 1} — ${line.trim()}`
                    )
                }
            })
        }
        expect(violations).toEqual([])
    })

    // ── REQ-WEB-C-012 (structural) ────────────────────────────────────────────
    // website/ must have its own package.json (independent dependency tree).
    it('T-WEB-arch-C012: website/package.json exists (independent dependency declaration)', () => {
        const pkgPath = path.join(WEBSITE_ROOT, 'package.json')
        expect(fs.existsSync(pkgPath)).toBe(true)
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
        expect(pkg.name).toBe('policy-forge-website')
    })
})
