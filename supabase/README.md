# Supabase Configuration & Database Files

This directory contains all the necessary files for setting up your local Supabase environment with production data.

## 📁 Directory Structure

```
supabase/
├── config.toml                                  # Supabase configuration
├── migrations/                                  # Database schema migrations
│   └── 20251208180005_remote_schema.sql        # Production schema (tables, functions, RLS policies)
├── seed.sql                                     # Production data (all tables populated)
└── auth_storage.sql                             # Auth users and storage schema
```

## 🚀 What Happens When You Run `supabase start`?

Supabase CLI automatically processes these files in order:

1. **`config.toml`** - Loads Supabase configuration (ports, services, etc.)
2. **`migrations/*.sql`** - Applies database migrations (creates tables, functions, policies)
3. **`seed.sql`** - Loads production data into all tables

## 📊 Production Data Included

The `seed.sql` file contains **real production data** from the DEV environment:

- **29 farms** with complete information
- **53 authenticated users** (from `auth.users`)
- **Equipment catalog** (makes, models, types, trims)
- **Maintenance schedules** and tasks
- **Production batches** with QR codes
- **All relational data** properly connected

## 🔄 How This Was Created

This production snapshot was created using:

```bash
# 1. Connected to production DEV environment
supabase link --project-ref pzsihfxdbpeuphvgmedh

# 2. Pulled the complete schema
supabase db pull --linked

# 3. Dumped all production data
supabase db dump --linked -f supabase/seed.sql --data-only --use-copy

# 4. Cleaned permissions issues for local compatibility
sed -i '/ALTER.*OWNER TO/d' supabase/migrations/*.sql
```

## 🔧 Updating Production Data

**To refresh local data with latest production:**

```bash
# From project root
supabase db reset
```

This will:
1. Drop all local tables
2. Re-run migrations
3. Re-load fresh production data from `seed.sql`

**To pull fresh data from production DEV:**

```bash
# 1. Make sure you're linked to production
supabase link --project-ref pzsihfxdbpeuphvgmedh

# 2. Dump fresh data
supabase db dump --linked -f supabase/seed.sql --data-only --use-copy

# 3. Apply locally
supabase db reset
```

## ⚠️ Important Notes

### Do NOT Modify These Files Directly

- **`migrations/*.sql`** - Auto-generated from production. Use `supabase migration new` to create new migrations.
- **`seed.sql`** - Auto-generated dump. Modify data in production, then re-dump.
- **`config.toml`** - Safe to modify for local configuration (ports, etc.)

### When to Create New Migrations

Create a new migration when you need to:
- Add/modify/drop tables
- Add/modify columns
- Create functions or triggers
- Change RLS policies
- Add indexes

```bash
# Create new migration
supabase migration new your_migration_name

# Edit the new file in supabase/migrations/
# Then apply it
supabase db reset
```

## 🔍 Inspecting the Data

**Supabase Studio** (Web UI):
```
http://localhost:54323
```

**Direct psql access:**
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres
```

**Check specific tables:**
```sql
-- Count farms
SELECT COUNT(*) FROM farm;

-- Count users
SELECT COUNT(*) FROM auth.users;

-- Check equipment
SELECT COUNT(*) FROM equipment;
```

## 🐛 Troubleshooting

**Problem:** `supabase start` fails with migration errors

**Solution:**
```bash
# Reset completely
supabase db reset
```

**Problem:** No data in tables after `supabase start`

**Solution:**
```bash
# Manually load seed data
cd ..  # Go to project root
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/seed.sql
```

**Problem:** Permission errors during migration

This usually means `ALTER OWNER` statements weren't cleaned. Run:
```bash
cd supabase/migrations
sed -i.bak '/ALTER.*OWNER TO/d' *.sql
rm *.sql.bak
cd ../..
supabase db reset
```

## 📚 Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
