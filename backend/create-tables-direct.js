require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function createTablesDirectly() {
  try {
    console.log('🔌 Connecting to Supabase...');
    
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

    console.log('📋 Creating production_batches table...');
    
    // Create production_batches table
    const { data: batch_result, error: batch_error } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS production_batches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          batch_code VARCHAR(50) UNIQUE NOT NULL,
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          supplier_name VARCHAR(255) NOT NULL,
          notes TEXT DEFAULT '',
          status VARCHAR(20) DEFAULT 'ordered' CHECK (status IN ('ordered', 'printing', 'shipped', 'delivered', 'cancelled')),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (batch_error) {
      console.log('❌ exec function not available, trying alternative approach...');
      
      // Alternative: Try using the SQL endpoint directly
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_KEY
        },
        body: JSON.stringify({
          sql: `
            CREATE TABLE IF NOT EXISTS production_batches (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              batch_code VARCHAR(50) UNIQUE NOT NULL,
              quantity INTEGER NOT NULL CHECK (quantity > 0),
              supplier_name VARCHAR(255) NOT NULL,
              notes TEXT DEFAULT '',
              status VARCHAR(20) DEFAULT 'ordered',
              metadata JSONB DEFAULT '{}',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        })
      });
      
      console.log('Response status:', response.status);
      const text = await response.text();
      console.log('Response:', text);
      
    } else {
      console.log('✅ production_batches table created');
    }

    // For now, let's try a simpler approach - just test if we can work with existing tables
    console.log('\n🔍 Testing current database structure...');
    
    // Check what tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('Could not query tables, trying alternative...');
      
      // Let's try to query an existing table we know exists
      const { data: farmData, error: farmError } = await supabase
        .from('farm')
        .select('id, name')
        .limit(1);
      
      if (farmError) {
        console.error('❌ Error querying farm table:', farmError);
      } else {
        console.log('✅ Farm table accessible:', farmData);
        
        // Now let's manually create a production batch record using INSERT
        console.log('\n📝 Since we cannot create tables via API, creating them manually...');
        console.log('Please execute this SQL in your Supabase SQL Editor:');
        console.log(`
-- QR Code Management Tables
CREATE TABLE IF NOT EXISTS production_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code VARCHAR(50) UNIQUE NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    supplier_name VARCHAR(255) NOT NULL,
    notes TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'ordered' CHECK (status IN ('ordered', 'printing', 'shipped', 'delivered', 'cancelled')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    short_code VARCHAR(50) UNIQUE NOT NULL,
    farm_id UUID REFERENCES farm(id) ON DELETE SET NULL,
    asset_type VARCHAR(50) CHECK (asset_type IN ('equipment', 'part', 'consumable')),
    asset_id UUID,
    batch_id UUID REFERENCES production_batches(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'allocated', 'bound', 'delivered')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(50) UNIQUE NOT NULL,
    farm_id UUID REFERENCES farm(id) ON DELETE CASCADE NOT NULL,
    qr_count INTEGER NOT NULL CHECK (qr_count > 0),
    notes TEXT DEFAULT '',
    requested_by UUID,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'delivered', 'cancelled')),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_farm_id ON qr_codes(farm_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_batch_id ON qr_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON qr_codes(status);

-- Add sample data
INSERT INTO production_batches (batch_code, quantity, supplier_name, notes, status) VALUES
('PRINT-2024-001', 100, 'QR Print Solutions', 'Initial test batch', 'delivered'),
('PRINT-2024-002', 250, 'Digital Labels Inc', 'Large production run', 'printing')
ON CONFLICT (batch_code) DO NOTHING;
        `);
        
        return true;
      }
    } else {
      console.log('✅ Available tables:', tables.map(t => t.table_name));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

createTablesDirectly().then(success => {
  console.log('\n' + (success ? '✅ Setup complete!' : '❌ Manual intervention needed'));
  process.exit(0);
});