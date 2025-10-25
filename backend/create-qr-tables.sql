-- QR Code Management Tables for FarmerTitan Admin

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
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'delivered', 'cancelled')),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    delivered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tracking_number VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
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

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_qr_codes_modtime 
    BEFORE UPDATE ON qr_codes 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE OR REPLACE TRIGGER update_production_batches_modtime 
    BEFORE UPDATE ON production_batches 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE OR REPLACE TRIGGER update_delivery_requests_modtime 
    BEFORE UPDATE ON delivery_requests 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Sample data for testing
INSERT INTO production_batches (batch_code, quantity, supplier_name, notes, status) VALUES
('PRINT-2024-001', 100, 'QR Print Solutions', 'Initial test batch', 'delivered'),
('PRINT-2024-002', 250, 'Digital Labels Inc', 'Large production run', 'printing'),
('PRINT-2024-003', 50, 'Print Masters', 'Custom QR codes for special equipment', 'ordered')
ON CONFLICT (batch_code) DO NOTHING;