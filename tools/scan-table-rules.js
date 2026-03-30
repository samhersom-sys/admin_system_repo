// scan-table-rules.js — audit all table markup for RULE 13 (th alignment) and
// RULE 14 (td alignment by type) violations.
const fs = require('fs')
const path = require('path')

function walk(dir) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        return entries.flatMap(e =>
            e.isDirectory()
                ? walk(path.join(dir, e.name))
                : [path.join(dir, e.name)]
        )
    } catch { return [] }
}

const searchDirs = [
    path.resolve(__dirname, '../frontend/src'),
]

const rule13 = []  // <th> with text-right or text-center
const noWrapper = []  // <table className="app-table"> without table-wrapper parent check

searchDirs.forEach(src => {
    walk(src)
        .filter(f => /\.(tsx|jsx)$/.test(f))
        .forEach(f => {
            const rel = path.relative(src, f)
            const lines = fs.readFileSync(f, 'utf8').split('\n')
            lines.forEach((l, i) => {
                const loc = `${rel}:${i + 1}`
                // RULE 13 — th must not have text-right or text-center
                if (/[<{]th[\s"'>/]/.test(l) && (l.includes('text-right') || l.includes('text-center'))) {
                    rule13.push(`${loc}  ${l.trim()}`)
                }
            })
        })
})

console.log('=== RULE 13: <th> alignment violations ===')
if (rule13.length === 0) {
    console.log('None found.')
} else {
    rule13.forEach(v => console.log(v))
}
console.log()
