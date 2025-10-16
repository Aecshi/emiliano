import fs from 'fs';
import path from 'path';
import db from './db';

const initializeDatabase = () => {
    try {
        // Read the SQL file
        const sqlFile = fs.readFileSync(path.join(process.cwd(), 'database.sql'), 'utf8');
        
        // Split the SQL file into individual statements
        // This handles the DELIMITER changes in the original SQL
        const statements = sqlFile
            .replace(/DELIMITER \/\//g, '') // Remove DELIMITER changes
            .replace(/\/\/\s*DELIMITER ;/g, '') // Remove DELIMITER resets
            .split(';')
            .map(statement => statement.trim())
            .filter(statement => statement.length > 0);

        // Execute each statement in a transaction
        db.transaction(() => {
            statements.forEach(statement => {
                try {
                    // Skip MySQL-specific syntax
                    if (statement.includes('AUTO_INCREMENT') ||
                        statement.includes('ON UPDATE CURRENT_TIMESTAMP') ||
                        statement.includes('GENERATED ALWAYS AS')) {
                        console.log('Skipping MySQL-specific statement');
                        return;
                    }
                    
                    // Convert MySQL-specific types to SQLite types
                    const sqliteStatement = statement
                        .replace(/INT PRIMARY KEY AUTO_INCREMENT/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
                        .replace(/DATETIME/g, 'TEXT')
                        .replace(/TIMESTAMP/g, 'TEXT')
                        .replace(/DECIMAL\(\d+,\d+\)/g, 'REAL')
                        .replace(/BOOLEAN/g, 'INTEGER')
                        .replace(/ENUM\([^)]+\)/g, 'TEXT')
                        .replace(/JSON/g, 'TEXT');

                    db.prepare(sqliteStatement).run();
                    console.log('Successfully executed statement');
                } catch (error) {
                    console.error('Error executing statement:', error);
                    console.error('Statement:', statement);
                }
            });
        })();

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

// Run the initialization
initializeDatabase(); 