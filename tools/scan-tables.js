// scan-tables.js — find <table> elements missing app-table class
const fs = require('fs')
const path = require('path')

function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    return entries.flatMap(e =>
        e.isDirectory()
            ? walk(path.join(dir, e.name))
            : [path.join(dir, e.name)]
    )
}

const src = path.resolve(__dirname, '../frontend/src')
const violations = []

walk(src)
    .filter(f => /\.(tsx|jsx)$/.test(f))
    .forEach(f => {
        const lines = fs.readFileSync(f, 'utf8').split('\n')
        lines.forEach((l, i) => {
            if (l.includes('<table') && !l.includes('app-table')) {
                violations.push(`${path.relative(src, f)}:${i + 1}  ${l.trim()}`)
            }
        })
    })

if (violations.length === 0) {
    console.log('No RULE 12 violations found — all tables use app-table.')
} else {
    console.log(`RULE 12 violations — ${violations.length} table(s) missing app-table:\n`)
    violations.forEach(v => console.log(v))
}
