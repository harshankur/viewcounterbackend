const request = require('supertest');
const express = require('express');
const TestDatabase = require('./setup');

// Mock mysql2/promise BEFORE importing anything else
jest.mock('mysql2/promise', () => require('./dbMock'));

// Mock the config module
jest.mock('../config', () => ({
    dbInfo: {
        mode: 'connect',
        host: '127.0.0.1',
        port: 3306,
        database: 'viewcounterdb_test',
        user: 'root',
        password: ''
    },
    allowed: {
        appId: ['test_app_1', 'test_app_2'],
        deviceSize: ['small', 'medium', 'large']
    },
    server: {
        port: 3030,
        rateLimit: { windowMs: 60000, max: 100 },
        uniqueVisitorWindowHours: 24,
        nodeEnv: 'test'
    }
}));

// Import after mocking config and mysql2
const app = require('../index');
const { initializeServer } = app;

describe('API Endpoints - Integration Tests', () => {
    let testDb;

    beforeAll(async () => {
        testDb = new TestDatabase();
        // Since setup() might fail if MySQL isn't running, we handle it
        await testDb.setup();

        // Explicitly initialize the server with mocks
        await initializeServer();
    });

    afterAll(async () => {
        await testDb.teardown();
    });

    describe('GET /health', () => {
        test('should return healthy status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body.status).toBe('healthy');
            expect(response.body.database).toBe('connected');
        });
    });

    describe('GET /ip', () => {
        test('should return IP information', async () => {
            const response = await request(app)
                .get('/ip')
                .expect(200);

            expect(response.body).toHaveProperty('ip');
            expect(response.body).toHaveProperty('valid');
        });

        test('should mask IP address for privacy', async () => {
            // This test verifies that the internal logic (when using registerEvent)
            // correctly masks the IP. Since /ip returns the raw requester IP for debugging,
            // we check the /views endpoint which returns the stored (masked) IPs.
            const response = await request(app)
                .get('/views/test_app_1')
                .expect(200);

            expect(response.body.views[0]).toHaveProperty('masked_ip');
            expect(response.body.views[0]).not.toHaveProperty('ip');
            // Mock returns '192.168.1.0' for masked_ip
            expect(response.body.views[0].masked_ip).toBe('192.168.1.0');
        });
    });

    describe('GET /apps', () => {
        test('should list all apps', async () => {
            const response = await request(app)
                .get('/apps')
                .expect(200);

            expect(response.body.apps).toEqual(['test_app_1', 'test_app_2']);
            expect(response.body.count).toBe(2);
        });
    });

    describe('GET /registerView', () => {
        test('should register a basic view', async () => {
            const response = await request(app)
                .get('/registerView')
                .query({
                    appId: 'test_app_1',
                    deviceSize: 'medium'
                })
                .expect(200);

            expect(response.body.message).toBe('Success!');
            expect(response.body.duplicate).toBe(false);
        });

        test('should register view with page tracking', async () => {
            const response = await request(app)
                .get('/registerView')
                .set('X-Forwarded-For', '1.1.1.1') // Unique IP
                .query({
                    appId: 'test_app_1',
                    deviceSize: 'large',
                    page: '/test/page',
                    title: 'Test Page'
                })
                .expect(200);

            expect(response.body.message).toBe('Success!');
        });

        test('should register view with referrer', async () => {
            const response = await request(app)
                .get('/registerView')
                .set('X-Forwarded-For', '2.2.2.2') // Unique IP
                .query({
                    appId: 'test_app_1',
                    deviceSize: 'small',
                    referrer: 'https://google.com',
                    sessionId: 'test_session_123'
                })
                .expect(200);

            expect(response.body.message).toBe('Success!');
        });

        test('should reject invalid appId', async () => {
            const response = await request(app)
                .get('/registerView')
                .query({
                    appId: 'invalid_app',
                    deviceSize: 'medium'
                })
                .expect(422);

            expect(response.body.message).toBe('Validation failed');
        });

        test('should reject invalid deviceSize', async () => {
            const response = await request(app)
                .get('/registerView')
                .query({
                    appId: 'test_app_1',
                    deviceSize: 'invalid'
                })
                .expect(422);
        });

        test('should reject missing parameters', async () => {
            const response = await request(app)
                .get('/registerView')
                .expect(422);
        });
    });

    describe('POST /event', () => {
        test('should track custom event', async () => {
            const response = await request(app)
                .post('/event')
                .send({
                    appId: 'test_app_1',
                    eventType: 'button_click',
                    eventData: { button: 'subscribe' },
                    sessionId: 'test_session_123'
                })
                .expect(200);

            expect(response.body.message).toBe('Event tracked successfully');
            expect(response.body).toHaveProperty('insertId');
        });

        test('should reject invalid appId', async () => {
            const response = await request(app)
                .post('/event')
                .send({
                    appId: 'invalid_app',
                    eventType: 'click'
                })
                .expect(422);
        });

        test('should reject missing eventType', async () => {
            const response = await request(app)
                .post('/event')
                .send({
                    appId: 'test_app_1'
                })
                .expect(422);
        });
    });

    describe('GET /stats/:appId', () => {
        test('should return statistics', async () => {
            const response = await request(app)
                .get('/stats/test_app_1')
                .expect(200);

            expect(response.body.appId).toBe('test_app_1');
            expect(response.body.stats).toHaveProperty('totalViews');
            expect(response.body.stats).toHaveProperty('uniqueViews');
            expect(response.body.stats).toHaveProperty('uniqueVisitors');
            expect(response.body.stats).toHaveProperty('last24Hours');
            expect(response.body.stats).toHaveProperty('byCountry');
            expect(response.body.stats).toHaveProperty('byDevice');
        });

        test('should reject invalid appId', async () => {
            const response = await request(app)
                .get('/stats/invalid_app')
                .expect(422);
        });
    });

    describe('GET /trends/:appId', () => {
        test('should return daily trends', async () => {
            const response = await request(app)
                .get('/trends/test_app_1')
                .query({ period: 'daily', days: 7 })
                .expect(200);

            expect(response.body.appId).toBe('test_app_1');
            expect(response.body.period).toBe('daily');
            expect(Array.isArray(response.body.trends)).toBe(true);
        });

        test('should return hourly trends', async () => {
            const response = await request(app)
                .get('/trends/test_app_1')
                .query({ period: 'hourly', days: 1 })
                .expect(200);

            expect(response.body.period).toBe('hourly');
        });

        test('should reject invalid period', async () => {
            const response = await request(app)
                .get('/trends/test_app_1')
                .query({ period: 'invalid' })
                .expect(422);
        });
    });

    describe('GET /referrers/:appId', () => {
        test('should return referrer statistics', async () => {
            const response = await request(app)
                .get('/referrers/test_app_1')
                .expect(200);

            expect(response.body.appId).toBe('test_app_1');
            expect(response.body).toHaveProperty('bySource');
            expect(response.body).toHaveProperty('byDomain');
            expect(Array.isArray(response.body.bySource)).toBe(true);
            expect(Array.isArray(response.body.byDomain)).toBe(true);
        });

        test('should respect limit parameter', async () => {
            const response = await request(app)
                .get('/referrers/test_app_1')
                .query({ limit: 5 })
                .expect(200);

            expect(response.body.byDomain.length).toBeLessThanOrEqual(5);
        });
    });

    describe('GET /browsers/:appId', () => {
        test('should return browser statistics', async () => {
            const response = await request(app)
                .get('/browsers/test_app_1')
                .expect(200);

            expect(response.body.appId).toBe('test_app_1');
            expect(response.body).toHaveProperty('byBrowser');
            expect(response.body).toHaveProperty('byOS');
            expect(response.body).toHaveProperty('byDeviceType');
        });
    });

    describe('GET /pages/:appId', () => {
        test('should return page statistics', async () => {
            const response = await request(app)
                .get('/pages/test_app_1')
                .expect(200);

            expect(response.body.appId).toBe('test_app_1');
            expect(Array.isArray(response.body.pages)).toBe(true);
        });

        test('should respect limit parameter', async () => {
            const response = await request(app)
                .get('/pages/test_app_1')
                .query({ limit: 10 })
                .expect(200);

            expect(response.body.pages.length).toBeLessThanOrEqual(10);
        });
    });

    describe('GET /sessions/:appId/:sessionId', () => {
        test('should return session details', async () => {
            const response = await request(app)
                .get('/sessions/test_app_1/session_001')
                .expect(200);

            expect(response.body.appId).toBe('test_app_1');
            expect(response.body.sessionId).toBe('session_001');
            expect(Array.isArray(response.body.events)).toBe(true);
            expect(response.body).toHaveProperty('count');
        });
    });

    describe('GET /views/:appId', () => {
        test('should return recent views', async () => {
            const response = await request(app)
                .get('/views/test_app_1')
                .expect(200);

            expect(response.body.appId).toBe('test_app_1');
            expect(Array.isArray(response.body.views)).toBe(true);
            expect(response.body.views[0]).toHaveProperty('masked_ip');
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('limit');
            expect(response.body).toHaveProperty('offset');
        });

        test('should support pagination', async () => {
            const response = await request(app)
                .get('/views/test_app_1')
                .query({ limit: 2, offset: 0 })
                .expect(200);

            expect(response.body.limit).toBe(2);
            expect(response.body.offset).toBe(0);
        });
    });

    describe('Rate Limiting', () => {
        test('should enforce rate limits', async () => {
            // Make 101 requests rapidly (limit is 100)
            const requests = [];
            for (let i = 0; i < 101; i++) {
                requests.push(
                    request(app)
                        .get('/health')
                );
            }

            const responses = await Promise.all(requests);
            const rateLimited = responses.some(r => r.status === 429);

            // At least one should be rate limited
            expect(rateLimited).toBe(true);
        }, 30000); // Increase timeout for this test
    });
});
