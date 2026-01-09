const mysql = require('mysql2/promise');

/**
 * Test Database Setup
 * Creates a test database and populates it with test data
 */
class TestDatabase {
    constructor() {
        this.connection = null;
        this.testDbName = 'viewcounterdb_test';
        this.testAppIds = ['test_app_1', 'test_app_2'];
    }

    /**
     * Initialize test database
     */
    async setup() {
        try {
            // Connect without database
            this.connection = await mysql.createConnection({
                host: '127.0.0.1',
                port: 3306,
                user: 'root',
                password: ''
            });

            // If we're using a real connection, proceed with DB setup
            await this.connection.query(`DROP DATABASE IF EXISTS \`${this.testDbName}\``);
            await this.connection.query(`CREATE DATABASE \`${this.testDbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            await this.connection.query(`USE \`${this.testDbName}\``);

            // Create tables for test apps
            for (const appId of this.testAppIds) {
                await this.connection.query(`
                    CREATE TABLE \`${appId}\` (
                        \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
                        \`ip\` VARCHAR(45) NOT NULL,
                        \`country\` VARCHAR(2) DEFAULT NULL,
                        \`timestamp\` DATETIME NOT NULL,
                        \`devicesize\` VARCHAR(20) NOT NULL,
                        \`page_path\` VARCHAR(500) DEFAULT NULL,
                        \`page_title\` VARCHAR(200) DEFAULT NULL,
                        \`referrer\` VARCHAR(500) DEFAULT NULL,
                        \`referrer_domain\` VARCHAR(200) DEFAULT NULL,
                        \`source_type\` VARCHAR(20) DEFAULT NULL,
                        \`browser\` VARCHAR(50) DEFAULT NULL,
                        \`browser_version\` VARCHAR(20) DEFAULT NULL,
                        \`os\` VARCHAR(50) DEFAULT NULL,
                        \`os_version\` VARCHAR(20) DEFAULT NULL,
                        \`device_type\` VARCHAR(20) DEFAULT NULL,
                        \`session_id\` VARCHAR(64) DEFAULT NULL,
                        \`event_type\` VARCHAR(50) DEFAULT 'pageview',
                        \`event_data\` JSON DEFAULT NULL,
                        INDEX \`idx_timestamp\` (\`timestamp\`),
                        INDEX \`idx_ip_timestamp\` (\`ip\`, \`timestamp\`),
                        INDEX \`idx_country\` (\`country\`),
                        INDEX \`idx_devicesize\` (\`devicesize\`),
                        INDEX \`idx_page_path\` (\`page_path\`(255)),
                        INDEX \`idx_referrer_domain\` (\`referrer_domain\`),
                        INDEX \`idx_source_type\` (\`source_type\`),
                        INDEX \`idx_browser\` (\`browser\`),
                        INDEX \`idx_os\` (\`os\`),
                        INDEX \`idx_device_type\` (\`device_type\`),
                        INDEX \`idx_session_id\` (\`session_id\`),
                        INDEX \`idx_event_type\` (\`event_type\`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);
            }

            // Insert test data
            await this.insertTestData();
        } catch (error) {
            console.warn('[Setup] Real database connection failed, skipping DB setup (assuming mocks will handle it).');
            this.connection = null;
        }
    }

    /**
     * Insert realistic test data
     */
    async insertTestData() {
        const testData = [
            // Pageviews from different sources
            {
                ip: '192.168.1.1',
                country: 'US',
                devicesize: 'large',
                page_path: '/blog/post-1',
                page_title: 'First Blog Post',
                referrer: 'https://www.google.com/search?q=test',
                referrer_domain: 'google.com',
                source_type: 'search',
                browser: 'Chrome',
                browser_version: '120.0',
                os: 'Windows',
                os_version: '10',
                device_type: 'desktop',
                session_id: 'session_001',
                event_type: 'pageview'
            },
            {
                ip: '192.168.1.2',
                country: 'GB',
                devicesize: 'small',
                page_path: '/blog/post-2',
                page_title: 'Second Blog Post',
                referrer: 'https://twitter.com/user/status/123',
                referrer_domain: 'twitter.com',
                source_type: 'social',
                browser: 'Safari',
                browser_version: '17.0',
                os: 'iOS',
                os_version: '17.2',
                device_type: 'mobile',
                session_id: 'session_002',
                event_type: 'pageview'
            },
            {
                ip: '192.168.1.3',
                country: 'CA',
                devicesize: 'medium',
                page_path: '/blog/post-1',
                page_title: 'First Blog Post',
                referrer: null,
                referrer_domain: null,
                source_type: 'direct',
                browser: 'Firefox',
                browser_version: '121.0',
                os: 'Mac OS',
                os_version: '14.2',
                device_type: 'desktop',
                session_id: 'session_003',
                event_type: 'pageview'
            },
            // Custom events
            {
                ip: '192.168.1.1',
                country: 'US',
                devicesize: 'large',
                page_path: '/blog/post-1',
                page_title: 'First Blog Post',
                browser: 'Chrome',
                browser_version: '120.0',
                os: 'Windows',
                os_version: '10',
                device_type: 'desktop',
                session_id: 'session_001',
                event_type: 'button_click',
                event_data: JSON.stringify({ button: 'subscribe', location: 'header' })
            }
        ];

        for (const data of testData) {
            await this.connection.query(
                `INSERT INTO \`test_app_1\` (
                    ip, country, timestamp, devicesize,
                    page_path, page_title, referrer, referrer_domain, source_type,
                    browser, browser_version, os, os_version, device_type,
                    session_id, event_type, event_data
                ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.ip,
                    data.country,
                    data.devicesize,
                    data.page_path,
                    data.page_title,
                    data.referrer,
                    data.referrer_domain,
                    data.source_type,
                    data.browser,
                    data.browser_version,
                    data.os,
                    data.os_version,
                    data.device_type,
                    data.session_id,
                    data.event_type,
                    data.event_data
                ]
            );
        }
    }

    /**
     * Clean up test database
     * @param {boolean} force - Force cleanup even if PERSIST_TEST_DB is set
     */
    async teardown(force = false) {
        if (this.connection) {
            // Check if we should persist the database for debugging
            const shouldPersist = process.env.PERSIST_TEST_DB === 'true' && !force;

            if (shouldPersist) {
                console.log(`\n📌 Test database persisted: ${this.testDbName}`);
                console.log(`   To remove: DROP DATABASE \`${this.testDbName}\`;`);
                console.log(`   To disable persistence: unset PERSIST_TEST_DB\n`);
            } else {
                await this.connection.query(`DROP DATABASE IF EXISTS \`${this.testDbName}\``);
                console.log(`\n🗑️  Test database cleaned up: ${this.testDbName}\n`);
            }

            await this.connection.end();
        }
    }

    /**
     * Get test configuration
     */
    getTestConfig() {
        return {
            dbInfo: {
                mode: 'connect',
                host: '127.0.0.1',
                port: 3306,
                database: this.testDbName,
                user: 'root',
                password: ''
            },
            allowed: {
                appId: this.testAppIds,
                deviceSize: ['small', 'medium', 'large']
            }
        };
    }
}

module.exports = TestDatabase;
