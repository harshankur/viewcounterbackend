module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'index.js',
        'config/**/*.js',
        'db/**/*.js',
        'middleware/**/*.js',
        'utils/**/*.js',
        '!**/node_modules/**',
        '!**/scripts/**'
    ],
    testMatch: [
        '**/tests/**/*.test.js'
    ],
    verbose: true,
    testTimeout: 10000,
    coverageReporters: ['text', 'lcov', 'clover', 'json-summary'],
    reporters: [
        'default',
        [
            'jest-html-reporter',
            {
                pageTitle: 'View Counter Backend - Test Report',
                outputPath: 'test-report.html',
                includeFailureMsg: true,
                includeConsoleLog: true,
                sort: 'status'
            }
        ]
    ],
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50
        }
    }
};
