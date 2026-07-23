const fs = require('fs')
const file = 'c:/Users/samhe/OneDrive/Desktop/Cleaned/frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx'
let c = fs.readFileSync(file, 'utf8')

// Find the Sections Tab marker using the actual char codes in the file
const idx = c.indexOf('Sections Tab')
const lineStart = c.lastIndexOf('\n', idx - 150) + 1
console.log('Sections Tab at:', idx, 'section comment start at:', lineStart)
console.log('Context:', JSON.stringify(c.substring(lineStart - 5, idx + 15)))

// Find the }) closing line before it (end of BAViewPage header describe block)
// The marker line is: "// BAViewPage ... Sections Tab"
// We want to insert BEFORE the comment block that starts with "// ---..."
// Find "// ---------" before Sections Tab
const insertAt = c.lastIndexOf('// ----', idx - 1)
console.log('Insert at:', insertAt)
console.log('Context at insertAt:', JSON.stringify(c.substring(insertAt - 5, insertAt + 100)))

const newBlock = [
    '',
    '// ---------------------------------------------------------------------------',
    '// BAViewPage - Audit Events - REQ-BA-FE-F-148, REQ-BA-FE-F-149',
    '// ---------------------------------------------------------------------------',
    '',
    "describe('BAViewPage - Audit Events', () => {",
    '    beforeEach(() => {',
    '        mockGetBindingAuthority.mockResolvedValue(SAMPLE_BA)',
    '        mockGetBASections.mockResolvedValue([SAMPLE_SECTION])',
    '        mockGetBATransactions.mockResolvedValue([])',
    '        mockGetPoliciesForBA.mockResolvedValue([])',
    '        mockUpdateBindingAuthority.mockResolvedValue(SAMPLE_BA)',
    '        mockPost.mockResolvedValue(undefined)',
    '    })',
    '    afterEach(() => jest.clearAllMocks())',
    '',
    '    // REQ-BA-FE-F-148',
    "    it('T-BA-FE-F-R148 - ba:save posts \"BA Updated\" audit event (REQ-BA-FE-F-148)', async () => {",
    "        renderBAViewPage('1')",
    "        await screen.findByRole('heading', { name: /ba-2026-001/i })",
    "        window.dispatchEvent(new Event('ba:save'))",
    '        await waitFor(() =>',
    '            expect(mockPost).toHaveBeenCalledWith(',
    "                '/api/binding-authorities/1/audit',",
    "                expect.objectContaining({ action: 'BA Updated' }),",
    '            )',
    '        )',
    '    })',
    '',
    '    // REQ-BA-FE-F-149',
    "    it('T-BA-FE-F-R149 - Issue BA posts \"BA Status Changed\" audit event (REQ-BA-FE-F-149)', async () => {",
    "        renderBAViewPage('1')",
    "        await screen.findByRole('heading', { name: /ba-2026-001/i })",
    "        window.dispatchEvent(new Event('ba:issue'))",
    '        await waitFor(() =>',
    '            expect(mockPost).toHaveBeenCalledWith(',
    "                '/api/binding-authorities/1/audit',",
    '                expect.objectContaining({',
    "                    action: 'BA Status Changed',",
    "                    details: expect.objectContaining({ description: expect.stringContaining('Status:') }),",
    '                }),',
    '            )',
    '        )',
    '    })',
    '})',
    '',
].join('\r\n')

c = c.slice(0, insertAt) + newBlock + c.slice(insertAt)
fs.writeFileSync(file, c, 'utf8')
console.log('Done')
