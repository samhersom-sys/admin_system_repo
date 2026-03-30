/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    // List each src/ subdirectory explicitly — OneDrive reparse points cause
    // Node.js Dirent.isDirectory() to return false for the direct children of src/,
    // so jest's node crawler can't traverse from src/ itself on Windows+OneDrive.
    roots: [
        '<rootDir>/src/auth',
        '<rootDir>/src/binding-authorities',
        '<rootDir>/src/finance',
        '<rootDir>/src/home',
        '<rootDir>/src/not-found',
        '<rootDir>/src/parties',
        '<rootDir>/src/policies',
        '<rootDir>/src/profile',
        '<rootDir>/src/pwa',
        '<rootDir>/src/quotes',
        '<rootDir>/src/reporting',
        '<rootDir>/src/search',
        '<rootDir>/src/settings',
        '<rootDir>/src/shared',
        '<rootDir>/src/shell',
        '<rootDir>/src/submissions',
        '<rootDir>/src/workflow',
        '<rootDir>/src/__tests__',
    ],
    transform: {
        '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
            tsconfig: {
                jsx: 'react-jsx',
                esModuleInterop: true,
                noUnusedLocals: false,
                noUnusedParameters: false,
            },
        }],
    },
    moduleNameMapper: {
        // Resolve @/ alias to src/
        '^@/(.*)$': '<rootDir>/src/$1',
        // Stub static assets
        '\\.(css|less|scss|sass)$': '<rootDir>/jest.styleMock.js',
        '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/jest.fileMock.js',
    },
    testMatch: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.test.js',
        '**/*.test.jsx',
        '**/test.ts',
        '**/test.tsx',
    ],
    // Exclude backend integration tests — those run under jest.backend.config.js at root
    testPathIgnorePatterns: [
        '/node_modules/',
    ],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!**/*.requirements.md',
        '!**/node_modules/**',
    ],
}
