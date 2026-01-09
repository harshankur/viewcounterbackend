const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

/**
 * Database Manager
 * Handles both 'connect' mode (use existing DB) and 'create' mode (auto-create DB and tables)
 */
class DatabaseManager {
    constructor(config) {
        this.config = config;
        this.pool = null;
        this.mode = config.mode || 'connect';
    }

    /**
     * Initialize database connection and optionally create schema
     */
    async initialize(allowedAppIds = []) {
        try {
            if (this.mode === 'create') {
                await this.createDatabaseAndTables(allowedAppIds);
            }

            // Create connection pool
            this.pool = mysql.createPool({
                host: this.config.host,
                port: this.config.port,
                user: this.config.user,
                password: this.config.password,
                database: this.config.database,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0
            });

            // Test connection
            await this.pool.query('SELECT 1');
            console.log(`✓ Database connected (mode: ${this.mode})`);

            return true;
        } catch (error) {
            console.error('Failed to initialize database:', error.message);
            throw error;
        }
    }

    /**
     * Create database and tables (create mode only)
     */
    async createDatabaseAndTables(allowedAppIds) {
        console.log('Creating database and tables...');

        // Connect without database selection first
        const connection = await mysql.createConnection({
            host: this.config.host,
            port: this.config.port,
            user: this.config.user,
            password: this.config.password
        });

        try {
            // Create database
            await connection.query(
                `CREATE DATABASE IF NOT EXISTS \`${this.config.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
            );
            console.log(`✓ Database '${this.config.database}' ready`);

            // Switch to the database
            await connection.query(`USE \`${this.config.database}\``);

            // Create migrations table
            await connection.query(`
                CREATE TABLE IF NOT EXISTS \`_migrations\` (
                    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                    \`version\` VARCHAR(50) NOT NULL UNIQUE,
                    \`applied_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX \`idx_version\` (\`version\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // Create table for each allowed app ID with full schema
            for (const appId of allowedAppIds) {
                await connection.query(`
                    CREATE TABLE IF NOT EXISTS \`${appId}\` (
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
                console.log(`✓ Table '${appId}' ready`);
            }

            // Record migration
            await connection.query(
                `INSERT IGNORE INTO \`_migrations\` (\`version\`) VALUES (?)`,
                ['enhanced_schema_v2']
            );

        } finally {
            await connection.end();
        }
    }

    /**
     * Register a view/event with all tracking data
     */
    async registerEvent(appId, data) {
        if (!this.pool) {
            throw new Error('Database not initialized');
        }

        const {
            ip,
            country,
            deviceSize,
            pagePath,
            pageTitle,
            referrer,
            referrerDomain,
            sourceType,
            browser,
            browserVersion,
            os,
            osVersion,
            deviceType,
            sessionId,
            eventType = 'pageview',
            eventData,
            uniqueWindowHours = 24
        } = data;

        // Check for duplicate within time window if enabled (only for pageviews)
        let isUnique = 1;
        if (uniqueWindowHours > 0 && eventType === 'pageview') {
            const [existing] = await this.pool.query(
                `SELECT id FROM \`${appId}\` 
                 WHERE ip = ? AND event_type = 'pageview' AND timestamp > DATE_SUB(NOW(), INTERVAL ? HOUR) 
                 LIMIT 1`,
                [ip, uniqueWindowHours]
            );

            if (existing.length > 0) {
                isUnique = 0;
            }
        }

        // Insert new event (always insert now to support Total Views)
        const [result] = await this.pool.query(
            `INSERT INTO \`${appId}\` (
                ip, country, timestamp, devicesize,
                page_path, page_title,
                referrer, referrer_domain, source_type,
                browser, browser_version, os, os_version, device_type,
                session_id, event_type, event_data, is_unique
            ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ip,
                country || null,
                deviceSize,
                pagePath || null,
                pageTitle || null,
                referrer || null,
                referrerDomain || null,
                sourceType || null,
                browser || null,
                browserVersion || null,
                os || null,
                osVersion || null,
                deviceType || null,
                sessionId || null,
                eventType,
                eventData ? JSON.stringify(eventData) : null,
                isUnique
            ]
        );

        return {
            duplicate: isUnique === 0,
            insertId: result.insertId,
            isUnique: isUnique === 1
        };
    }

    /**
     * Register a view (backward compatible wrapper)
     */
    async registerView(appId, ip, country, deviceSize, uniqueWindowHours = 24) {
        return this.registerEvent(appId, {
            ip,
            country,
            deviceSize,
            uniqueWindowHours
        });
    }

    /**
     * Get statistics for an app
     */
    async getStats(appId) {
        if (!this.pool) {
            throw new Error('Database not initialized');
        }

        const [totalStats] = await this.pool.query(
            `SELECT 
                COUNT(*) as total_views,
                SUM(CASE WHEN is_unique = 1 THEN 1 ELSE 0 END) as unique_views,
                COUNT(DISTINCT ip) as unique_visitors
             FROM \`${appId}\``
        );

        const stats = totalStats[0];

        const [byCountry] = await this.pool.query(
            `SELECT country, COUNT(*) as count FROM \`${appId}\` 
             WHERE country IS NOT NULL 
             GROUP BY country 
             ORDER BY count DESC 
             LIMIT 10`
        );

        const [byDevice] = await this.pool.query(
            `SELECT devicesize, COUNT(*) as count FROM \`${appId}\` 
             GROUP BY devicesize 
             ORDER BY count DESC`
        );

        const [recent] = await this.pool.query(
            `SELECT COUNT(*) as count FROM \`${appId}\` 
             WHERE timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)`
        );

        return {
            totalViews: stats.total_views,
            uniqueViews: stats.unique_views,
            uniqueVisitors: stats.unique_visitors,
            last24Hours: recent[0].count,
            byCountry: byCountry,
            byDevice: byDevice
        };
    }

    /**
     * Get recent views with pagination
     */
    async getViews(appId, limit = 50, offset = 0) {
        if (!this.pool) {
            throw new Error('Database not initialized');
        }

        const [views] = await this.pool.query(
            `SELECT ip, country, timestamp, devicesize 
             FROM \`${appId}\` 
             ORDER BY timestamp DESC 
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [total] = await this.pool.query(
            `SELECT COUNT(*) as count FROM \`${appId}\``
        );

        return {
            views,
            total: total[0].count,
            limit,
            offset
        };
    }

    /**
     * Get time-based trends
     */
    async getTrends(appId, period = 'daily', days = 30) {
        if (!this.pool) {
            throw new Error('Database not initialized');
        }

        let groupBy;
        if (period === 'hourly') {
            groupBy = 'DATE_FORMAT(timestamp, "%Y-%m-%d %H:00:00")';
        } else if (period === 'weekly') {
            groupBy = 'DATE_FORMAT(timestamp, "%Y-%u")';
        } else {
            groupBy = 'DATE(timestamp)';
        }

        const [trends] = await this.pool.query(
            `SELECT ${groupBy} as period, COUNT(*) as count
             FROM \`${appId}\`
             WHERE timestamp > DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY period
             ORDER BY period ASC`,
            [days]
        );

        return trends;
    }

    /**
     * Get referrer statistics
     */
    async getReferrerStats(appId, limit = 20) {
        if (!this.pool) {
            throw new Error('Database not initialized');
        }

        const [bySource] = await this.pool.query(
            `SELECT source_type, COUNT(*) as count
             FROM \`${appId}\`
             WHERE source_type IS NOT NULL
             GROUP BY source_type
             ORDER BY count DESC`
        );

        const [byDomain] = await this.pool.query(
            `SELECT referrer_domain, COUNT(*) as count
             FROM \`${appId}\`
             WHERE referrer_domain IS NOT NULL
             GROUP BY referrer_domain
             ORDER BY count DESC
             LIMIT ?`,
            [limit]
        );

        return {
            bySource,
            byDomain
        };
    }

    /**
     * Get browser/OS statistics
     */
    async getBrowserStats(appId) {
        if (!this.pool) {
            throw new Error('Database not initialized');
        }

        const [byBrowser] = await this.pool.query(
            `SELECT browser, COUNT(*) as count
             FROM \`${appId}\`
             WHERE browser IS NOT NULL
             GROUP BY browser
             ORDER BY count DESC
             LIMIT 10`
        );

        const [byOS] = await this.pool.query(
            `SELECT os, COUNT(*) as count
             FROM \`${appId}\`
             WHERE os IS NOT NULL
             GROUP BY os
             ORDER BY count DESC
             LIMIT 10`
        );

        const [byDeviceType] = await this.pool.query(
            `SELECT device_type, COUNT(*) as count
             FROM \`${appId}\`
             WHERE device_type IS NOT NULL
             GROUP BY device_type
             ORDER BY count DESC`
        );

        return {
            byBrowser,
            byOS,
            byDeviceType
        };
    }

    /**
     * Get page statistics
     */
    async getPageStats(appId, limit = 20) {
        if (!this.pool) {
            throw new Error('Database not initialized');
        }

        const [pages] = await this.pool.query(
            `SELECT page_path, page_title, COUNT(*) as views
             FROM \`${appId}\`
             WHERE page_path IS NOT NULL
             GROUP BY page_path, page_title
             ORDER BY views DESC
             LIMIT ?`,
            [limit]
        );

        return pages;
    }

    /**
     * Get session details
     */
    async getSessionDetails(appId, sessionId) {
        if (!this.pool) {
            throw new Error('Database not initialized');
        }

        const [events] = await this.pool.query(
            `SELECT *
             FROM \`${appId}\`
             WHERE session_id = ?
             ORDER BY timestamp ASC`,
            [sessionId]
        );

        return events;
    }

    /**
     * Health check
     */
    async healthCheck() {
        if (!this.pool) {
            return { healthy: false, error: 'Pool not initialized' };
        }

        try {
            await this.pool.query('SELECT 1');
            return { healthy: true };
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }

    /**
     * Gracefully close all connections
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('✓ Database connections closed');
        }
    }
}

module.exports = DatabaseManager;
