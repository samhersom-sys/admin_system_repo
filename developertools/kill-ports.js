/**
 * kill-ports.js — clears dev ports (3000, 5000, 5173) before starting servers.
 * Works on Windows via netstat + taskkill.
 */
const { execSync } = require('child_process')

const PORTS = [3000, 5000, 5173]

PORTS.forEach((port) => {
    try {
        const output = execSync(`netstat -ano | findstr :${port}`, { stdio: 'pipe' })
            .toString()
        const pids = output
            .split('\n')
            .map((line) => line.trim().split(/\s+/).pop())
            .filter((v, i, a) => v && /^\d+$/.test(v) && v !== '0' && a.indexOf(v) === i)
        pids.forEach((pid) => {
            try {
                execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
                console.log(`Killed PID ${pid} on port ${port}`)
            } catch {
                // already gone
            }
        })
        if (pids.length === 0) console.log(`Port ${port} free`)
    } catch {
        console.log(`Port ${port} free`)
    }
})
