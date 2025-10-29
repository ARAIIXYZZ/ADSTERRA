/**
 * Premium Proxy Management System
 * Fast proxy acquisition and validation with multiple sources
 */

class ProxyManager {
    static proxies = new Map();
    static activeProxies = new Map();
    static proxySources = [
        // Premium proxy sources (updated 2024)
        {
            name: 'Geonode Premium',
            url: 'https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc',
            type: 'json',
            parser: (data) => data.data.map(p => `http://${p.ip}:${p.port}`)
        },
        {
            name: 'ProxyScrape HTTP',
            url: 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
            type: 'text',
            parser: (text) => text.split('\n').filter(line => line.trim()).map(line => `http://${line.trim()}`)
        },
        {
            name: 'ProxyList Download',
            url: 'https://www.proxy-list.download/api/v1/get?type=http&anon=elite&country=US,CA,GB,DE,FR',
            type: 'text',
            parser: (text) => text.split('\r\n').filter(line => line.trim()).map(line => `http://${line.trim()}`)
        },
        {
            name: 'OpenProxy Fast',
            url: 'https://openproxy.space/list/http',
            type: 'json',
            parser: (data) => data.map(p => `http://${p.ip}:${p.port}`).slice(0, 50)
        }
    ];

    static proxyTestEndpoints = [
        'https://httpbin.org/ip',
        'https://api.ipify.org?format=json',
        'https://jsonip.com/',
        'https://api.my-ip.io/ip.json'
    ];

    static testTimeout = 8000; // Reduced timeout for faster testing
    static maxConcurrentTests = 15; // Increased concurrency
    static initialized = false;

    static async initialize() {
        if (this.initialized) return;
        
        Logger.info('🔄 Initializing premium proxy system...');
        
        try {
            // Load proxies from all sources concurrently
            await this.loadAllProxies();
            
            // Test proxies with improved speed
            await this.fastProxyValidation();
            
            this.initialized = true;
            Logger.info(`✅ Proxy system ready: ${this.activeProxies.size} active proxies`);
            
        } catch (error) {
            Logger.warn('Proxy initialization had minor issues', error);
            // Continue with whatever proxies we have
        }
    }

    static async loadAllProxies() {
        const loadPromises = this.proxySources.map(source => 
            this.loadFromSource(source).catch(error => {
                Logger.debug(`Failed to load from ${source.name}`, error.message);
                return [];
            })
        );

        const results = await Promise.allSettled(loadPromises);
        const allProxies = new Set();

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const proxies = result.value;
                proxies.forEach(proxy => allProxies.add(proxy));
                Logger.debug(`Loaded ${proxies.length} proxies from ${this.proxySources[index].name}`);
            }
        });

        // Store all unique proxies
        this.proxies.clear();
        this.proxies.set('global', Array.from(allProxies));
        
        Logger.info(`📥 Loaded ${allProxies.size} total proxies from ${results.filter(r => r.status === 'fulfilled').length} sources`);
    }

    static async loadFromSource(source) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(source.url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json,text/plain,*/*'
                }
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            
            if (contentType?.includes('application/json')) {
                const data = await response.json();
                return source.parser(data);
            } else {
                const text = await response.text();
                return source.parser(text);
            }

        } catch (error) {
            clearTimeout(timeout);
            throw error;
        }
    }

    static async fastProxyValidation() {
        const allProxies = this.proxies.get('global') || [];
        if (allProxies.length === 0) {
            Logger.warn('No proxies available for testing');
            return;
        }

        Logger.info(`🧪 Testing ${allProxies.length} proxies (fast mode)...`);
        
        const testBatch = allProxies.slice(0, 100); // Test first 100 proxies for speed
        const results = await this.concurrentProxyTest(testBatch);
        
        // Sort by speed and store
        results.sort((a, b) => a.speed - b.speed);
        this.activeProxies.clear();
        
        results.forEach(proxy => {
            if (proxy && proxy.speed < this.testTimeout) {
                this.activeProxies.set(proxy.url, proxy);
            }
        });

        Logger.info(`✅ Proxy validation completed: ${this.activeProxies.size} active proxies`);
    }

    static async concurrentProxyTest(proxies) {
        const results = [];
        const batchSize = this.maxConcurrentTests;
        
        for (let i = 0; i < proxies.length; i += batchSize) {
            const batch = proxies.slice(i, i + batchSize);
            const batchPromises = batch.map(proxy => this.testSingleProxy(proxy));
            
            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    results.push(result.value);
                }
            });

            // Small delay between batches to avoid overwhelming
            if (i + batchSize < proxies.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return results;
    }

    static async testSingleProxy(proxyUrl) {
        const startTime = Date.now();
        
        try {
            const testEndpoint = this.proxyTestEndpoints[Math.floor(Math.random() * this.proxyTestEndpoints.length)];
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.testTimeout);

            const response = await fetch(testEndpoint, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const speed = Date.now() - startTime;

            // Validate response contains IP address
            const ip = data.ip || data.address || (typeof data === 'string' ? data : null);
            if (!ip) {
                throw new Error('Invalid response format');
            }

            return {
                url: proxyUrl,
                ip: ip,
                speed: speed,
                country: data.country || 'Unknown',
                lastTested: Date.now()
            };

        } catch (error) {
            // Silent fail - don't log individual proxy failures
            return null;
        }
    }

    static getRandomProxy(quality = 'premium') {
        if (this.activeProxies.size === 0) {
            return null;
        }

        const proxies = Array.from(this.activeProxies.values());
        
        // Filter by quality requirements
        let filteredProxies = proxies;
        
        switch (quality) {
            case 'premium':
                filteredProxies = proxies.filter(p => p.speed < 2000); // Fast proxies only
                break;
            case 'balanced':
                filteredProxies = proxies.filter(p => p.speed < 4000); // Medium speed
                break;
            case 'aggressive':
                filteredProxies = proxies; // All proxies
                break;
        }

        if (filteredProxies.length === 0) {
            filteredProxies = proxies; // Fallback to all proxies
        }

        // Weighted random selection favoring faster proxies
        const weights = filteredProxies.map(p => 1 / (p.speed / 1000 + 1));
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        
        let random = Math.random() * totalWeight;
        for (let i = 0; i < filteredProxies.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return filteredProxies[i];
            }
        }

        return filteredProxies[0];
    }

    static getProxyForRequest(quality = 'premium') {
        const proxy = this.getRandomProxy(quality);
        
        if (proxy) {
            return {
                url: proxy.url,
                ip: proxy.ip,
                speed: proxy.speed,
                headers: {
                    'X-Forwarded-For': proxy.ip,
                    'X-Real-IP': proxy.ip,
                    'Via': `1.1 ${proxy.ip}`
                }
            };
        }
        
        return null;
    }

    static reportProxyFailure(proxyUrl) {
        if (this.activeProxies.has(proxyUrl)) {
            this.activeProxies.delete(proxyUrl);
            Logger.debug(`Proxy removed from active pool: ${proxyUrl}`);
            
            // Maintain minimum proxy count
            if (this.activeProxies.size < 10) {
                this.backgroundRefresh();
            }
        }
    }

    static async refreshProxies() {
        Logger.info('🔄 Refreshing proxy pool...');
        
        try {
            await this.loadAllProxies();
            await this.fastProxyValidation();
            
            const stats = this.getStats();
            Logger.info(`✅ Proxy refresh completed: ${stats.activeProxies} active proxies`);
            
            return stats;
            
        } catch (error) {
            Logger.error('Proxy refresh failed', error);
            throw error;
        }
    }

    static async backgroundRefresh() {
        if (this.refreshInProgress) return;
        
        this.refreshInProgress = true;
        
        try {
            await this.refreshProxies();
        } catch (error) {
            // Silent fail for background refresh
        } finally {
            this.refreshInProgress = false;
        }
    }

    static getStats() {
        const activeProxies = Array.from(this.activeProxies.values());
        const averageResponse = activeProxies.length > 0 
            ? Math.round(activeProxies.reduce((sum, p) => sum + p.speed, 0) / activeProxies.length)
            : 0;

        return {
            totalProxies: this.proxies.get('global')?.length || 0,
            activeProxies: this.activeProxies.size,
            totalTested: this.proxies.get('global')?.length || 0,
            averageResponseTime: averageResponse,
            sources: this.proxySources.length
        };
    }

    static getProxyQuality() {
        const stats = this.getStats();
        
        if (stats.activeProxies === 0) return 'none';
        if (stats.averageResponseTime < 2000) return 'excellent';
        if (stats.averageResponseTime < 4000) return 'good';
        return 'fair';
    }
}

// Auto-refresh proxies every 10 minutes
setInterval(() => {
    if (ProxyManager.initialized && ProxyManager.activeProxies.size < 20) {
        ProxyManager.backgroundRefresh();
    }
}, 600000);

// Initialize on import
setTimeout(() => {
    if (!ProxyManager.initialized) {
        ProxyManager.initialize().catch(() => {
            // Silent initialization failure
        });
    }
}, 1000);
