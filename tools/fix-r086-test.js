const fs = require('fs');
const path = require('path');

const testFile = path.join(__dirname, '..', 'frontend', 'src', 'binding-authorities', '__tests__', 'binding-authorities.test.tsx');
let content = fs.readFileSync(testFile, 'utf8');

// Normalise line endings to LF for matching
const normalised = content.replace(/\r\n/g, '\n');

const oldSnippet = `    // REQ-BA-FE-F-086
    it('T-BA-FE-F-R086 \u2014 GPI Monitoring tab renders placeholder text', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        await userEvent.click(screen.getByRole('button', { name: /gpi monitoring/i }))
        // GPI section tab shows: "GPI Monitoring \u2014 progress bars coming soon."
        expect(await screen.findByText(/progress bars coming soon/i)).toBeInTheDocument()
    })`;

const newSnippet = `    // REQ-BA-FE-F-086
    it('T-BA-FE-F-R086 \u2014 GPI Monitoring tab shows no-limit message when written_premium_limit is null', async () => {
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        await userEvent.click(screen.getByRole('button', { name: /gpi monitoring/i }))
        // SAMPLE_SECTION has written_premium_limit: null \u2014 no-limit message shown
        expect(await screen.findByText(/no gpi limit configured/i)).toBeInTheDocument()
    })

    it('T-BA-FE-F-R086b \u2014 GPI Monitoring tab shows limit display when written_premium_limit is set', async () => {
        mockGetBASections.mockResolvedValue([{ ...SAMPLE_SECTION, written_premium_limit: 500000 }])
        renderBASectionViewPage('1', '10')
        await screen.findByRole('heading', { name: 'SEC-001' })
        await userEvent.click(screen.getByRole('button', { name: /gpi monitoring/i }))
        expect(await screen.findByText(/gpi limit monitoring/i)).toBeInTheDocument()
        expect(await screen.findByText('500,000')).toBeInTheDocument()
    })`;

if (normalised.includes(oldSnippet)) {
    const updated = normalised.replace(oldSnippet, newSnippet);
    // Restore CRLF if the file originally used it
    const finalContent = content.includes('\r\n') ? updated.replace(/\n/g, '\r\n') : updated;
    fs.writeFileSync(testFile, finalContent, 'utf8');
    console.log('SUCCESS: T-BA-FE-F-R086 test updated');
} else {
    console.log('NOT FOUND: checking for alternate dash character...');
    // Try with regular hyphen-minus fallback
    const idx = normalised.indexOf('T-BA-FE-F-R086');
    if (idx >= 0) {
        console.log('Found at position', idx);
        console.log('Surrounding text:', JSON.stringify(normalised.slice(idx - 5, idx + 200)));
    } else {
        console.log('Test ID T-BA-FE-F-R086 not found at all');
    }
}
