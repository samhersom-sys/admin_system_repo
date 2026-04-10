const { runQuery } = require('./db')

async function main() {
    try {
        const policies = await runQuery(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='policies' ORDER BY ordinal_position"
        )
        console.log('POLICIES:', JSON.stringify(policies, null, 2))
    } catch (e) {
        console.log('policies table error:', e.message)
    }

    try {
        const ba = await runQuery(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='binding_authorities' ORDER BY ordinal_position"
        )
        console.log('BA:', JSON.stringify(ba, null, 2))
    } catch (e) {
        console.log('BA table error:', e.message)
    }

    try {
        const q = await runQuery(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='quotes' ORDER BY ordinal_position"
        )
        console.log('QUOTES:', JSON.stringify(q, null, 2))
    } catch (e) {
        console.log('quotes table error:', e.message)
    }

    process.exit(0)
}
main()
