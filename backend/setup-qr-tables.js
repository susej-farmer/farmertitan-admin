require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function setupQRTables() {
  try {
    console.log('🔌 Connecting to Supabase...');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    console.log('📋 Creating production_batches table...');
    
    // First, let's test if we can create a simple table
    const { data: testData, error: testError } = await supabase
      .from('production_batches')
      .select('*')
      .limit(1);
    
    console.log('Test query result:', { testData, testError });
    
    if (testError && testError.code === 'PGRST106') {
      console.log('❌ Table does not exist, need to create it manually in Supabase dashboard');
      console.log('');
      console.log('📝 SQL to execute in Supabase SQL Editor:');
      console.log(`
-- Production Batches Table
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

-- QR Codes Table
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

-- Delivery Requests Table
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
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    delivered_by UUID,
    tracking_number VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_farm_id ON qr_codes(farm_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_batch_id ON qr_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_production_batches_status ON production_batches(status);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_farm_id ON delivery_requests(farm_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON delivery_requests(status);

-- Sample data
INSERT INTO production_batches (batch_code, quantity, supplier_name, notes, status) VALUES
('PRINT-2024-001', 100, 'QR Print Solutions', 'Initial test batch', 'delivered'),
('PRINT-2024-002', 250, 'Digital Labels Inc', 'Large production run', 'printing'),
('PRINT-2024-003', 50, 'Print Masters', 'Custom QR codes for special equipment', 'ordered')
ON CONFLICT (batch_code) DO NOTHING;
      `);
      
      return false;
    } else {
      console.log('✅ Tables seem to exist, testing insert...');
      
      // Try to insert sample data
      const { data: insertData, error: insertError } = await supabase
        .from('production_batches')
        .upsert([
          {
            batch_code: 'PRINT-2024-TEST',
            quantity: 10,
            supplier_name: 'Test Supplier',
            notes: 'Test batch from setup script',
            status: 'ordered'
          }
        ], { onConflict: 'batch_code' })
        .select();
      
      if (insertError) {
        console.error('❌ Error inserting test data:', insertError);
        return false;
      } else {
        console.log('✅ Test data inserted successfully:', insertData);
        return true;
      }
    }
    
  } catch (error) {
    console.error('❌ Error setting up tables:', error);
    return false;
  }
}

// Run setup
setupQRTables().then(success => {
  if (success) {
    console.log('\n🎉 QR Code system is ready!');
    console.log('You can now test the production batch creation.');
  } else {
    console.log('\n⚠️ Manual table creation needed in Supabase dashboard.');
  }
  process.exit(0);
});