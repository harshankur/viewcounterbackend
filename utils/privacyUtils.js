const crypto = require('crypto');

class PrivacyUtils {
    /**
     * Masks the IP address to be non-identifiable.
     * IPv4: Masks the last octet (e.g., 1.2.3.4 -> 1.2.3.0)
     * IPv6: Masks the last 64 bits (interface identifier)
     * @param {string} ip The raw IP address
     * @returns {string} The masked IP
     */
    static maskIP(ip) {
        if (!ip) return '0.0.0.0';

        // Handle IPv4-mapped IPv6 (::ffff:127.0.0.1)
        if (ip.startsWith('::ffff:')) {
            const ipv4 = ip.split(':').pop();
            return `::ffff:${this.maskIPv4(ipv4)}`;
        }

        if (ip.includes(':')) {
            return this.maskIPv6(ip);
        }

        return this.maskIPv4(ip);
    }

    static maskIPv4(ip) {
        const parts = ip.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
        }
        return ip;
    }

    static maskIPv6(ip) {
        const parts = ip.split(':');
        // Mask the last 4 groups (64 bits)
        if (parts.length >= 4) {
            return parts.slice(0, 4).join(':') + ':0:0:0:0';
        }
        return ip;
    }

    /**
     * Generates a transient hash for a visitor.
     * Uses Raw IP + User Agent + Daily Salt.
     * @param {string} ip Raw IP address
     * @param {string} userAgent Raw User-Agent string
     * @returns {string} SHA-256 hash
     */
    static generateVisitorHash(ip, userAgent) {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        // Note: In a real prod environment, we'd add an extra server-side secret/salt here
        // For now, the combination of Raw IP, UA, and Date provides a transient ID.
        const input = `${ip}|${userAgent}|${date}`;
        return crypto.createHash('sha256').update(input).digest('hex');
    }
}

module.exports = PrivacyUtils;
