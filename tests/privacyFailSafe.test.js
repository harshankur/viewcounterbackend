const DatabaseManager = require('../db/DatabaseManager');

// Regex patterns to detect raw IPs
// Matches full IPv4 (x.x.x.x where x > 0)
const RAW_IPV4_PATTERN = /^(?!.*\.\d{1,3}\.0$)\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
// Matches full IPv6 (identifies anything with more than 4 colons as a "potential leak" if not ending in :0)
const RAW_IPV6_PATTERN = /^(?!.*:0:0:0:0$)([0-9a-fA-F]{1,4}:){3,7}[0-9a-fA-F]{1,4}$/;

describe('Privacy Fail-Safe Verification', () => {
    let dbManager;
    let interceptedParams = [];

    const mockPool = {
        query: jest.fn(async (sql, params) => {
            interceptedParams.push(...params);
            return [{ insertId: 1 }];
        }),
        execute: jest.fn(async (sql, params) => {
            interceptedParams.push(...params);
            return [{ insertId: 1 }];
        }),
        end: jest.fn()
    };

    beforeEach(() => {
        interceptedParams = [];
        dbManager = new DatabaseManager({ mode: 'connect' });
        dbManager.pool = mockPool;
    });

    test('Fail-Safe: registerEvent should NEVER include a raw IPv4 in SQL parameters', async () => {
        const rawIP = '123.123.123.123';

        await dbManager.registerEvent('test_app', {
            ip: rawIP,
            deviceSize: 'medium',
            userAgent: 'Mozilla/5.0'
        });

        // Verify all intercepted parameters
        interceptedParams.forEach(param => {
            if (typeof param === 'string') {
                const isRawIP = RAW_IPV4_PATTERN.test(param);
                if (isRawIP) {
                    throw new Error(`PRIVACY BREACH DETECTED: Raw IP address "${param}" was found in a database query!`);
                }
            }
        });

        // Ensure the masked version (ending in .0) IS present
        expect(interceptedParams).toContain('123.123.123.0');
    });

    test('Fail-Safe: registerEvent should NEVER include a raw IPv6 in SQL parameters', async () => {
        const rawIP = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';

        await dbManager.registerEvent('test_app', {
            ip: rawIP,
            deviceSize: 'medium',
            userAgent: 'Mozilla/5.0'
        });

        interceptedParams.forEach(param => {
            if (typeof param === 'string' && param.includes(':')) {
                const isRawIP = RAW_IPV6_PATTERN.test(param);
                if (isRawIP) {
                    throw new Error(`PRIVACY BREACH DETECTED: Raw IPv6 address "${param}" was found in a database query!`);
                }
            }
        });

        expect(interceptedParams).toContain('2001:0db8:85a3:0000:0:0:0:0');
    });

    test('Fail-Safe: registerView wrapper should also protect raw IPs', async () => {
        const rawIP = '45.45.45.45';

        await dbManager.registerView('test_app', rawIP, 'US', 'small');

        interceptedParams.forEach(param => {
            if (typeof param === 'string' && RAW_IPV4_PATTERN.test(param)) {
                throw new Error(`PRIVACY BREACH DETECTED in registerView: "${param}" leaked!`);
            }
        });

        expect(interceptedParams).toContain('45.45.45.0');
    });
});
