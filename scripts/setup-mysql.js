// This script initializes the MySQL database
import { initializeDatabase } from '../src/lib/initMysqlDb.js';

console.log('Setting up MySQL database...');
initializeDatabase()
  .then(() => {
    console.log('MySQL database setup complete!');
  })
  .catch(err => {
    console.error('Failed to set up MySQL database:', err);
    process.exit(1);
  }); 