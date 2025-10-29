/**
 * Premium Traffic Delivery Engine
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
            proxyQuality: this.config.proxyQuality
        });

        // Pre-generate request queue for better performance
        this.generateRequestQueue();
        
        // Adjust concurrency based on settings
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
        // Smart concurrency adjustment based on delay and proxy quality
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
            estimatedTime: this.calculateEstimatedTime()
        });

        // Process in optimized batches
        await this.processOptimizedBatches();
        
        // Process retry queue if needed
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

            await this.processBatch(batch, batchIndex + 1, totalBatches);

            // Adaptive delay between batches
            if (this.isRunning && batchIndex < totalBatches - 1) {
                await this.adaptiveDelay(batchIndex);
            }
        }
    }

    async processBatch(batch, batchNumber, totalBatches) {
        const batchStartTime = Date.now();
        const controllers = [];
        const requests = [];

        Logger.debug(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} requests)`);

        // Create all requests for the batch
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

            // Stagger requests within batch for more natural traffic
            if (this.config.enableJitter) {
                const jitter = Math.random() * 0.4 + 0.8; // 0.8 to 1.2
                await this.delay((this.config.delay / this.concurrency) * jitter);
            }
        }

        this.currentBatch = controllers;

        try {
            const results = await Promise.allSettled(requests);
            this.processBatchResults(results, batchStartTime);
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

        // Add proxy configuration if available
        if (proxyConfig) {
            requestConfig.proxy = proxyConfig;
            // Add proxy headers for better simulation
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
                    throw new Error(`HTTP ${response.status}`);
                }

                // Validate response content
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('text/html')) {
                    throw new Error('Invalid content type: ' + contentType);
                }

                // Update performance metrics
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
                    // Final attempt failed
                    this.updatePerformanceMetrics(Date.now() - startTime, false);
                    
                    if (proxyConfig) {
                        ProxyManager.reportProxyFailure(proxyConfig.url);
                    }
                    
                    throw error;
                }

                // Exponential backoff for retries
                const backoffDelay = Math.pow(2, attempt) * 100 + Math.random() * 100;
                await this.delay(backoffDelay);
            }
        }
    }

    processBatchResults(results, batchStartTime) {
        let batchSuccessful = 0;
        let batchFailed = 0;

        results.forEach(result => {
            this.stats.sent++;

            if (result.status === 'fulfilled' && result.value.success) {
                this.stats.successful++;
                batchSuccessful++;
                
                // Log successful request occasionally
                if (Math.random() < 0.01) { // 1% of successful requests
                    Logger.debug('Request successful', {
                        duration: `${result.value.duration}ms`,
                        proxy: result.value.proxy ? 'yes' : 'no',
                        device: result.value.request.deviceProfile.name
                    });
                }
            } else {
                this.stats.failed++;
                batchFailed++;
                
                // Add to retry queue with limits
                if (result.value?.request && this.retryQueue.length < 1000) {
                    result.value.request.retryCount++;
                    this.retryQueue.push(result.value.request);
                }
            }
        });

        const batchDuration = Date.now() - batchStartTime;
        const batchRate = batchSuccessful / (batchDuration / 1000);

        // Log batch progress
        if (this.stats.batchCount % 5 === 0 || batchNumber === 1) {
            const progress = (this.stats.sent / this.stats.total) * 100;
            
            Logger.info(`📦 Batch ${this.stats.batchCount} completed`, {
                progress: `${progress.toFixed(1)}%`,
                successful: batchSuccessful,
                failed: batchFailed,
                rate: `${batchRate.toFixed(1)} req/sec`,
                activeProxies: ProxyManager.activeProxies.size
            });
        }

        this.stats.lastBatchTime = Date.now();
    }

    async processRetryQueue() {
        if (this.retryQueue.length === 0) return;

        Logger.info(`🔄 Processing retry queue: ${this.retryQueue.length} requests`);

        const retryPromises = this.retryQueue.map(async (request, index) => {
            await this.delay(index * 50); // Stagger retries
            return this.executeRequest(request, new AbortController().signal)
                .catch(() => ({ success: false, request }));
        });

        const results = await Promise.allSettled(retryPromises);
        
        const retryStats = {
            successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
            failed: results.filter(r => r.status === 'rejected' || !r.value.success).length
        };

        this.stats.successful += retryStats.successful;
        this.stats.failed += retryStats.failed;

        Logger.info('✅ Retry queue completed', retryStats);
        this.retryQueue = [];
    }

    async adaptiveDelay(batchIndex) {
        let delay = this.config.delay;
        
        // Reduce delay as we progress to maintain rate
        if (batchIndex > 10) {
            const progress = this.stats.sent / this.stats.total;
            delay = Math.max(200, delay * (1 - progress * 0.3)); // Reduce up to 30%
        }
        
        // Add jitter for more natural pattern
        if (this.config.enableJitter) {
            const jitter = Math.random() * 0.4 + 0.8; // 0.8 to 1.2
            delay *= jitter;
        }
        
        await this.delay(delay);
    }

    updatePerformanceMetrics(duration, success) {
        // Update average response time (moving average)
        this.performance.averageResponseTime = 
            (this.performance.averageResponseTime * 0.95) + (duration * 0.05);
        
        // Update requests per second
        const timeElapsed = (Date.now() - this.stats.startTime) / 1000;
        this.performance.requestsPerSecond = timeElapsed > 0 ? this.stats.sent / timeElapsed : 0;
        
        // Update success rate
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

    calculateEstimatedTime() {
        const estimatedRate = 1000 / this.config.delay * this.concurrency;
        const estimatedSeconds = this.stats.total / estimatedRate;
        
        const minutes = Math.floor(estimatedSeconds / 60);
        const seconds = Math.ceil(estimatedSeconds % 60);
        
        return `${minutes}m ${seconds}s`;
    }

    stop() {
        this.isRunning = false;
        
        if (this.currentBatch) {
            this.currentBatch.forEach(controller => controller.abort());
            this.currentBatch = null;
        }
        
        Logger.info('⏹️ Traffic session stopped by user');
    }

    complete() {
        this.isRunning = false;
        const sessionDuration = (Date.now() - this.stats.startTime) / 1000;
        
        const finalStats = {
            duration: `${Math.round(sessionDuration)} seconds`,
            totalRequests: this.stats.sent,
            successful: this.stats.successful,
            failed: this.stats.failed,
            successRate: `${((this.stats.successful / this.stats.sent) * 100).toFixed(2)}%`,
            averageRate: `${(this.stats.sent / sessionDuration).toFixed(1)} requests/second`,
            averageResponse: `${Math.round(this.performance.averageResponseTime)}ms`,
            proxiesUsed: ProxyManager.activeProxies.size
        };

        Logger.info('🎉 Traffic session completed successfully', finalStats);
        this.saveSessionResults(finalStats);
    }

    saveSessionResults(stats) {
        const sessionData = {
            config: this.config,
            stats: stats,
            timestamp: new Date().toISOString(),
            performance: this.performance
        };

        const sessions = JSON.parse(localStorage.getItem('trafficSessions') || '[]');
        sessions.push(sessionData);
        localStorage.setItem('trafficSessions', JSON.stringify(sessions.slice(-20))); // Keep last 20 sessions
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
