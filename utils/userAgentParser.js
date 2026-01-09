const UAParser = require('ua-parser-js');

/**
 * Parse user agent string to extract browser, OS, and device information
 */
class UserAgentParser {
    /**
     * Parse user agent string
     * @param {string} userAgent - User agent string from request headers
     * @returns {object} Parsed user agent data
     */
    static parse(userAgent) {
        if (!userAgent) {
            return {
                browser: null,
                browserVersion: null,
                os: null,
                osVersion: null,
                deviceType: null
            };
        }

        const parser = new UAParser(userAgent);
        const result = parser.getResult();

        return {
            browser: result.browser.name || null,
            browserVersion: result.browser.version || null,
            os: result.os.name || null,
            osVersion: result.os.version || null,
            deviceType: this.getDeviceType(result.device.type)
        };
    }

    /**
     * Normalize device type
     * @param {string} type - Device type from ua-parser-js
     * @returns {string} Normalized device type
     */
    static getDeviceType(type) {
        if (!type) return 'desktop';

        const normalized = type.toLowerCase();

        if (normalized === 'mobile') return 'mobile';
        if (normalized === 'tablet') return 'tablet';
        if (normalized === 'wearable') return 'wearable';
        if (normalized === 'smarttv') return 'tv';
        if (normalized === 'console') return 'console';

        return 'desktop';
    }

    /**
     * Get a simple device size category (for backward compatibility)
     * @param {string} userAgent - User agent string
     * @returns {string} Device size: small, medium, or large
     */
    static getDeviceSize(userAgent) {
        const { deviceType } = this.parse(userAgent);

        if (deviceType === 'mobile' || deviceType === 'wearable') return 'small';
        if (deviceType === 'tablet') return 'medium';
        return 'large';
    }
}

module.exports = UserAgentParser;
