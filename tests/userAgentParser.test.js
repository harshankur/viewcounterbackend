const UserAgentParser = require('../utils/userAgentParser');

describe('UserAgentParser', () => {
    describe('parse()', () => {
        test('should parse Chrome on Windows', () => {
            const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            const result = UserAgentParser.parse(ua);

            expect(result.browser).toBe('Chrome');
            expect(result.os).toBe('Windows');
            expect(result.deviceType).toBe('desktop');
        });

        test('should parse Safari on iOS', () => {
            const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
            const result = UserAgentParser.parse(ua);

            expect(result.browser).toBe('Mobile Safari');
            expect(result.os).toBe('iOS');
            expect(result.deviceType).toBe('mobile');
        });

        test('should parse Firefox on Linux', () => {
            const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0';
            const result = UserAgentParser.parse(ua);

            expect(result.browser).toBe('Firefox');
            expect(result.os).toBe('Linux');
            expect(result.deviceType).toBe('desktop');
        });

        test('should handle null user agent', () => {
            const result = UserAgentParser.parse(null);

            expect(result.browser).toBeNull();
            expect(result.os).toBeNull();
            expect(result.deviceType).toBeNull();
        });
    });

    describe('getDeviceSize()', () => {
        test('should return small for mobile', () => {
            const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)';
            expect(UserAgentParser.getDeviceSize(ua)).toBe('small');
        });

        test('should return medium for tablet', () => {
            const ua = 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X)';
            expect(UserAgentParser.getDeviceSize(ua)).toBe('medium');
        });

        test('should return large for desktop', () => {
            const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
            expect(UserAgentParser.getDeviceSize(ua)).toBe('large');
        });
    });
});
