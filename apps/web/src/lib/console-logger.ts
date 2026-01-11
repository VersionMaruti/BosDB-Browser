/**
 * Colorful Console Logger for Browser
 * Beautiful, organized, color-coded logs
 */

// Browser console color styles
const STYLES = {
    AUTH: 'background: #9b59b6; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold',
    DB: 'background: #3498db; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold',
    DEBUG: 'background: #f39c12; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold',
    API: 'background: #27ae60; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold',
    VCS: 'background: #34495e; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold',
    ERROR: 'background: #e74c3c; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold',
    WARN: 'background: #e67e22; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold',
    INFO: 'background: #95a5a6; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold',
    SUCCESS: 'background: #2ecc71; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold'
};

const EMOJIS = {
    AUTH: '🔐',
    DB: '💾',
    DEBUG: '🐛',
    API: '🌐',
    VCS: '📝',
    ERROR: '❌',
    WARN: '⚠️',
    INFO: 'ℹ️',
    SUCCESS: '✅'
};

export type LogCategory = keyof typeof STYLES;

class ColorfulLogger {
    /**
     * Log with category and color
     */
    private log(category: LogCategory, message: string, ...args: any[]) {
        const emoji = EMOJIS[category];
        const style = STYLES[category];
        const timestamp = new Date().toLocaleTimeString();

        console.log(
            `%c${emoji} ${category}%c [${timestamp}] ${message}`,
            style,
            'color: inherit',
            ...args
        );
    }

    /**
     * Auth logs - Purple 🔐
     */
    auth(message: string, ...args: any[]) {
        this.log('AUTH', message, ...args);
    }

    /**
     * Database logs - Blue 💾
     */
    db(message: string, ...args: any[]) {
        this.log('DB', message, ...args);
    }

    /**
     * API logs - Green 🌐
     */
    api(message: string, ...args: any[]) {
        this.log('API', message, ...args);
    }

    /**
     * Debug logs - Orange 🐛
     */
    debug(message: string, ...args: any[]) {
        this.log('DEBUG', message, ...args);
    }

    /**
     * VCS logs - Dark Gray 📝
     */
    vcs(message: string, ...args: any[]) {
        this.log('VCS', message, ...args);
    }

    /**
     * Error logs - Red ❌
     */
    error(message: string, ...args: any[]) {
        this.log('ERROR', message, ...args);
        if (args.length > 0) {
            console.error(...args);
        }
    }

    /**
     * Warning logs - Dark Orange ⚠️
     */
    warn(message: string, ...args: any[]) {
        this.log('WARN', message, ...args);
    }

    /**
     * Info logs - Gray ℹ️
     */
    info(message: string, ...args: any[]) {
        this.log('INFO', message, ...args);
    }

    /**
     * Success logs - Bright Green ✅
     */
    success(message: string, ...args: any[]) {
        this.log('SUCCESS', message, ...args);
    }

    /**
     * Visual separator
     */
    separator(title?: string) {
        if (title) {
            console.log(
                `%c╔${'═'.repeat(78)}╗\n║ ${title.padEnd(76)} ║\n╚${'═'.repeat(78)}╝`,
                'color: #3498db; font-weight: bold'
            );
        } else {
            console.log(`%c${'─'.repeat(80)}`, 'color: #95a5a6');
        }
    }

    /**
     * Group logs together
     */
    group(title: string, emoji?: string) {
        console.group(`${emoji || EMOJIS.INFO} ${title}`);
    }

    groupEnd() {
        console.groupEnd();
    }

    /**
     * Table for structured data
     */
    table(data: any) {
        console.table(data);
    }
}

// Export singleton
export const log = new ColorfulLogger();

// Also export as default
export default log;
