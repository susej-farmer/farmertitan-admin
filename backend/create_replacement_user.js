const { Client } = require('pg');
require('dotenv').config();

async function createReplacementUser(email, password) {
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

    // First, let's see the current user
    console.log(`🔍 Checking current user: ${email}`);
    
    const currentUserResult = await client.query(
      'SELECT id, email, created_at, email_confirmed_at FROM auth.users WHERE email = $1',
      [email]
    );

    if (currentUserResult.rows.length === 0) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    const currentUser = currentUserResult.rows[0];
    console.log(`✅ Found current user: ${currentUser.email} (ID: ${currentUser.id})`);

    // Delete the current user completely
    console.log('🗑️  Deleting current user...');
    
    // Delete from auth.users
    await client.query('DELETE FROM auth.users WHERE id = $1', [currentUser.id]);
    console.log('✅ Deleted from auth.users');

    // Check if there's a user profile and delete it too
    const profileResult = await client.query(
      'SELECT id FROM user_profiles WHERE id = $1',
      [currentUser.id]
    );
    
    if (profileResult.rows.length > 0) {
      await client.query('DELETE FROM user_profiles WHERE id = $1', [currentUser.id]);
      console.log('✅ Deleted user profile');
    }

    // Now create a new user with the same email but different ID
    console.log('👤 Creating new user...');
    
    // Generate a new UUID
    const { v4: uuidv4 } = require('crypto').randomUUID ? require('crypto') : require('uuid');
    const newUserId = require('crypto').randomUUID();
    
    // Hash the password properly
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const now = new Date().toISOString();
    
    // Insert new user
    const insertResult = await client.query(`
      INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at, 
        created_at, updated_at, confirmation_token, aud, role
      ) VALUES (
        $1, $2, $3, $4, $5, $6, '', 'authenticated', 'authenticated'
      ) RETURNING id, email
    `, [newUserId, email, hashedPassword, now, now, now]);

    const newUser = insertResult.rows[0];
    console.log(`✅ Created new user: ${newUser.email} (ID: ${newUser.id})`);

    console.log(`\n📋 Summary:`);
    console.log(`   Old User ID: ${currentUser.id}`);
    console.log(`   New User ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Created: ${now}`);
    console.log(`\n🔐 The user can now login with the new password.`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

// Install required dependencies
async function installDependencies() {
  const { execSync } = require('child_process');
  
  try {
    console.log('📦 Installing required dependencies...');
    execSync('npm install bcrypt uuid', { stdio: 'inherit' });
    console.log('✅ Dependencies installed');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const email = args[0];
const password = args[1];

if (!email || !password) {
  console.log('❌ Usage: node create_replacement_user.js <email> <new_password>');
  console.log('📋 Example: node create_replacement_user.js user@example.com newpassword123');
  process.exit(1);
}

console.log('🔄 User Replacement Tool');
console.log('=========================\n');

// Check if bcrypt is available, install if needed
try {
  require('bcrypt');
  require('uuid');
} catch (error) {
  console.log('📦 Missing dependencies, installing...');
  installDependencies();
}

createReplacementUser(email, password);