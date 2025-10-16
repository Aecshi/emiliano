import mysql from 'mysql2/promise';

// Create a connection pool
const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'your_password_here', // Change this to your MySQL password
  database: 'emiliano_eats',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper functions for common database operations
export const query = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
};

export const queryOne = async <T = any>(sql: string, params: any[] = []): Promise<T | undefined> => {
  const [rows] = await pool.execute(sql, params);
  const rowsArray = rows as any[];
  return rowsArray.length > 0 ? rowsArray[0] as T : undefined;
};

export const execute = async (sql: string, params: any[] = []): Promise<number> => {
  const [result] = await pool.execute(sql, params);
  return (result as any).affectedRows;
};

export const executeMany = async (sql: string, paramsArray: any[][]): Promise<number> => {
  let totalChanges = 0;
  
  // Start transaction
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    for (const params of paramsArray) {
      const [result] = await connection.execute(sql, params);
      totalChanges += (result as any).affectedRows;
    }
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  
  return totalChanges;
};

// Transaction helper
export const transaction = async <T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export default pool; 