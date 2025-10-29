/**
 * Traffic Sender Pro - Main Application Controller
 * Premium Traffic Delivery System v2.1.0
 */

class TrafficSenderApp {
    constructor() {
        this.isRunning = false;
        this.currentSession = null;
        this.sessionStartTime = null;
        this.sessionTimer = null;
        this.stats = {
            sent: 0,
            successful: 0,
            failed: 0,
            total: 0,
            startTime: null,
            lastUpdate: null
        };
        
        this.proxyStats = {
            active: 0,
            tested: 0,
            averageResponse: 0
        };
        
        this.initializeApp();
    }

    initializeApp() {
        Logger.info('🚀 Traffic Sender Pro v2.1.0 Initializing...');
        
        this.bindEvents();
        this.loadSavedSettings();
        this.initializeComponents();
        this.updateDisplay();
        
        // Initialize proxy manager in background
        this.initializeProxyManager();
        
        Logger.info('✅ Application initialized successfully');
        this.updateStatus('ready', 'System Ready');
    }

    bindEvents() {
        // Form controls
        document.getElementById('startBtn').addEventListener('click', () => this.startTraffic());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopTraffic());
        document.getElementById('testProxyBtn').addEventListener('click', () => this.testProxies());
        
        // Form validation
        document.getElementById('adUrl').addEventListener('input', (e) => this.validateUrl(e.target.value));
        document.getElementById('validateUrl').addEventListener('click', () => this.validateUrl(document.getElementById('adUrl').value));
        
        // Advanced settings toggle
        document.getElementById('advancedToggle').addEventListener('click', () => this.toggleAdvancedSettings());
        
        // Log controls
        document.getElementById('clearLogs').addEventListener('click', () => Logger.clear());
        document.getElementById('exportLogs').addEventListener('click', () => Logger.export());
        document.getElementById('logLevel').addEventListener('change', (e) => Logger.setLevel(e.target.value));
        document.getElementById('logFilter').addEventListener('input', (e) => this.filterLogs(e.target.value));
        document.getElementById('toggleAutoScroll').addEventListener('click', (e) => this.toggleAutoScroll(e.target));
        
        // Stats refresh
        document.getElementById('refreshStats').addEventListener('click', () => this.updateStatsDisplay());
        
        // Preset management
        document.getElementById('savePreset').addEventListener('click', () => this.savePreset());
        document.getElementById('loadPreset').addEventListener('click', () => this.loadPreset());
        
        // Footer actions
        document.getElementById('exportSession').addEventListener('click', () => this.exportSession());
        
        // Global events
        window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
        
        Logger.debug('Event bindings completed');
    }

    initializeComponents() {
        // Initialize session timer
        this.sessionTimer = setInterval(() => this.updateSessionTimer(), 1000);
        
        // Initialize stats updater
        setInterval(() => this.updateStatsDisplay(), 1000);
        
        // Initialize auto-save
        setInterval(() => this.saveSettings(), 30000);
        
        Logger.debug('Background services initialized');
    }

    async initializeProxyManager() {
        try {
            Logger.info('🔄 Initializing proxy management system...');
            await ProxyManager.initialize();
            
            const stats = ProxyManager.getStats();
            this.proxyStats.active = stats.activeProxies;
            this.proxyStats.tested = stats.totalTested;
            
            Logger.info(`✅ Proxy system ready: ${stats.activeProxies} active proxies`);
            this.updateProxyStats();
            
        } catch (error) {
            Logger.warn('Proxy system initialization had issues, but continuing...', error);
        }
    }

    async startTraffic() {
        if (this.isRunning) {
            Logger.warn('Traffic delivery is already running');
            return;
        }

        const formData = this.getFormData();
        if (!this.validateForm(formData)) {
            return;
        }

        try {
            this.setUIState('starting');
            Logger.info('🎬 Starting traffic delivery session...', formData);

            // Update stats
            this.stats = {
                sent: 0,
                successful: 0,
                failed: 0,
                total: formData.impressions,
                startTime: Date.now(),
                lastUpdate: Date.now()
            };

            // Ensure proxies are ready
            if (ProxyManager.activeProxies.size === 0) {
                Logger.warn('No active proxies found, attempting to refresh...');
                await ProxyManager.refreshProxies();
            }

            // Start traffic session
            this.currentSession = new TrafficSession(formData);
            this.sessionStartTime = Date.now();
            this.isRunning = true;
            
            await this.currentSession.start();
            
            this.setUIState('running');
            this.startStatsTracking();

        } catch (error) {
            Logger.error('❌ Failed to start traffic session', error);
            this.setUIState('error');
            this.isRunning = false;
        }
    }

    stopTraffic() {
        if (!this.isRunning || !this.currentSession) {
            return;
        }

        Logger.info('⏹️ Stopping traffic delivery...');
        this.currentSession.stop();
        this.isRunning = false;
        this.currentSession = null;
        
        this.setUIState('stopped');
        this.stopStatsTracking();
        
        // Final stats
        const duration = (Date.now() - this.sessionStartTime) / 1000;
        const rate = this.stats.sent / duration;
        
        Logger.info('📊 Session completed', {
            duration: `${Math.round(duration)}s`,
            totalSent: this.stats.sent,
            successful: this.stats.successful,
            failed: this.stats.failed,
            successRate: `${((this.stats.successful / this.stats.sent) * 100).toFixed(1)}%`,
            averageRate: `${rate.toFixed(1)} req/sec`
        });
    }

    async testProxies() {
        try {
            Logger.info('🔧 Testing proxy pool...');
            const btn = document.getElementById('testProxyBtn');
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<div class="spinner"></div> Testing...';
            btn.disabled = true;
            
            await ProxyManager.refreshProxies();
            
            const stats = ProxyManager.getStats();
            this.proxyStats.active = stats.activeProxies;
            this.proxyStats.tested = stats.totalTested;
            this.proxyStats.averageResponse = stats.averageResponseTime;
            
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            Logger.info(`✅ Proxy test completed: ${stats.activeProxies} active proxies`);
            this.updateProxyStats();
            
        } catch (error) {
            Logger.error('Proxy test failed', error);
        }
    }

    getFormData() {
        const form = document.getElementById('trafficForm');
        return {
            adUrl: form.adUrl.value.trim(),
            country: form.country.value,
            impressions: parseInt(form.impressions.value),
            deviceType: form.deviceType.value,
            proxyQuality: form.proxyQuality.value,
            delay: parseInt(form.delay.value),
            maxRetries: parseInt(form.maxRetries.value),
            enableJitter: form.enableJitter.checked,
            enableReferrer: form.enableReferrer.checked
        };
    }

    validateForm(data) {
        const errors = [];

        if (!data.adUrl) {
            errors.push('Ad network URL is required');
        } else if (!this.isValidUrl(data.adUrl)) {
            errors.push('Please enter a valid URL');
        }

        if (!data.country) {
            errors.push('Target country is required');
        }

        if (!data.impressions || data.impressions < 100) {
            errors.push('Impressions must be at least 100');
        }

        if (data.delay < 200 || data.delay > 5000) {
            errors.push('Delay must be between 200 and 5000 milliseconds');
        }

        if (errors.length > 0) {
            alert('Please fix the following errors:\n\n' + errors.join('\n'));
            return false;
        }

        return true;
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    validateUrl(url) {
        const feedback = document.getElementById('urlFeedback');
        
        if (!url) {
            feedback.textContent = '';
            feedback.className = 'input-feedback';
            return;
        }

        if (!this.isValidUrl(url)) {
            feedback.textContent = '❌ Please enter a valid URL';
            feedback.className = 'input-feedback invalid';
            return false;
        }

        // Check if it looks like an ad network URL
        const adPatterns = [
            /adsterra\./i,
            /propellerads\./i,
            /clickadu\./i,
            /popads\./i,
            /exoclick\./i
        ];

        const isAdUrl = adPatterns.some(pattern => pattern.test(url));
        
        if (isAdUrl) {
            feedback.textContent = '✅ Valid ad network URL detected';
            feedback.className = 'input-feedback valid';
        } else {
            feedback.textContent = '⚠️ This may not be an ad network URL';
            feedback.className = 'input-feedback invalid';
        }

        return isAdUrl;
    }

    setUIState(state) {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        startBtn.style.display = 'none';
        stopBtn.style.display = 'none';
        statusDot.className = 'status-dot';
        statusText.textContent = 'Ready';

        switch (state) {
            case 'starting':
                startBtn.style.display = 'flex';
                startBtn.disabled = true;
                startBtn.querySelector('.btn-text').style.display = 'none';
                startBtn.querySelector('.btn-loading').style.display = 'flex';
                statusDot.className = 'status-dot warning';
                statusText.textContent = 'Initializing...';
                break;

            case 'running':
                stopBtn.style.display = 'flex';
                statusDot.className = 'status-dot running';
                statusText.textContent = 'Delivering Traffic';
                break;

            case 'stopped':
                startBtn.style.display = 'flex';
                startBtn.disabled = false;
                startBtn.querySelector('.btn-text').style.display = 'flex';
                startBtn.querySelector('.btn-loading').style.display = 'none';
                statusDot.className = 'status-dot ready';
                statusText.textContent = 'Ready';
                break;

            case 'error':
                startBtn.style.display = 'flex';
                startBtn.disabled = false;
                startBtn.querySelector('.btn-text').style.display = 'flex';
                startBtn.querySelector('.btn-loading').style.display = 'none';
                statusDot.className = 'status-dot error';
                statusText.textContent = 'Error';
                break;
        }
    }

    updateStatus(status, message) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        
        statusDot.className = `status-dot ${status}`;
        statusText.textContent = message;
    }

    updateSessionTimer() {
        if (!this.sessionStartTime) {
            document.getElementById('sessionTimer').textContent = '00:00:00';
            return;
        }

        const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;

        document.getElementById('sessionTimer').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    startStatsTracking() {
        this.statsUpdateInterval = setInterval(() => {
            if (this.currentSession) {
                const sessionStats = this.currentSession.getStats();
                this.stats = { ...this.stats, ...sessionStats };
                this.updateStatsDisplay();
            }
        }, 500);
    }

    stopStatsTracking() {
        if (this.statsUpdateInterval) {
            clearInterval(this.statsUpdateInterval);
        }
    }

    updateStatsDisplay() {
        // Update main stats
        document.getElementById('sentCount').textContent = this.stats.sent.toLocaleString();
        document.getElementById('successCount').textContent = this.stats.successful.toLocaleString();
        document.getElementById('failedCount').textContent = this.stats.failed.toLocaleString();

        // Calculate rates
        const now = Date.now();
        const timeElapsed = (now - (this.stats.lastUpdate || now)) / 1000;
        const sentSinceUpdate = this.stats.sent - (this.stats.lastSent || 0);
        
        const currentRate = timeElapsed > 0 ? (sentSinceUpdate / timeElapsed) : 0;
        document.getElementById('sentRate').textContent = `${currentRate.toFixed(1)}/sec`;

        const successRate = this.stats.sent > 0 ? (this.stats.successful / this.stats.sent) * 100 : 100;
        document.getElementById('successRate').textContent = `${successRate.toFixed(1)}%`;
        document.getElementById('failRate').textContent = `${(100 - successRate).toFixed(1)}%`;

        // Update progress
        const progress = this.stats.total > 0 ? (this.stats.sent / this.stats.total) * 100 : 0;
        document.getElementById('progressPercent').textContent = `${Math.round(progress)}%`;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${this.stats.sent.toLocaleString()}/${this.stats.total.toLocaleString()}`;

        // Calculate time remaining
        if (currentRate > 0 && this.stats.total > this.stats.sent) {
            const remaining = this.stats.total - this.stats.sent;
            const secondsRemaining = Math.ceil(remaining / currentRate);
            const minutes = Math.floor(secondsRemaining / 60);
            const seconds = secondsRemaining % 60;
            document.getElementById('timeRemaining').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
            document.getElementById('timeRemaining').textContent = '--:--';
        }

        this.stats.lastUpdate = now;
        this.stats.lastSent = this.stats.sent;
    }

    updateProxyStats() {
        document.getElementById('activeProxyCount').textContent = this.proxyStats.active;
        document.getElementById('avgResponseTime').textContent = `${this.proxyStats.averageResponse}ms`;
        
        const countrySelect = document.getElementById('country');
        const selectedCountry = countrySelect.options[countrySelect.selectedIndex];
        document.getElementById('currentCountry').textContent = selectedCountry.textContent || '-';
    }

    toggleAdvancedSettings() {
        const advancedSection = document.querySelector('.advanced-section');
        const advancedContent = document.getElementById('advancedContent');
        
        advancedSection.classList.toggle('open');
        advancedContent.style.display = advancedSection.classList.contains('open') ? 'block' : 'none';
    }

    filterLogs(filterText) {
        const logEntries = document.querySelectorAll('.log-entry');
        const filter = filterText.toLowerCase();

        logEntries.forEach(entry => {
            const text = entry.textContent.toLowerCase();
            entry.style.display = text.includes(filter) ? 'block' : 'none';
        });
    }

    toggleAutoScroll(button) {
        button.classList.toggle('active');
        Logger.autoScroll = button.classList.contains('active');
    }

    saveSettings() {
        const formData = this.getFormData();
        localStorage.setItem('trafficSenderSettings', JSON.stringify(formData));
    }

    loadSavedSettings() {
        try {
            const saved = localStorage.getItem('trafficSenderSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                const form = document.getElementById('trafficForm');
                
                Object.keys(settings).forEach(key => {
                    const element = form.elements[key];
                    if (element) {
                        if (element.type === 'checkbox') {
                            element.checked = settings[key];
                        } else {
                            element.value = settings[key];
                        }
                    }
                });
                
                Logger.debug('Settings loaded from localStorage');
            }
        } catch (error) {
            Logger.warn('Failed to load saved settings', error);
        }
    }

    savePreset() {
        const formData = this.getFormData();
        const presetName = prompt('Enter preset name:');
        if (presetName) {
            const presets = JSON.parse(localStorage.getItem('trafficPresets') || '{}');
            presets[presetName] = formData;
            localStorage.setItem('trafficPresets', JSON.stringify(presets));
            Logger.info(`Preset "${presetName}" saved`);
        }
    }

    loadPreset() {
        const presets = JSON.parse(localStorage.getItem('trafficPresets') || '{}');
        const presetNames = Object.keys(presets);
        
        if (presetNames.length === 0) {
            alert('No presets saved yet');
            return;
        }

        const presetName = prompt(`Available presets:\n${presetNames.join('\n')}\n\nEnter preset name to load:`);
        if (presetName && presets[presetName]) {
            const settings = presets[presetName];
            const form = document.getElementById('trafficForm');
            
            Object.keys(settings).forEach(key => {
                const element = form.elements[key];
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = settings[key];
                    } else {
                        element.value = settings[key];
                    }
                }
            });
            
            Logger.info(`Preset "${presetName}" loaded`);
        }
    }

    exportSession() {
        const sessionData = {
            timestamp: new Date().toISOString(),
            config: this.getFormData(),
            stats: this.stats,
            proxyStats: this.proxyStats,
            logs: Logger.getRecentLogs(100)
        };

        const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `traffic-session-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Logger.info('Session data exported');
    }

    handleBeforeUnload(e) {
        if (this.isRunning) {
            e.preventDefault();
            e.returnValue = 'Traffic delivery is in progress. Are you sure you want to leave?';
            return e.returnValue;
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            Logger.debug('Page backgrounded - operations may be throttled');
        } else {
            Logger.debug('Page foregrounded');
        }
    }

    updateDisplay() {
        this.updateStatsDisplay();
        this.updateProxyStats();
        this.updateSessionTimer();
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Set up global error handling
    window.addEventListener('error', (e) => {
        Logger.error('Unhandled error', e.error);
    });

    window.addEventListener('unhandledrejection', (e) => {
        Logger.error('Unhandled promise rejection', e.reason);
    });

    // Initialize app
    window.trafficApp = new TrafficSenderApp();
    
    Logger.info('🌐 Traffic Sender Pro is ready to use');
});
