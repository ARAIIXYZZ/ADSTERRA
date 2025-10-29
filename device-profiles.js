/**
 * Advanced Device Profile Management
 * Realistic device simulation with proper headers and behavior
 */

class DeviceProfiles {
    static profiles = {
        desktop: [
            {
                name: 'Windows Chrome',
                type: 'desktop',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport: { width: 1920, height: 1080 },
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                acceptLanguage: 'en-US,en;q=0.9',
                acceptEncoding: 'gzip, deflate, br',
                deviceMemory: 8,
                hardwareConcurrency: 12,
                platform: 'Win32',
                connection: { effectiveType: '4g', downlink: 10, rtt: 50 }
            },
            {
                name: 'Windows Firefox',
                type: 'desktop',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
                viewport: { width: 1366, height: 768 },
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                acceptLanguage: 'en-US,en;q=0.5',
                acceptEncoding: 'gzip, deflate, br',
                deviceMemory: 4,
                hardwareConcurrency: 8,
                platform: 'Win32',
                connection: { effectiveType: '4g', downlink: 5, rtt: 100 }
            },
            {
                name: 'Mac Safari',
                type: 'desktop',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
                viewport: { width: 1440, height: 900 },
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                acceptLanguage: 'en-US,en;q=0.9',
                acceptEncoding: 'gzip, deflate, br',
                deviceMemory: 16,
                hardwareConcurrency: 8,
                platform: 'MacIntel',
                connection: { effectiveType: '4g', downlink: 8, rtt: 75 }
            },
            {
                name: 'Linux Chrome',
                type: 'desktop',
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport: { width: 1280, height: 720 },
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                acceptLanguage: 'en-US,en;q=0.9',
                acceptEncoding: 'gzip, deflate, br',
                deviceMemory: 8,
                hardwareConcurrency: 6,
                platform: 'Linux x86_64',
                connection: { effectiveType: '4g', downlink: 6, rtt: 120 }
            }
        ],
        mobile: [
            {
                name: 'iPhone Safari',
                type: 'mobile',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
                viewport: { width: 390, height: 844 },
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                acceptLanguage: 'en-US,en;q=0.9',
                acceptEncoding: 'gzip, deflate, br',
                deviceMemory: 4,
                hardwareConcurrency: 6,
                platform: 'iPhone',
                connection: { effectiveType: '4g', downlink: 5, rtt: 80 }
            },
            {
                name: 'Android Chrome',
                type: 'mobile',
                userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.210 Mobile Safari/537.36',
                viewport: { width: 412, height: 915 },
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                acceptLanguage: 'en-US,en;q=0.9',
                acceptEncoding: 'gzip, deflate, br',
                deviceMemory: 8,
                hardwareConcurrency: 8,
                platform: 'Linux armv8l',
                connection: { effectiveType: '4g', downlink: 4, rtt: 100 }
            },
            {
                name: 'Samsung Mobile',
                type: 'mobile',
                userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                viewport: { width: 384, height: 854 },
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                acceptLanguage: 'en-US,en;q=0.9',
                acceptEncoding: 'gzip, deflate, br',
                deviceMemory: 12,
                hardwareConcurrency: 8,
                platform: 'Linux armv8l',
                connection: { effectiveType: '5g', downlink: 10, rtt: 40 }
            },
            {
                name: 'Google Pixel',
                type: 'mobile',
                userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                viewport: { width: 412, height: 915 },
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                acceptLanguage: 'en-US,en;q=0.9',
                acceptEncoding: 'gzip, deflate, br',
                deviceMemory: 8,
                hardwareConcurrency: 8,
                platform: 'Linux armv8l',
                connection: { effectiveType: '5g', downlink: 8, rtt: 50 }
            }
        ],
        tablet: [
            {
                name: 'iPad Safari',
                type: 'tablet',
                userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
                viewport: { width: 1024, height: 1366 },
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                acceptLanguage: 'en-US,en;q=0.9',
                acceptEncoding: 'gzip, deflate, br',
                deviceMemory: 4,
                hardwareConcurrency: 6,
                platform: 'iPad',
                connection: { effectiveType: 'wifi', downlink: 20, rtt: 30 }
            },
            {
                name: 'Android Tablet',
                type: 'tablet',
                userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-X810) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport: { width: 1280, height: 800 },
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                acceptLanguage: 'en-US,en;q=0.9',
                acceptEncoding: 'gzip, deflate, br',
                deviceMemory: 8,
                hardwareConcurrency: 8,
                platform: 'Linux armv8l',
                connection: { effectiveType: 'wifi', downlink: 15, rtt: 40 }
            },
            {
                name: 'Surface Tablet',
                type: 'tablet',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Tablet; PC) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport: { width: 1368, height: 912 },
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                acceptLanguage: 'en-US,en;q=0.9',
                acceptEncoding: 'gzip, deflate, br',
                deviceMemory: 8,
                hardwareConcurrency: 8,
                platform: 'Win32',
                connection: { effectiveType: 'wifi', downlink: 12, rtt: 50 }
            }
        ]
    };

    static getRandomProfile(deviceType = 'random') {
        let targetType = deviceType;
        
        if (deviceType === 'random') {
            // Weighted distribution based on real-world usage
            const types = [
                { type: 'desktop', weight: 0.55 },
                { type: 'mobile', weight: 0.40 },
                { type: 'tablet', weight: 0.05 }
            ];
            
            let random = Math.random();
            for (const { type, weight } of types) {
                random -= weight;
                if (random <= 0) {
                    targetType = type;
                    break;
                }
            }
        }
        
        const profiles = this.profiles[targetType] || this.profiles.desktop;
        const randomIndex = Math.floor(Math.random() * profiles.length);
        
        return {
            ...profiles[randomIndex],
            selectedType: targetType
        };
    }

    static getProfileForCountry(country, deviceType = 'random') {
        const profile = this.getRandomProfile(deviceType);
        
        // Adjust language based on country
        if (country && profile.acceptLanguage.startsWith('en-US')) {
            const countryLanguages = {
                'us': 'en-US,en;q=0.9',
                'gb': 'en-GB,en;q=0.9',
                'ca': 'en-CA,en;q=0.9,fr;q=0.8',
                'de': 'de-DE,de;q=0.9,en;q=0.8',
                'fr': 'fr-FR,fr;q=0.9,en;q=0.8',
                'sa': 'ar-SA,ar;q=0.9,en;q=0.8',
                'ie': 'en-IE,en;q=0.9',
                'au': 'en-AU,en;q=0.9'
            };
            
            profile.acceptLanguage = countryLanguages[country] || profile.acceptLanguage;
        }
        
        return profile;
    }

    static getAllProfiles() {
        return this.profiles;
    }

    static getProfilesByType(type) {
        return this.profiles[type] || [];
    }

    static validateProfile(profile) {
        const required = [
            'name', 'type', 'userAgent', 'viewport', 
            'accept', 'acceptLanguage'
        ];
        
        return required.every(field => 
            profile[field] && typeof profile[field] === 'string'
        );
    }

    static generateCustomProfile(customSettings = {}) {
        const baseProfile = this.getRandomProfile(customSettings.type);
        
        return {
            ...baseProfile,
            ...customSettings,
            isCustom: true
        };
    }

    static getProfileStats() {
        const stats = {};
        
        for (const type in this.profiles) {
            stats[type] = this.profiles[type].length;
        }
        
        stats.total = Object.values(stats).reduce((sum, count) => sum + count, 0);
        
        return stats;
    }
}

// Export device profiles for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeviceProfiles;
}
