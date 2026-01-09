const URL = require('url-parse');

/**
 * Parse referrer URLs to extract domain and source type
 */
class ReferrerParser {
    /**
     * Parse referrer URL
     * @param {string} referrer - Referrer URL from request headers
     * @returns {object} Parsed referrer data
     */
    static parse(referrer) {
        if (!referrer || referrer === '') {
            return {
                referrer: null,
                referrerDomain: null,
                sourceType: 'direct'
            };
        }

        try {
            const url = new URL(referrer);
            const domain = url.hostname || null;
            const sourceType = this.getSourceType(domain, referrer);

            return {
                referrer: referrer.substring(0, 500), // Truncate to fit DB
                referrerDomain: domain ? domain.substring(0, 200) : null,
                sourceType
            };
        } catch (error) {
            return {
                referrer: referrer.substring(0, 500),
                referrerDomain: null,
                sourceType: 'unknown'
            };
        }
    }

    /**
     * Determine source type based on referrer domain
     * @param {string} domain - Referrer domain
     * @param {string} fullUrl - Full referrer URL
     * @returns {string} Source type
     */
    static getSourceType(domain, fullUrl) {
        if (!domain) return 'direct';

        const lowerDomain = domain.toLowerCase();

        // Search engines
        if (this.isSearchEngine(lowerDomain)) return 'search';

        // Social media
        if (this.isSocialMedia(lowerDomain)) return 'social';

        // Email clients
        if (this.isEmail(lowerDomain)) return 'email';

        // Ads/campaigns (check for utm parameters)
        if (fullUrl.includes('utm_source') || fullUrl.includes('utm_medium')) {
            return 'campaign';
        }

        // Everything else is referral
        return 'referral';
    }

    /**
     * Check if domain is a search engine
     */
    static isSearchEngine(domain) {
        const searchEngines = [
            'google', 'bing', 'yahoo', 'duckduckgo', 'baidu',
            'yandex', 'ask', 'aol', 'ecosia', 'qwant'
        ];
        return searchEngines.some(engine => domain.includes(engine));
    }

    /**
     * Check if domain is social media
     */
    static isSocialMedia(domain) {
        const socialMedia = [
            'facebook', 'twitter', 'x.com', 'instagram', 'linkedin',
            'reddit', 'pinterest', 'tiktok', 'youtube', 'snapchat',
            'whatsapp', 'telegram', 'discord', 'tumblr', 'vk.com',
            'weibo', 'line.me', 'mastodon'
        ];
        return socialMedia.some(social => domain.includes(social));
    }

    /**
     * Check if domain is email client
     */
    static isEmail(domain) {
        const emailClients = [
            'mail.google', 'outlook', 'yahoo.com/mail',
            'mail.yahoo', 'protonmail', 'mail.aol'
        ];
        return emailClients.some(email => domain.includes(email));
    }

    /**
     * Get top referrers summary
     * @param {Array} referrers - Array of referrer objects from DB
     * @returns {object} Summarized referrer stats
     */
    static summarizeReferrers(referrers) {
        const bySource = {};
        const byDomain = {};

        referrers.forEach(ref => {
            const sourceType = ref.sourceType || 'unknown';
            bySource[sourceType] = (bySource[sourceType] || 0) + 1;

            if (ref.referrerDomain) {
                byDomain[ref.referrerDomain] = (byDomain[ref.referrerDomain] || 0) + 1;
            }
        });

        return {
            bySource: Object.entries(bySource)
                .map(([source, count]) => ({ source, count }))
                .sort((a, b) => b.count - a.count),
            byDomain: Object.entries(byDomain)
                .map(([domain, count]) => ({ domain, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 20) // Top 20 domains
        };
    }
}

module.exports = ReferrerParser;
