/**
 * Advanced Logging System
 * Professional logging with multiple levels, filtering, and export capabilities
 */

class Logger {
    static levels = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };

    static currentLevel = this.levels.INFO;
    static maxEntries = 2000;
    static logs = [];
    static autoScroll = true;
    static sessionId = this.generateSessionId();

    static debug(message, data = null) {
        this.log('DEBUG', message, data);
    }

    static info(message, data = null) {
        this.log('INFO', message, data);
    }

    static warn(message, data = null) {
        this.log('WARN', message, data);
    }

    static error(message, error = null) {
        const errorData = error ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
            ...(error.response && { status: error.response.status })
        } : null;
        
        this.log('ERROR', message, errorData);
    }

    static log(level, message, data = null) {
        // Check if level meets current threshold
        if (this.levels[level] < this.currentLevel) return;

        const timestamp = new Date();
        const logEntry = {
            id: this.generateId(),
            timestamp: timestamp,
            timeString: timestamp.toLocaleTimeString(),
            level: level,
            message: message,
            data: data,
            sessionId: this.sessionId
        };

        // Add to memory store
        this.logs.push(logEntry);
        
        // Maintain size limit
        if (this.logs.length > this.maxEntries) {
            this.logs = this.logs.slice(-this.maxEntries);
        }

        // Display in UI
        this.displayLog(logEntry);
        
        // Output to console
        this.consoleOutput(logEntry);
        
        // Auto-save to storage
        this.saveToStorage();

        // Update log count
        this.updateLogCount();
    }

    static displayLog(entry) {
        const logsContent = document.getElementById('logsContent');
        if (!logsContent) return;

        const logElement = document.createElement('div');
        logElement.className = `log-entry ${entry.level.toLowerCase()}`;
        logElement.setAttribute('data-level', entry.level);
        logElement.setAttribute('data-time', entry.timeString);
        
        logElement.innerHTML = `
            <span class="log-time">[${entry.timeString}]</span>
            <span class="log-level ${entry.level.toLowerCase()}">${entry.level}</span>
            <span class="log-message">${this.escapeHtml(entry.message)}</span>
            ${entry.data ? `<div class="log-data">${this.formatData(entry.data)}</div>` : ''}
        `;

        logsContent.appendChild(logElement);
        
        // Auto-scroll if enabled
        if (this.autoScroll) {
            logsContent.scrollTop = logsContent.scrollHeight;
        }

        // Update last log time
        this.updateLastLogTime(entry.timeString);
    }

    static consoleOutput(entry) {
        const styles = {
            'DEBUG': 'color: #888; background: #333; padding: 2px 4px; border-radius: 3px;',
            'INFO': 'color: #4CAF50; background: #333; padding: 2px 4px; border-radius: 3px;',
            'WARN': 'color: #FF9800; background: #333; padding: 2px 4px; border-radius: 3px;',
            'ERROR': 'color: #F44336; background: #333; padding: 2px 4px; border-radius: 3px;'
        };

        const style = styles[entry.level] || styles.INFO;
        
        console.groupCollapsed(
            `%c[${entry.timeString}] ${entry.level}%c ${entry.message}`,
            style,
            'color: inherit'
        );
        
        if (entry.data) {
            console.log('Data:', entry.data);
        }
        
        console.groupEnd();
    }

    static formatData(data) {
        if (typeof data === 'object') {
            try {
                return `<pre>${this.escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
            } catch (error) {
                return `<pre>${this.escapeHtml(String(data))}</pre>`;
            }
        }
        return this.escapeHtml(String(data));
    }

    static escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    static generateSessionId() {
        return 'session_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    static clear() {
        this.logs = [];
        const logsContent = document.getElementById('logsContent');
        if (logsContent) {
            logsContent.innerHTML = '';
            this.addSystemMessage('Logs cleared');
        }
        
        localStorage.removeItem('trafficLogs');
        this.updateLogCount();
    }

    static addSystemMessage(message) {
        const logsContent = document.getElementById('logsContent');
        if (logsContent) {
            const systemEntry = document.createElement('div');
            systemEntry.className = 'log-entry info system';
            systemEntry.innerHTML = `
                <span class="log-time">[${new Date().toLocaleTimeString()}]</span>
                <span class="log-level info">SYSTEM</span>
                <span class="log-message">${this.escapeHtml(message)}</span>
            `;
            logsContent.appendChild(systemEntry);
        }
    }

    static export() {
        const exportData = {
            exportedAt: new Date().toISOString(),
            sessionId: this.sessionId,
            totalLogs: this.logs.length,
            logs: this.logs
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json;charset=utf-8'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `traffic-logs-${this.sessionId}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.info('Logs exported successfully');
    }

    static setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.currentLevel = this.levels[level];
            this.info(`Log level set to: ${level}`);
            
            // Refresh display with new level
            this.refreshDisplay();
        }
    }

    static refreshDisplay() {
        const logsContent = document.getElementById('logsContent');
        if (!logsContent) return;

        logsContent.innerHTML = '';
        
        this.logs.forEach(log => {
            if (this.levels[log.level] >= this.currentLevel) {
                this.displayLog(log);
            }
        });
    }

    static filterLogs(filterText) {
        const logsContent = document.getElementById('logsContent');
        if (!logsContent) return;

        const entries = logsContent.querySelectorAll('.log-entry');
        const filter = filterText.toLowerCase();

        entries.forEach(entry => {
            const text = entry.textContent.toLowerCase();
            entry.style.display = text.includes(filter) ? 'block' : 'none';
        });
    }

    static getStats() {
        const levels = {};
        this.logs.forEach(log => {
            levels[log.level] = (levels[log.level] || 0) + 1;
        });

        return {
            total: this.logs.length,
            levels: levels,
            sessionId: this.sessionId,
            oldest: this.logs[0]?.timeString,
            newest: this.logs[this.logs.length - 1]?.timeString
        };
    }

    static getRecentLogs(count = 100) {
        return this.logs.slice(-count);
    }

    static saveToStorage() {
        try {
            // Save only recent logs to avoid storage limits
            const recentLogs = this.logs.slice(-500);
            localStorage.setItem('trafficLogs', JSON.stringify({
                logs: recentLogs,
                savedAt: new Date().toISOString(),
                sessionId: this.sessionId
            }));
        } catch (error) {
            // Silent fail for storage errors
        }
    }

    static loadFromStorage() {
        try {
            const saved = localStorage.getItem('trafficLogs');
            if (saved) {
                const data = JSON.parse(saved);
                this.logs = data.logs || [];
                this.sessionId = data.sessionId || this.sessionId;
                
                // Refresh display
                this.refreshDisplay();
                this.updateLogCount();
                
                this.info('Previous logs loaded from storage');
            }
        } catch (error) {
            this.warn('Failed to load logs from storage', error);
        }
    }

    static updateLogCount() {
        const logCountElement = document.getElementById('logCount');
        if (logCountElement) {
            logCountElement.textContent = this.logs.length.toLocaleString();
        }
    }

    static updateLastLogTime(timeString) {
        const lastLogTimeElement = document.getElementById('lastLogTime');
        if (lastLogTimeElement) {
            lastLogTimeElement.textContent = timeString;
        }
    }

    static measurePerformance(name, operation) {
        const startTime = performance.now();
        const result = operation();
        const duration = performance.now() - startTime;
        
        this.debug(`Performance: ${name}`, {
            duration: `${duration.toFixed(2)}ms`
        });
        
        return result;
    }
}

// Initialize logger when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Logger.loadFromStorage();
    Logger.info('Advanced logging system initialized');
    
    // Set up global error handling
    window.addEventListener('error', (e) => {
        Logger.error('Global error', e.error);
    });

    window.addEventListener('unhandledrejection', (e) => {
        Logger.error('Unhandled promise rejection', e.reason);
    });
});

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}
