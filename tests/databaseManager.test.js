const DatabaseManager = require('../db/DatabaseManager');

// Mock mysql2/promise
jest.mock('mysql2/promise', () => require('./dbMock'));

describe('DatabaseManager', () => {
    let dbManager;
    const testConfig = {
        mode: 'connect',
        host: '127.0.0.1',
        port: 3306,
        database: 'viewcounterdb_test',
        user: 'root',
        password: ''
    };

    beforeAll(async () => {
        dbManager = new DatabaseManager(testConfig);
        await dbManager.initialize(['test_app_1']);
    });

    afterAll(async () => {
        await dbManager.close();
    });

    describe('registerEvent()', () => {
        test('should register a pageview event', async () => {
            const result = await dbManager.registerEvent('test_app_1', {
                ip: '192.168.1.100',
                country: 'US',
                deviceSize: 'large',
                pagePath: '/test',
                pageTitle: 'Test Page',
                browser: 'Chrome',
                os: 'Windows',
                deviceType: 'desktop',
                eventType: 'pageview',
                uniqueWindowHours: 0 // Disable duplicate check for test
            });

            expect(result.duplicate).toBe(false);
            expect(result.insertId).toBeGreaterThan(0);
        });

        test('should register a custom event', async () => {
            const result = await dbManager.registerEvent('test_app_1', {
                ip: '192.168.1.101',
                country: 'GB',
                deviceSize: 'medium',
                eventType: 'button_click',
                eventData: { button: 'subscribe' },
                uniqueWindowHours: 0
            });

            expect(result.duplicate).toBe(false);
            expect(result.insertId).toBeGreaterThan(0);
        });

        test('should detect duplicate views within time window', async () => {
            const eventData = {
                ip: '192.168.1.200',
                country: 'CA',
                deviceSize: 'small',
                eventType: 'pageview',
                uniqueWindowHours: 24
            };

            // First view
            const result1 = await dbManager.registerEvent('test_app_1', eventData);
            expect(result1.duplicate).toBe(false);

            // Duplicate view within window
            const result2 = await dbManager.registerEvent('test_app_1', eventData);
            expect(result2.duplicate).toBe(true);
        });
    });

    describe('getStats()', () => {
        test('should return statistics', async () => {
            const stats = await dbManager.getStats('test_app_1');

            expect(stats).toHaveProperty('totalViews');
            expect(stats).toHaveProperty('uniqueViews');
            expect(stats).toHaveProperty('uniqueVisitors');
            expect(stats).toHaveProperty('last24Hours');
            expect(stats).toHaveProperty('byCountry');
            expect(stats).toHaveProperty('byDevice');
            expect(typeof stats.totalViews).toBe('number');
        });
    });

    describe('getTrends()', () => {
        test('should return daily trends', async () => {
            const trends = await dbManager.getTrends('test_app_1', 'daily', 7);

            expect(Array.isArray(trends)).toBe(true);
            trends.forEach(trend => {
                expect(trend).toHaveProperty('period');
                expect(trend).toHaveProperty('count');
            });
        });

        test('should return hourly trends', async () => {
            const trends = await dbManager.getTrends('test_app_1', 'hourly', 1);
            expect(Array.isArray(trends)).toBe(true);
        });

        test('should return weekly trends', async () => {
            const trends = await dbManager.getTrends('test_app_1', 'weekly', 12);
            expect(Array.isArray(trends)).toBe(true);
        });
    });

    describe('getReferrerStats()', () => {
        test('should return referrer statistics', async () => {
            const stats = await dbManager.getReferrerStats('test_app_1', 10);

            expect(stats).toHaveProperty('bySource');
            expect(stats).toHaveProperty('byDomain');
            expect(Array.isArray(stats.bySource)).toBe(true);
            expect(Array.isArray(stats.byDomain)).toBe(true);
        });
    });

    describe('getBrowserStats()', () => {
        test('should return browser statistics', async () => {
            const stats = await dbManager.getBrowserStats('test_app_1');

            expect(stats).toHaveProperty('byBrowser');
            expect(stats).toHaveProperty('byOS');
            expect(stats).toHaveProperty('byDeviceType');
            expect(Array.isArray(stats.byBrowser)).toBe(true);
            expect(Array.isArray(stats.byOS)).toBe(true);
            expect(Array.isArray(stats.byDeviceType)).toBe(true);
        });
    });

    describe('getPageStats()', () => {
        test('should return page statistics', async () => {
            const pages = await dbManager.getPageStats('test_app_1', 20);

            expect(Array.isArray(pages)).toBe(true);
            pages.forEach(page => {
                expect(page).toHaveProperty('page_path');
                expect(page).toHaveProperty('views');
            });
        });
    });

    describe('getSessionDetails()', () => {
        test('should return session events', async () => {
            // Register events with same session
            await dbManager.registerEvent('test_app_1', {
                ip: '192.168.1.250',
                country: 'US',
                deviceSize: 'large',
                sessionId: 'test_session_db',
                eventType: 'pageview',
                uniqueWindowHours: 0
            });

            await dbManager.registerEvent('test_app_1', {
                ip: '192.168.1.250',
                country: 'US',
                deviceSize: 'large',
                sessionId: 'test_session_db',
                eventType: 'button_click',
                uniqueWindowHours: 0
            });

            const events = await dbManager.getSessionDetails('test_app_1', 'test_session_db');

            expect(Array.isArray(events)).toBe(true);
            expect(events.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('getViews()', () => {
        test('should return paginated views', async () => {
            const result = await dbManager.getViews('test_app_1', 5, 0);

            expect(result).toHaveProperty('views');
            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('limit');
            expect(result).toHaveProperty('offset');
            expect(Array.isArray(result.views)).toBe(true);
            expect(result.limit).toBe(5);
        });
    });

    describe('healthCheck()', () => {
        test('should return healthy status', async () => {
            const health = await dbManager.healthCheck();

            expect(health.healthy).toBe(true);
        });
    });
});
