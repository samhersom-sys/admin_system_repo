// Fix R086 test — double-encoded em dash characters in test file
const fs = require('fs')

const DASH = String.fromCharCode(0xe2, 0x20ac, 0x201d) // double-encoded em dash as in file

const testFile = 'frontend/src/binding-authorities/__tests__/binding-authorities.test.tsx'
let content = fs.readFileSync(testFile, 'utf8')
const normalised = content.replace(/\r\n/g, '\n')

// Build old snippet using the actual characters in the file
const oldLines = [
    '    // REQ-BA-FE-F-086',
    "    it('T-BA-FE-F-R086 " + DASH + " GPI Monitoring tab renders placeholder text', async () => {",
    "        renderBASectionViewPage('1', '10')",
    "        await screen.findByRole('heading', { name: 'SEC-001' })",
    '        await userEvent.click(screen.getByRole(\'button\', { name: /gpi monitoring/i }))',
    '        // GPI section tab shows: "GPI Monitoring ' + DASH + ' progress bars coming soon."',
    '        expect(await screen.findByText(/progress bars coming soon/i)).toBeInTheDocument()',
    '    })',
]
const oldSnippet = oldLines.join('\n')

const newLines = [
    '    // REQ-BA-FE-F-086',
    "    it('T-BA-FE-F-R086 " + DASH + " GPI Monitoring tab shows no-limit message when written_premium_limit is null', async () => {",
    "        renderBASectionViewPage('1', '10')",
    "        await screen.findByRole('heading', { name: 'SEC-001' })",
    '        await userEvent.click(screen.getByRole(\'button\', { name: /gpi monitoring/i }))',
    '        // SAMPLE_SECTION has written_premium_limit: null ' + DASH + ' no-limit message shown',
    '        expect(await screen.findByText(/no gpi limit configured/i)).toBeInTheDocument()',
    '    })',
    '',
    "    it('T-BA-FE-F-R086b " + DASH + " GPI Monitoring tab shows limit display when written_premium_limit is set', async () => {",
    '        mockGetBASections.mockResolvedValue([{ ...SAMPLE_SECTION, written_premium_limit: 500000 }])',
    "        renderBASectionViewPage('1', '10')",
    "        await screen.findByRole('heading', { name: 'SEC-001' })",
    '        await userEvent.click(screen.getByRole(\'button\', { name: /gpi monitoring/i }))',
    '        expect(await screen.findByText(/gpi limit monitoring/i)).toBeInTheDocument()',
    "        expect(await screen.findByText('500,000')).toBeInTheDocument()",
    '    })',
]
const newSnippet = newLines.join('\n')

console.log('contains?', normalised.includes(oldSnippet))
if (normalised.includes(oldSnippet)) {
    const updated = normalised.replace(oldSnippet, newSnippet)
    const finalContent = content.includes('\r\n') ? updated.replace(/\n/g, '\r\n') : updated
    fs.writeFileSync(testFile, finalContent, 'utf8')
    console.log('SUCCESS: T-BA-FE-F-R086 test updated')
} else {
    // Debug: show what the actual characters look like
    const idx = normalised.indexOf("T-BA-FE-F-R086")
    if (idx >= 0) {
        const snippet = normalised.slice(idx - 5, idx + 100)
        const codes = []
        for (let i = 0; i < snippet.length; i++) codes.push(snippet.charCodeAt(i).toString(16))
        console.log('Actual char codes:', codes.join(' '))
    }
}
