const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function resetPassword(email, newPassword) {
  // Create Supabase client with service key for admin operations
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    console.log('🔍 Looking for user:', email);

    // First, get the user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.log('❌ User not found:', email);
      console.log('\n👥 Available users:');
      users.users
        .filter(u => u.email)
        .forEach(u => console.log(`  - ${u.email}`));
      return;
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);

    // Update user password using admin API
    console.log('🔄 Updating password using Supabase Auth Admin API...');
    
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword
    });

    if (error) {
      console.error('❌ Error updating password:', error);
      return;
    }

    console.log('✅ Password updated successfully!');
    console.log(`\n📋 Summary:`);
    console.log(`   User: ${user.email}`);
    console.log(`   New Password: ${newPassword}`);
    console.log(`   Updated: ${new Date().toISOString()}`);
    console.log(`\n🔐 The user can now login with the new password.`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const email = args[0];
const newPassword = args[1];

if (!email || !newPassword) {
  console.log('❌ Usage: node supabase_password_reset.js <email> <new_password>');
  console.log('📋 Example: node supabase_password_reset.js user@example.com newpassword123');
  process.exit(1);
}

console.log('🔐 Supabase Password Reset Tool');
console.log('==============================\n');

resetPassword(email, newPassword);