require('dotenv').config();
const dbConnection = require('./src/database/connection');

async function createQRTables() {
  try {
    console.log('Connecting to database...');
    const supabase = dbConnection.getClient();
    
    console.log('Creating production_batches table...');
    // Create production_batches table
    const { error: batchError } = await supabase.rpc('exec_sql', {
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
    
    if (batchError) {
      console.error('Error creating production_batches table:', batchError);
    } else {
      console.log('✓ production_batches table created successfully');
    }

    console.log('Creating qr_codes table...');
    // Create qr_codes table  
    const { error: qrError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    
    if (qrError) {
      console.error('Error creating qr_codes table:', qrError);
    } else {
      console.log('✓ qr_codes table created successfully');
    }

    console.log('Creating delivery_requests table...');
    // Create delivery_requests table
    const { error: deliveryError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    
    if (deliveryError) {
      console.error('Error creating delivery_requests table:', deliveryError);
    } else {
      console.log('✓ delivery_requests table created successfully');
    }

    console.log('Creating indexes...');
    // Create indexes
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_qr_codes_farm_id ON qr_codes(farm_id);
        CREATE INDEX IF NOT EXISTS idx_qr_codes_batch_id ON qr_codes(batch_id);
        CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON qr_codes(status);
        CREATE INDEX IF NOT EXISTS idx_qr_codes_asset_type ON qr_codes(asset_type);
        CREATE INDEX IF NOT EXISTS idx_qr_codes_created_at ON qr_codes(created_at);
        
        CREATE INDEX IF NOT EXISTS idx_production_batches_status ON production_batches(status);
        CREATE INDEX IF NOT EXISTS idx_production_batches_supplier ON production_batches(supplier_name);
        CREATE INDEX IF NOT EXISTS idx_production_batches_created_at ON production_batches(created_at);
        
        CREATE INDEX IF NOT EXISTS idx_delivery_requests_farm_id ON delivery_requests(farm_id);
        CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON delivery_requests(status);
        CREATE INDEX IF NOT EXISTS idx_delivery_requests_requested_by ON delivery_requests(requested_by);
        CREATE INDEX IF NOT EXISTS idx_delivery_requests_created_at ON delivery_requests(created_at);
      `
    });
    
    if (indexError) {
      console.error('Error creating indexes:', indexError);
    } else {
      console.log('✓ Indexes created successfully');
    }

    console.log('Inserting sample data...');
    // Insert sample data
    const { error: sampleError } = await supabase
      .from('production_batches')
      .upsert([
        {
          batch_code: 'PRINT-2024-001',
          quantity: 100,
          supplier_name: 'QR Print Solutions',
          notes: 'Initial test batch',
          status: 'delivered'
        },
        {
          batch_code: 'PRINT-2024-002', 
          quantity: 250,
          supplier_name: 'Digital Labels Inc',
          notes: 'Large production run',
          status: 'printing'
        },
        {
          batch_code: 'PRINT-2024-003',
          quantity: 50,
          supplier_name: 'Print Masters',
          notes: 'Custom QR codes for special equipment',
          status: 'ordered'
        }
      ], { onConflict: 'batch_code' });
    
    if (sampleError) {
      console.error('Error inserting sample data:', sampleError);
    } else {
      console.log('✓ Sample data inserted successfully');
    }

    console.log('\n🎉 QR Code tables created successfully!');
    console.log('Tables created:');
    console.log('- production_batches');
    console.log('- qr_codes');
    console.log('- delivery_requests');
    console.log('\nYou can now use the QR code management features.');

  } catch (error) {
    console.error('Error setting up QR tables:', error);
  }
}

// Run the setup
createQRTables();