import Database from 'better-sqlite3';
import path from 'path';

// Initialize the database
const db = new Database(path.join(process.cwd(), 'emiliano.db'), {
    verbose: console.log
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

export default db;

// Helper functions for common database operations
export const query = <T = any>(sql: string, params: any[] = []): T[] => {
    return db.prepare(sql).all(params) as T[];
};

export const queryOne = <T = any>(sql: string, params: any[] = []): T | undefined => {
    return db.prepare(sql).get(params) as T | undefined;
};

export const execute = (sql: string, params: any[] = []): number => {
    return db.prepare(sql).run(params).changes;
};

export const executeMany = (sql: string, paramsArray: any[][]): number => {
    const stmt = db.prepare(sql);
    let totalChanges = 0;
    
    db.transaction(() => {
        paramsArray.forEach(params => {
            totalChanges += stmt.run(params).changes;
        });
    })();
    
    return totalChanges;
};

// Transaction helper
export const transaction = <T>(cb: () => T): T => {
    return db.transaction(cb)();
}; 