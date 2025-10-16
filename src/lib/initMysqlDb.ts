import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

export const initializeDatabase = async () => {
  try {
    // Database connection settings
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'your_password_here', // Change this to your MySQL password
    });

    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS emiliano_eats`);
    await connection.query(`USE emiliano_eats`);

    console.log('Connected to MySQL database');

    // Read the SQL file
    const sqlFile = fs.readFileSync(path.join(process.cwd(), 'database.sql'), 'utf8');
    
    // MySQL can execute multiple statements at once with multipleStatements: true
    const statements = sqlFile.split(';').filter(statement => statement.trim().length > 0);
    
    // Execute each SQL statement
    for (const statement of statements) {
      try {
        // Skip empty statements
        if (!statement.trim()) continue;
        
        // Remove MySQL-specific syntax that might cause issues
        let processedStatement = statement
          .replace(/DELIMITER \/\//g, '')
          .replace(/\/\/\s*DELIMITER ;/g, '')
          .trim();
          
        if (!processedStatement) continue;
        
        // Execute the statement
        await connection.query(processedStatement);
        console.log('Successfully executed statement');
      } catch (error) {
        console.error('Error executing statement:', error);
        // Continue to next statement instead of failing completely
      }
    }

    // Close the connection
    await connection.end();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// For direct execution of the script
if (require.main === module) {
  initializeDatabase();
}

export default initializeDatabase; 