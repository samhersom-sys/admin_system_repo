/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    // roots: <rootDir> covers website.test.tsx at root + __tests__/ + any subdirectory tests
    roots: ['<rootDir>'],
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
        // Resolve @/ alias to the website root (matches tsconfig paths)
        '^@/(.*)$': '<rootDir>/$1',
        // Stub static assets and styles
        '\\.(css|less|scss|sass)$': '<rootDir>/jest.styleMock.js',
        '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/jest.fileMock.js',
    },
    testMatch: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.test.js',
        '**/*.test.jsx',
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/.next/',
    ],
    collectCoverageFrom: [
        'app/**/*.{ts,tsx,js,jsx}',
        'components/**/*.{ts,tsx,js,jsx}',
        'lib/**/*.{ts,tsx,js,jsx}',
        '!**/*.requirements.md',
        '!**/node_modules/**',
    ],
}
