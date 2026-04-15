/**
 * Jest configuration — Backend integration tests (Layer 2)
 *
 * Environment: Node (not jsdom — these tests connect to a real DB)
 * Requires: Postgres running on port 5432, backend running on port 5000
 *
 * Run: npm run test:backend
 */

module.exports = {
    displayName: 'backend',
    rootDir: '..',
    testEnvironment: 'node',
    testRegex: 'backend/__tests__/.*\\.test\\.js$',
    // Backend tests can be slower due to DB round-trips
    testTimeout: 30000,
    // No transform needed — plain JS
    transform: {},
    // Run tests serially to avoid DB race conditions
    maxWorkers: 1,
    verbose: true,
    // Force Jest to exit after tests complete; prevents DB connection handles
    // from holding the process open and causing a non-zero exit code in CI.
    forceExit: true,
}
