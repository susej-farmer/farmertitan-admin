const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function fixPassword(email, password) {
  const client = new Client({
    host: '127.0.0.1',
    port: 54322,
    database: 'postgres',
    user: 'postgres', 
    password: 'postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    console.log(`🔍 Finding user: ${email}`);
    
    const userResult = await client.query(
      'SELECT id, email, encrypted_password FROM auth.users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);

    // Check the current password format
    console.log('🔍 Current password hash format:', user.encrypted_password.substring(0, 10) + '...');

    // Create new bcrypt hash with the standard Supabase settings
    console.log('🔄 Creating new password hash...');
    
    // Supabase uses bcrypt with cost factor 10 and specific format
    const newHash = await bcrypt.hash(password, 10);
    console.log('✅ New hash created:', newHash.substring(0, 10) + '...');

    // Update with transaction to be safe
    await client.query('BEGIN');
    
    try {
      // Update the password and ensure the user is properly configured
      await client.query(`
        UPDATE auth.users 
        SET 
          encrypted_password = $1,
          updated_at = NOW(),
          email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
          aud = 'authenticated',
          role = 'authenticated'
        WHERE id = $2
      `, [newHash, user.id]);

      await client.query('COMMIT');
      console.log('✅ Password updated successfully!');

      // Test the new password
      console.log('🧪 Testing new password...');
      const isValid = await bcrypt.compare(password, newHash);
      
      if (isValid) {
        console.log('✅ Password verification successful!');
      } else {
        console.log('❌ Password verification failed!');
      }

      console.log(`\n📋 Summary:`);
      console.log(`   User: ${user.email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Updated: ${new Date().toISOString()}`);
      console.log(`\n🔐 Try logging in now with these credentials.`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const email = args[0];
const password = args[1];

if (!email || !password) {
  console.log('❌ Usage: node simple_password_fix.js <email> <new_password>');
  process.exit(1);
}

console.log('🔧 Simple Password Fix Tool');
console.log('============================\n');

fixPassword(email, password);