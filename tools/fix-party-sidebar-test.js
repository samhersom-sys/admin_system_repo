// Fix T-PAR-CREATE-R00a test — remove Back item assertion since Back was removed from sidebar section
const fs = require('fs')

const testFile = 'frontend/src/parties/CreatePartyPage/__tests__/CreatePartyPage.test.tsx'
let content = fs.readFileSync(testFile, 'utf8')

// Use CRLF since the file uses CRLF line endings
const CRLF = '\r\n'

const oldText = "T-PAR-CREATE-R00a: registers sidebar section with Back and Save items', () => {" + CRLF +
    "        renderPage()" + CRLF +
    "        const section = mockUseSidebarSection.mock.calls[0]?.[0]" + CRLF +
    "        expect(section.title).toBe('Party')" + CRLF +
    "        expect(section.items).toContainEqual(expect.objectContaining({ label: 'Back', to: '/parties' }))" + CRLF +
    "        expect(section.items).toContainEqual(expect.objectContaining({ label: 'Save', event: 'party:save' }))" + CRLF +
    "    })"

// New test: Back removed — only Save should be in section
const newText = "T-PAR-CREATE-R00a: registers sidebar section with Save only (§14 \u2014 global Back handles all back navigation)', () => {" + CRLF +
    "        renderPage()" + CRLF +
    "        const section = mockUseSidebarSection.mock.calls[0]?.[0]" + CRLF +
    "        expect(section.title).toBe('Party')" + CRLF +
    "        expect(section.items).not.toContainEqual(expect.objectContaining({ label: 'Back' }))" + CRLF +
    "        expect(section.items).toContainEqual(expect.objectContaining({ label: 'Save', event: 'party:save' }))" + CRLF +
    "    })"

console.log('contains?', content.includes(oldText))
if (content.includes(oldText)) {
    const updated = content.replace(oldText, newText)
    fs.writeFileSync(testFile, updated, 'utf8')
    console.log('SUCCESS: T-PAR-CREATE-R00a test updated')
} else {
    console.log('NOT FOUND')
    const idx = content.indexOf('T-PAR-CREATE-R00a')
    console.log('Context:', JSON.stringify(content.slice(idx, idx + 400)))
}
