/**
 * Mock Database Driver for tests
 * Mimics mysql2/promise behavior with hardcoded test data
 */
class MockPool {
    constructor(config) {
        this.config = config;
    }

    async query(sql, params = []) {
        console.log(`[MockDB] Query: ${sql.substring(0, 100)}... Params:`, params);

        // Match specific queries and return hardcoded data
        const sqlLower = sql.toLowerCase();

        // Health check / Connection test
        if (sqlLower.includes('select 1')) {
            return [[{ 1: 1 }]];
        }

        // Stats: Unified Total/Unique/Visitors query
        if (sqlLower.includes('count(*) as total_views')) {
            return [[{
                total_views: 150,
                unique_views: 100,
                unique_visitors: 45
            }]];
        }

        // Stats: Total views (old/other queries)
        if (sqlLower.includes('count(*) as total')) {
            return [[{ total: 150 }]];
        }

        // Stats: Unique visitors (old/other queries)
        if (sqlLower.includes('count(distinct ip)')) {
            return [[{ unique_visitors: 45 }]];
        }

        // Stats: Recent (24h)
        if (sqlLower.includes('interval 24 hour')) {
            return [[{ count: 12 }]];
        }

        // Stats: By country
        if (sqlLower.includes('group by country')) {
            return [[
                { country: 'US', count: 80 },
                { country: 'GB', count: 40 },
                { country: 'CA', count: 30 }
            ]];
        }

        // Stats: By device
        if (sqlLower.includes('group by devicesize')) {
            return [[
                { devicesize: 'large', count: 90 },
                { devicesize: 'medium', count: 40 },
                { devicesize: 'small', count: 20 }
            ]];
        }

        // Trends
        if (sqlLower.includes('group by period')) {
            return [[
                { period: '2026-01-01', count: 10 },
                { period: '2026-01-02', count: 15 }
            ]];
        }

        // Referrers: By source
        if (sqlLower.includes('group by source_type')) {
            return [[
                { source_type: 'search', count: 70 },
                { source_type: 'social', count: 50 },
                { source_type: 'direct', count: 30 }
            ]];
        }

        // Referrers: By domain
        if (sqlLower.includes('group by referrer_domain')) {
            return [[
                { referrer_domain: 'google.com', count: 50 },
                { referrer_domain: 'twitter.com', count: 30 }
            ]];
        }

        // Browsers
        if (sqlLower.includes('group by browser')) {
            return [[{ browser: 'Chrome', count: 100 }, { browser: 'Safari', count: 50 }]];
        }

        // OS
        if (sqlLower.includes('group by os')) {
            return [[{ os: 'Windows', count: 80 }, { os: 'Mac OS', count: 70 }]];
        }

        // Device Type
        if (sqlLower.includes('group by device_type')) {
            return [[{ device_type: 'desktop', count: 120 }, { device_type: 'mobile', count: 30 }]];
        }

        // Pages
        if (sqlLower.includes('group by page_path')) {
            return [[
                { page_path: '/home', page_title: 'Home', views: 100 },
                { page_path: '/blog', page_title: 'Blog', views: 50 }
            ]];
        }

        // Session/Recent Views
        if (sqlLower.includes('from `') && (sqlLower.includes('order by timestamp') || sqlLower.includes('where session_id'))) {
            return [[
                { ip: '192.168.1.1', country: 'US', timestamp: new Date(), devicesize: 'large', page_path: '/test', event_type: 'pageview' },
                { ip: '192.168.1.1', country: 'US', timestamp: new Date(), devicesize: 'large', page_path: '/test', event_type: 'click', event_data: { button: 'test' } }
            ]];
        }

        // Duplicate check
        if (sqlLower.includes('select id from') && sqlLower.includes('limit 1')) {
            // Logic: if IP is '127.0.0.1', return empty (not duplicate)
            // If it's the second call for the same IP in duplicate test, return match
            if (params[0] === '127.0.0.1') return [[]];
            if (params[0] === '192.168.1.200') {
                // Return duplicate for the second call in the test
                const ip = params[0];
                this.duplicates = this.duplicates || {};
                if (this.duplicates[ip]) return [[{ id: 1 }]];
                this.duplicates[ip] = true;
                return [[]];
            }
            return [[]];
        }

        // Count queries
        if (sqlLower.includes('select count(*) as count')) {
            return [[{ count: 150 }]];
        }

        // Insert
        if (sqlLower.includes('insert into')) {
            return [{ insertId: Math.floor(Math.random() * 1000) + 1 }];
        }

        return [[]];
    }

    async end() {
        return Promise.resolve();
    }
}

const mockPool = new MockPool();

module.exports = {
    createPool: (config) => new MockPool(config),
    createConnection: async (config) => ({
        query: async (sql) => [[{ 1: 1 }]],
        execute: async (sql) => [[{ 1: 1 }]],
        end: async () => { },
        use: async () => { }
    })
};
