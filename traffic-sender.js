/**
 * Premium Traffic Delivery Engine - COMPLETELY FIXED VERSION
 * High-performance traffic sending with intelligent retry logic
 */

class TrafficSession {
    constructor(config) {
        this.config = config;
        this.isRunning = false;
        this.currentBatch = null;
        this.retryQueue = [];
        this.requestQueue = [];
        this.concurrency = 5;
        
        this.stats = {
            sent: 0,
            successful: 0,
            failed: 0,
            total: config.impressions,
            startTime: Date.now(),
            lastBatchTime: Date.now(),
            batchCount: 0
        };
        
        this.performance = {
            averageResponseTime: 0,
            requestsPerSecond: 0,
            successRate: 100
        };
        
        this.initializeSession();
    }

    initializeSession() {
        Logger.info('🎯 Initializing traffic session', {
            target: this.config.impressions.toLocaleString(),
            country: this.config.country,
            deviceType: this.config.deviceType,
            proxyQuality: this.config.proxyQuality,
            url: this.sanitizeUrl(this.config.adUrl)
        });

        this.generateRequestQueue();
        this.adjustConcurrency();
    }

    generateRequestQueue() {
        this.requestQueue = [];
        for (let i = 0; i < this.config.impressions; i++) {
            this.requestQueue.push({
                id: i + 1,
                retryCount: 0,
                deviceProfile: DeviceProfiles.getRandomProfile(this.config.deviceType),
                timestamp: null,
                status: 'pending'
            });
        }
    }

    adjustConcurrency() {
        const baseConcurrency = Math.max(1, Math.min(10, Math.floor(1000 / this.config.delay)));
        
        switch (this.config.proxyQuality) {
            case 'premium':
                this.concurrency = Math.min(8, baseConcurrency);
                break;
            case 'balanced':
                this.concurrency = Math.min(12, baseConcurrency);
                break;
            case 'aggressive':
                this.concurrency = Math.min(15, baseConcurrency);
                break;
            default:
                this.concurrency = Math.min(5, baseConcurrency);
        }

        Logger.debug(`Adjusted concurrency to ${this.concurrency} based on settings`);
    }

    async start() {
        if (this.isRunning) {
            Logger.warn('Session already running');
            return;
        }

        this.isRunning = true;
        this.stats.startTime = Date.now();
        
        Logger.info('🚀 Starting traffic delivery', {
            concurrency: this.concurrency,
            totalRequests: this.stats.total,
            estimatedTime: this.calculateEstimatedTime(),
            targetUrl: this.sanitizeUrl(this.config.adUrl)
        });

        await this.processOptimizedBatches();
        
        if (this.retryQueue.length > 0) {
            await this.processRetryQueue();
        }

        this.complete();
    }

    async processOptimizedBatches() {
        const totalBatches = Math.ceil(this.requestQueue.length / this.concurrency);
        
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            if (!this.isRunning) break;

            const startIdx = batchIndex * this.concurrency;
            const endIdx = Math.min(startIdx + this.concurrency, this.requestQueue.length);
            const batch = this.requestQueue.slice(startIdx, endIdx);

            await this.processBatch(batch, batchIndex);

            if (this.isRunning && batchIndex < totalBatches - 1) {
                await this.adaptiveDelay(batchIndex);
            }
        }
    }

    async processBatch(batch, batchIndex) {
        const batchStartTime = Date.now();
        const controllers = [];
        const requests = [];

        Logger.debug(`Processing batch ${batchIndex + 1} (${batch.length} requests)`);

        for (const request of batch) {
            if (!this.isRunning) break;

            const controller = new AbortController();
            controllers.push(controller);

            requests.push(
                this.executeRequest(request, controller.signal)
                    .catch(error => ({
                        success: false,
                        error: error.message,
                        request: request
                    }))
            );

            if (this.config.enableJitter) {
                const jitter = Math.random() * 0.4 + 0.8;
                await this.delay((this.config.delay / this.concurrency) * jitter);
            }
        }

        this.currentBatch = controllers;

        try {
            const results = await Promise.allSettled(requests);
            this.processBatchResults(results, batchStartTime, batchIndex);
        } catch (error) {
            Logger.error('Batch processing error', error);
        }

        this.currentBatch = null;
        this.stats.batchCount++;
    }

    async executeRequest(request, signal) {
        const proxyConfig = ProxyManager.getProxyForRequest(this.config.proxyQuality);
        const device = request.deviceProfile;
        
        const requestConfig = {
            method: 'GET',
            signal: signal,
            headers: {
                'User-Agent': device.userAgent,
                'Accept': device.accept,
                'Accept-Language': device.acceptLanguage,
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'DNT': '1',
                'Upgrade-Insecure-Requests': '1'
            },
            mode: 'cors',
            credentials: 'omit',
            referrer: this.config.enableReferrer ? this.getRandomReferrer() : 'https://www.google.com/',
            referrerPolicy: 'no-referrer-when-downgrade'
        };

        if (proxyConfig) {
            requestConfig.proxy = proxyConfig;
            if (proxyConfig.headers) {
                Object.assign(requestConfig.headers, proxyConfig.headers);
            }
        }

        const startTime = Date.now();
        let attempt = 0;
        const maxAttempts = this.config.maxRetries;

        while (attempt < maxAttempts) {
            try {
                const response = await fetch(this.config.adUrl, requestConfig);
                const duration = Date.now() - startTime;

                if (!response.ok) {
                    if (response.status >= 500) {
                        throw new Error(`HTTP ${response.status}`);
                    } else if (response.status >= 400) {
                        Logger.debug(`HTTP ${response.status} received`, {
                            url: this.sanitizeUrl(this.config.adUrl),
                            attempt: attempt + 1
                        });
                        
                        if (response.status === 404 || response.status === 403) {
                            this.updatePerformanceMetrics(duration, true);
                            return {
                                success: true,
                                duration: duration,
                                request: request,
                                proxy: proxyConfig?.url || 'direct',
                                note: `HTTP ${response.status}`
                            };
                        } else {
                            throw new Error(`HTTP ${response.status}`);
                        }
                    }
                }

                const contentType = response.headers.get('content-type') || '';
                const validContentTypes = [
                    'text/html',
                    'application/json', 
                    'text/plain',
                    'application/javascript',
                    'image/',
                    'video/',
                    'application/octet-stream'
                ];

                const isValidContent = validContentTypes.some(type => contentType.includes(type));
                
                if (!isValidContent) {
                    Logger.debug(`Unusual content type: ${contentType}`, {
                        url: this.sanitizeUrl(this.config.adUrl)
                    });
                }

                this.updatePerformanceMetrics(duration, true);

                return {
                    success: true,
                    duration: duration,
                    request: request,
                    proxy: proxyConfig?.url || 'direct'
                };

            } catch (error) {
                attempt++;
                
                if (attempt === maxAttempts) {
                    this.updatePerformanceMetrics(Date.now() - startTime, false);
                    
                    if (proxyConfig) {
                        ProxyManager.reportProxyFailure(proxyConfig.url);
                    }
                    
                    Logger.debug('Request failed after all retries', {
                        error: error.message,
                        url: this.sanitizeUrl(this.config.adUrl),
                        attempts: maxAttempts
                    });
                    
                    throw error;
                }

                const backoffDelay = Math.pow(2, attempt) * 100 + Math.random() * 100;
                await this.delay(backoffDelay);
            }
        }
    }

    // FIXED: Properly using batchIndex parameter
    processBatchResults(results, batchStartTime, batchIndex) {
        let batchSuccessful = 0;
        let batchFailed = 0;

        results.forEach(result => {
            this.stats.sent++;

            if (result.status === 'fulfilled' && result.value.success) {
                this.stats.successful++;
                batchSuccessful++;
                
                if (Math.random() < 0.01) {
                    Logger.debug('Request successful', {
                        duration: `${result.value.duration}ms`,
                        proxy: result.value.proxy ? 'yes' : 'no',
                        device: result.value.request.deviceProfile.name
                    });
                }
            } else {
                this.stats.failed++;
                batchFailed++;
                
                if (result.value?.request && this.retryQueue.length < 1000) {
                    result.value.request.retryCount++;
                    if (result.value.request.retryCount <= this.config.maxRetries) {
                        this.retryQueue.push(result.value.request);
                    }
                }
            }
        });

        const batchDuration = Date.now() - batchStartTime;
        const batchRate = batchSuccessful / (batchDuration / 1000);

        // FIXED: Using batchIndex + 1 for batch number display
        if ((batchIndex + 1) % 10 === 0 || (batchIndex + 1) === 1 || this.stats.sent === this.stats.total) {
            const progress = (this.stats.sent / this.stats.total) * 100;
            const elapsed = (Date.now() - this.stats.startTime) / 1000;
            const overallRate = this.stats.sent / elapsed;
            
            Logger.info(`📦 Batch ${batchIndex + 1} completed`, {
                progress: `${progress.toFixed(1)}%`,
                sent: this.stats.sent.toLocaleString(),
                successful: this.stats.successful.toLocaleString(),
                failed: this.stats.failed.toLocaleString(),
                successRate: `${((this.stats.successful / this.stats.sent) * 100).toFixed(1)}%`,
                currentRate: `${batchRate.toFixed(1)} req/sec`,
                overallRate: `${overallRate.toFixed(1)} req/sec`,
                activeProxies: ProxyManager.activeProxies.size
            });
        }

        this.stats.lastBatchTime = Date.now();
    }

    async processRetryQueue() {
        if (this.retryQueue.length === 0) return;

        Logger.info(`🔄 Processing retry queue: ${this.retryQueue.length} requests`);

        const retryConcurrency = Math.max(1, Math.floor(this.concurrency / 2));
        const retryBatches = Math.ceil(this.retryQueue.length / retryConcurrency);
        
        let retrySuccessful = 0;
        let retryFailed = 0;

        for (let i = 0; i < retryBatches; i++) {
            if (!this.isRunning) break;

            const startIdx = i * retryConcurrency;
            const endIdx = Math.min(startIdx + retryConcurrency, this.retryQueue.length);
            const retryBatch = this.retryQueue.slice(startIdx, endIdx);

            const retryPromises = retryBatch.map(async (request, index) => {
                await this.delay(index * 100);
                return this.executeRequest(request, new AbortController().signal)
                    .catch(() => ({ success: false, request }));
            });

            const results = await Promise.allSettled(retryPromises);
            
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value.success) {
                    retrySuccessful++;
                } else {
                    retryFailed++;
                }
            });

            if (i < retryBatches - 1) {
                await this.delay(500);
            }
        }

        this.stats.successful += retrySuccessful;
        this.stats.failed += retryFailed;

        Logger.info('✅ Retry queue completed', {
            successful: retrySuccessful,
            failed: retryFailed
        });
        
        this.retryQueue = [];
    }

    async adaptiveDelay(batchIndex) {
        let delay = this.config.delay;
        
        if (batchIndex > 10) {
            const progress = this.stats.sent / this.stats.total;
            delay = Math.max(200, delay * (1 - progress * 0.3));
        }
        
        if (this.config.enableJitter) {
            const jitter = Math.random() * 0.4 + 0.8;
            delay *= jitter;
        }
        
        await this.delay(delay);
    }

    updatePerformanceMetrics(duration, success) {
        this.performance.averageResponseTime = 
            (this.performance.averageResponseTime * 0.95) + (duration * 0.05);
        
        const timeElapsed = (Date.now() - this.stats.startTime) / 1000;
        this.performance.requestsPerSecond = timeElapsed > 0 ? this.stats.sent / timeElapsed : 0;
        
        this.performance.successRate = this.stats.sent > 0 ? 
            (this.stats.successful / this.stats.sent) * 100 : 100;
    }

    getRandomReferrer() {
        const referrers = [
            'https://www.google.com/',
            'https://www.facebook.com/',
            'https://www.youtube.com/',
            'https://www.twitter.com/',
            'https://www.reddit.com/',
            'https://www.linkedin.com/',
            'https://www.instagram.com/',
            'https://www.pinterest.com/',
            'https://www.tumblr.com/',
            'https://www.quora.com/'
        ];
        return referrers[Math.floor(Math.random() * referrers.length)];
    }

    sanitizeUrl(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            const path = urlObj.pathname.substring(0, 15) + (urlObj.pathname.length > 15 ? '...' : '');
            return `${domain}${path}`;
        } catch (e) {
            return url.substring(0, 40) + (url.length > 40 ? '...' : '');
        }
    }

    calculateEstimatedTime() {
        const estimatedRate = 1000 / this.config.delay * this.concurrency;
        const estimatedSeconds = this.stats.total / estimatedRate;
        
        const minutes = Math.floor(estimatedSeconds / 60);
        const seconds = Math.ceil(estimatedSeconds % 60);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    stop() {
        this.isRunning = false;
        
        if (this.currentBatch) {
            this.currentBatch.forEach(controller => controller.abort());
            this.currentBatch = null;
        }
        
        Logger.info('⏹️ Traffic session stopped');
    }

    complete() {
        this.isRunning = false;
        const sessionDuration = (Date.now() - this.stats.startTime) / 1000;
        
        const finalStats = {
            duration: `${Math.round(sessionDuration)}s`,
            totalRequests: this.stats.sent,
            successful: this.stats.successful,
            failed: this.stats.failed,
            successRate: `${((this.stats.successful / this.stats.sent) * 100).toFixed(1)}%`,
            averageRate: `${(this.stats.sent / sessionDuration).toFixed(1)}/sec`,
            averageResponse: `${Math.round(this.performance.averageResponseTime)}ms`,
            proxiesUsed: ProxyManager.activeProxies.size
        };

        Logger.info('🎉 Session completed', finalStats);
        this.saveSessionResults(finalStats);
    }

    saveSessionResults(stats) {
        const sessionData = {
            config: {
                ...this.config,
                adUrl: this.sanitizeUrl(this.config.adUrl)
            },
            stats: stats,
            timestamp: new Date().toISOString()
        };

        const sessions = JSON.parse(localStorage.getItem('trafficSessions') || '[]');
        sessions.push(sessionData);
        localStorage.setItem('trafficSessions', JSON.stringify(sessions.slice(-10)));
    }

    getStats() {
        return {
            ...this.stats,
            performance: this.performance
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
