import fs from 'fs';
import path from 'path';

const HISTORY_FILE = path.join(process.cwd(), '.bosdb-query-history.json');
const SAVED_QUERIES_FILE = path.join(process.cwd(), '.bosdb-saved-queries.json');

export interface QueryHistoryEntry {
    id: string;
    connectionId: string;
    connectionName: string;
    query: string;
    executedAt: string;
    executionTime: number;
    rowCount: number;
    success: boolean;
    error?: string;
}

export interface SavedQuery {
    id: string;
    name: string;
    description?: string;
    query: string;
    connectionId?: string;
    createdAt: string;
    updatedAt: string;
}

// Query History Management
let queryHistory: QueryHistoryEntry[] = [];

export function loadQueryHistory(): QueryHistoryEntry[] {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
            queryHistory = JSON.parse(data);
            console.log(`[QueryHistory] Loaded ${queryHistory.length} entries`);
        }
    } catch (error) {
        console.error('[QueryHistory] Failed to load:', error);
        queryHistory = [];
    }
    return queryHistory;
}

export function saveQueryHistory() {
    try {
        // Keep only last 100 queries
        const recentHistory = queryHistory.slice(-100);
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(recentHistory, null, 2));
        console.log(`[QueryHistory] Saved ${recentHistory.length} entries`);
    } catch (error) {
        console.error('[QueryHistory] Failed to save:', error);
    }
}

export function addQueryToHistory(entry: Omit<QueryHistoryEntry, 'id'>) {
    const historyEntry: QueryHistoryEntry = {
        ...entry,
        id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    queryHistory.push(historyEntry);
    saveQueryHistory();
    return historyEntry;
}

export function getQueryHistory(connectionId?: string, limit = 50): QueryHistoryEntry[] {
    loadQueryHistory();

    let filtered = queryHistory;
    if (connectionId) {
        filtered = queryHistory.filter(entry => entry.connectionId === connectionId);
    }

    // Return most recent first
    return filtered.slice(-limit).reverse();
}

export function clearQueryHistory(connectionId?: string) {
    if (connectionId) {
        queryHistory = queryHistory.filter(entry => entry.connectionId !== connectionId);
    } else {
        queryHistory = [];
    }
    saveQueryHistory();
}

// Saved Queries Management
let savedQueries: SavedQuery[] = [];

export function loadSavedQueries(): SavedQuery[] {
    try {
        if (fs.existsSync(SAVED_QUERIES_FILE)) {
            const data = fs.readFileSync(SAVED_QUERIES_FILE, 'utf-8');
            savedQueries = JSON.parse(data);
            console.log(`[SavedQueries] Loaded ${savedQueries.length} queries`);
        }
    } catch (error) {
        console.error('[SavedQueries] Failed to load:', error);
        savedQueries = [];
    }
    return savedQueries;
}

export function saveSavedQueries() {
    try {
        fs.writeFileSync(SAVED_QUERIES_FILE, JSON.stringify(savedQueries, null, 2));
        console.log(`[SavedQueries] Saved ${savedQueries.length} queries`);
    } catch (error) {
        console.error('[SavedQueries] Failed to save:', error);
    }
}

export function createSavedQuery(query: Omit<SavedQuery, 'id' | 'createdAt' | 'updatedAt'>): SavedQuery {
    const now = new Date().toISOString();
    const savedQuery: SavedQuery = {
        ...query,
        id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
    };

    savedQueries.push(savedQuery);
    saveSavedQueries();
    return savedQuery;
}

export function getSavedQueries(connectionId?: string): SavedQuery[] {
    loadSavedQueries();

    if (connectionId) {
        return savedQueries.filter(q => !q.connectionId || q.connectionId === connectionId);
    }

    return savedQueries;
}

export function updateSavedQuery(id: string, updates: Partial<Omit<SavedQuery, 'id' | 'createdAt'>>): SavedQuery | null {
    const index = savedQueries.findIndex(q => q.id === id);
    if (index === -1) return null;

    savedQueries[index] = {
        ...savedQueries[index],
        ...updates,
        updatedAt: new Date().toISOString(),
    };

    saveSavedQueries();
    return savedQueries[index];
}

export function deleteSavedQuery(id: string): boolean {
    const initialLength = savedQueries.length;
    savedQueries = savedQueries.filter(q => q.id !== id);

    if (savedQueries.length < initialLength) {
        saveSavedQueries();
        return true;
    }

    return false;
}

// Initialize on module load
loadQueryHistory();
loadSavedQueries();
