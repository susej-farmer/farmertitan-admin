const dbConnection = require('./connection');
const logger = require('./logger');

class TransactionManager {
  static async executeTransaction(operations, context = {}) {
    const client = await dbConnection.getClient();
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    logger.db.transaction('BEGIN', { 
      transactionId, 
      operationCount: operations.length,
      context 
    });
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        const start = Date.now();
        
        try {
          const result = await client.query(operation.query, operation.params || []);
          const duration = Date.now() - start;
          
          logger.db.query(
            operation.query, 
            operation.params || [], 
            duration, 
            result.rowCount
          );
          
          results.push({
            operation: operation.name || `operation_${i}`,
            result,
            success: true
          });
          
        } catch (error) {
          logger.db.error(`Transaction operation ${i} failed`, error, {
            transactionId,
            operation: operation.name || `operation_${i}`,
            query: operation.query.substring(0, 100)
          });
          throw error;
        }
      }
      
      await client.query('COMMIT');
      
      logger.db.transaction('COMMIT', { 
        transactionId, 
        operationCount: operations.length,
        success: true,
        context 
      });
      
      return {
        success: true,
        transactionId,
        results
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      logger.db.transaction('ROLLBACK', { 
        transactionId, 
        operationCount: operations.length,
        error: error.message,
        context 
      });
      
      throw error;
    } finally {
      client.release();
    }
  }

  static async withTransaction(callback, context = {}) {
    const client = await dbConnection.getClient();
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    logger.db.transaction('BEGIN', { transactionId, context });
    
    try {
      await client.query('BEGIN');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      
      logger.db.transaction('COMMIT', { 
        transactionId, 
        success: true,
        context 
      });
      
      return result;
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      logger.db.transaction('ROLLBACK', { 
        transactionId, 
        error: error.message,
        context 
      });
      
      throw error;
    } finally {
      client.release();
    }
  }

  // Utility methods for common transaction patterns
  static async bulkInsert(tableName, records, conflictResolution = 'IGNORE') {
    if (!records || records.length === 0) {
      return { success: true, inserted: 0 };
    }

    const columns = Object.keys(records[0]);
    const placeholders = records.map((_, index) => 
      `(${columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`).join(', ')})`
    ).join(', ');

    const values = records.flatMap(record => columns.map(col => record[col]));
    
    let conflictClause = '';
    if (conflictResolution === 'IGNORE') {
      conflictClause = 'ON CONFLICT DO NOTHING';
    } else if (conflictResolution === 'UPDATE') {
      const updateClauses = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');
      conflictClause = `ON CONFLICT DO UPDATE SET ${updateClauses}`;
    }

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${placeholders}
      ${conflictClause}
      RETURNING *
    `;

    return await this.executeTransaction([{
      name: `bulk_insert_${tableName}`,
      query,
      params: values
    }], { 
      operation: 'bulk_insert', 
      table: tableName, 
      recordCount: records.length 
    });
  }

  static async bulkUpdate(tableName, records, keyColumn = 'id') {
    if (!records || records.length === 0) {
      return { success: true, updated: 0 };
    }

    const operations = records.map((record, index) => {
      const columns = Object.keys(record).filter(col => col !== keyColumn);
      const setClause = columns.map((col, colIndex) => 
        `${col} = $${colIndex + 2}`
      ).join(', ');
      
      const query = `
        UPDATE ${tableName} 
        SET ${setClause}
        WHERE ${keyColumn} = $1
        RETURNING *
      `;
      
      const params = [record[keyColumn], ...columns.map(col => record[col])];
      
      return {
        name: `bulk_update_${tableName}_${index}`,
        query,
        params
      };
    });

    return await this.executeTransaction(operations, { 
      operation: 'bulk_update', 
      table: tableName, 
      recordCount: records.length 
    });
  }

  static async cascadeDelete(tableName, id, relatedTables = []) {
    const operations = [];
    
    // Delete from related tables first (in reverse dependency order)
    for (const relatedTable of relatedTables.reverse()) {
      operations.push({
        name: `delete_${relatedTable.table}`,
        query: `DELETE FROM ${relatedTable.table} WHERE ${relatedTable.foreignKey} = $1`,
        params: [id]
      });
    }
    
    // Delete from main table last
    operations.push({
      name: `delete_${tableName}`,
      query: `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`,
      params: [id]
    });

    return await this.executeTransaction(operations, { 
      operation: 'cascade_delete', 
      table: tableName, 
      id 
    });
  }
}

module.exports = TransactionManager;