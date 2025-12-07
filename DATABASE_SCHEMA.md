# GMU Bookswap - Database Schema Documentation

## Overview

GMU Bookswap uses **Supabase (PostgreSQL)** as its database with built-in authentication.

**Database**: PostgreSQL 15+
**ORM/Client**: Supabase Python/JavaScript clients
**Authentication**: Supabase Auth (JWT-based)

---

## Tables

### 1. `books` Table

Primary table for storing book listings.

#### Schema

```sql
CREATE TABLE books (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(300),
  isbn VARCHAR(20),
  genre VARCHAR(100),
  material_type VARCHAR(50) CHECK (material_type IN ('book', 'journal', 'article')),
  trade_type VARCHAR(50) CHECK (trade_type IN ('buy', 'trade', 'borrow')),
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  condition VARCHAR(200),
  description TEXT CHECK (LENGTH(description) <= 5000),
  image_url VARCHAR(2000),
  seller_name VARCHAR(200) NOT NULL,
  seller_email VARCHAR(255) NOT NULL CHECK (seller_email ~* '^[a-zA-Z0-9._%+-]+@gmu\.edu$'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGSERIAL | NO | AUTO | Primary key, auto-increment |
| `title` | VARCHAR(500) | NO | - | Book title |
| `author` | VARCHAR(300) | YES | NULL | Author name |
| `isbn` | VARCHAR(20) | YES | NULL | ISBN-10 or ISBN-13 (cleaned, digits only) |
| `genre` | VARCHAR(100) | YES | NULL | Book genre/category |
| `material_type` | VARCHAR(50) | YES | NULL | Type: 'book', 'journal', or 'article' |
| `trade_type` | VARCHAR(50) | YES | NULL | Transaction type: 'buy', 'trade', or 'borrow' |
| `price` | DECIMAL(10,2) | NO | - | Listing price (must be >= 0) |
| `condition` | VARCHAR(200) | YES | NULL | Book condition description |
| `description` | TEXT | YES | NULL | Detailed description (max 5000 chars) |
| `image_url` | VARCHAR(2000) | YES | NULL | URL to book cover image (NO base64!) |
| `seller_name` | VARCHAR(200) | NO | - | Seller's full name |
| `seller_email` | VARCHAR(255) | NO | - | Seller's GMU email (must end with @gmu.edu) |
| `created_at` | TIMESTAMPTZ | NO | NOW() | When listing was created |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | When listing was last updated |

#### Indexes

**Required for performance:**

```sql
-- Index on seller_email for filtering user's own listings
CREATE INDEX idx_books_seller_email ON books(seller_email);

-- Index on created_at for sorting by newest
CREATE INDEX idx_books_created_at ON books(created_at DESC);

-- Index on ISBN for lookups
CREATE INDEX idx_books_isbn ON books(isbn) WHERE isbn IS NOT NULL;

-- Index on material_type for filtering
CREATE INDEX idx_books_material_type ON books(material_type) WHERE material_type IS NOT NULL;

-- Index on trade_type for filtering
CREATE INDEX idx_books_trade_type ON books(trade_type) WHERE trade_type IS NOT NULL;

-- Full-text search index on title and author
CREATE INDEX idx_books_search ON books USING GIN (
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(author, ''))
);
```

#### Constraints

```sql
-- Ensure price is non-negative
ALTER TABLE books ADD CONSTRAINT books_price_positive CHECK (price >= 0);

-- Ensure seller_email is GMU email
ALTER TABLE books ADD CONSTRAINT books_seller_email_gmu
  CHECK (seller_email ~* '^[a-zA-Z0-9._%+-]+@gmu\.edu$');

-- Ensure material_type is valid
ALTER TABLE books ADD CONSTRAINT books_material_type_valid
  CHECK (material_type IS NULL OR material_type IN ('book', 'journal', 'article'));

-- Ensure trade_type is valid
ALTER TABLE books ADD CONSTRAINT books_trade_type_valid
  CHECK (trade_type IS NULL OR trade_type IN ('buy', 'trade', 'borrow'));

-- Ensure description length
ALTER TABLE books ADD CONSTRAINT books_description_length
  CHECK (description IS NULL OR LENGTH(description) <= 5000);

-- Prevent base64 images
ALTER TABLE books ADD CONSTRAINT books_image_url_no_base64
  CHECK (image_url IS NULL OR NOT (image_url LIKE 'data:image%'));
```

#### Row-Level Security (RLS)

**CRITICAL: Must be enabled for production!**

```sql
-- Enable RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view all books
CREATE POLICY "books_select_all" ON books
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert books with their own email
CREATE POLICY "books_insert_own" ON books
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' = seller_email
  );

-- Policy: Users can update only their own listings
CREATE POLICY "books_update_own" ON books
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = seller_email);

-- Policy: Users can delete only their own listings
CREATE POLICY "books_delete_own" ON books
  FOR DELETE
  USING (auth.jwt() ->> 'email' = seller_email);
```

#### Triggers

```sql
-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### 2. `auth.users` Table

**Managed by Supabase Auth** - Do not modify directly!

This table stores user authentication data and is automatically managed by Supabase.

#### Key Fields Used

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | User ID (primary key) |
| `email` | VARCHAR | User's email address (must be @gmu.edu) |
| `email_confirmed_at` | TIMESTAMPTZ | When email was verified (null if not verified) |
| `encrypted_password` | VARCHAR | Hashed password |
| `created_at` | TIMESTAMPTZ | When user signed up |
| `updated_at` | TIMESTAMPTZ | Last profile update |

**Note**: Our application enforces GMU email domain (@gmu.edu) during signup and login.

---

## Data Types

### ENUM-like Values

We use CHECK constraints instead of PostgreSQL ENUMs for flexibility:

**Material Types:**
- `'book'` - Regular books
- `'journal'` - Academic journals
- `'article'` - Academic articles or papers

**Trade Types:**
- `'buy'` - Selling the book
- `'trade'` - Willing to trade
- `'borrow'` - Available for borrowing

---

## Relationships

Currently, the application has minimal relationships:

```
auth.users (Supabase)
    |
    | (1:N)
    |
  books
    └─ seller_email → auth.users.email
```

**Future Enhancement**: Could add explicit foreign key, but currently using email as the join field.

---

## Sample Data

```sql
-- Example book listing
INSERT INTO books (
  title, author, isbn, genre, material_type, trade_type,
  price, condition, description, seller_name, seller_email
) VALUES (
  'Introduction to Algorithms',
  'Thomas H. Cormen',
  '9780262033848',
  'Computer Science',
  'book',
  'buy',
  85.00,
  'Like New',
  'Comprehensive text on algorithms. Minimal highlighting, no wear.',
  'John Doe',
  'jdoe@gmu.edu'
);
```

---

## Migrations

### Initial Migration

```sql
-- Run this in Supabase SQL Editor to set up the database

-- 1. Create books table
CREATE TABLE books (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(300),
  isbn VARCHAR(20),
  genre VARCHAR(100),
  material_type VARCHAR(50),
  trade_type VARCHAR(50),
  price DECIMAL(10, 2) NOT NULL,
  condition VARCHAR(200),
  description TEXT,
  image_url VARCHAR(2000),
  seller_name VARCHAR(200) NOT NULL,
  seller_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add constraints
ALTER TABLE books ADD CONSTRAINT books_price_positive CHECK (price >= 0);
ALTER TABLE books ADD CONSTRAINT books_seller_email_gmu
  CHECK (seller_email ~* '^[a-zA-Z0-9._%+-]+@gmu\.edu$');
ALTER TABLE books ADD CONSTRAINT books_material_type_valid
  CHECK (material_type IS NULL OR material_type IN ('book', 'journal', 'article'));
ALTER TABLE books ADD CONSTRAINT books_trade_type_valid
  CHECK (trade_type IS NULL OR trade_type IN ('buy', 'trade', 'borrow'));
ALTER TABLE books ADD CONSTRAINT books_description_length
  CHECK (description IS NULL OR LENGTH(description) <= 5000);
ALTER TABLE books ADD CONSTRAINT books_image_url_no_base64
  CHECK (image_url IS NULL OR NOT (image_url LIKE 'data:image%'));

-- 3. Create indexes
CREATE INDEX idx_books_seller_email ON books(seller_email);
CREATE INDEX idx_books_created_at ON books(created_at DESC);
CREATE INDEX idx_books_isbn ON books(isbn) WHERE isbn IS NOT NULL;
CREATE INDEX idx_books_material_type ON books(material_type) WHERE material_type IS NOT NULL;
CREATE INDEX idx_books_trade_type ON books(trade_type) WHERE trade_type IS NOT NULL;
CREATE INDEX idx_books_search ON books USING GIN (
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(author, ''))
);

-- 4. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
CREATE POLICY "books_select_all" ON books
  FOR SELECT USING (true);

CREATE POLICY "books_insert_own" ON books
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = seller_email);

CREATE POLICY "books_update_own" ON books
  FOR UPDATE USING (auth.jwt() ->> 'email' = seller_email);

CREATE POLICY "books_delete_own" ON books
  FOR DELETE USING (auth.jwt() ->> 'email' = seller_email);
```

---

## Backup Strategy

### Recommended Approach

1. **Supabase Automatic Backups** (for paid plans)
   - Daily backups retained for 7 days
   - Point-in-time recovery

2. **Manual Export** (for free tier)
   ```bash
   # Export to SQL
   pg_dump -h db.your-project.supabase.co \
           -U postgres \
           -d postgres \
           --table books \
           > backup_$(date +%Y%m%d).sql

   # Restore from backup
   psql -h db.your-project.supabase.co \
        -U postgres \
        -d postgres \
        < backup_20251206.sql
   ```

3. **Scheduled Backups** via GitHub Actions
   - Set up weekly exports to S3/GitHub
   - Keep last 4 weeks of backups

---

## Performance Considerations

### Query Optimization

1. **Listing all books (with newest first)**
   ```sql
   SELECT * FROM books
   ORDER BY created_at DESC
   LIMIT 50;

   -- Uses index: idx_books_created_at
   ```

2. **Finding user's own listings**
   ```sql
   SELECT * FROM books
   WHERE seller_email = 'user@gmu.edu'
   ORDER BY created_at DESC;

   -- Uses index: idx_books_seller_email
   ```

3. **Full-text search**
   ```sql
   SELECT * FROM books
   WHERE to_tsvector('english', title || ' ' || COALESCE(author, ''))
         @@ to_tsquery('english', 'algorithms & computer');

   -- Uses index: idx_books_search
   ```

### Expected Performance

- **Current scale**: < 1000 books → All queries < 50ms
- **Medium scale**: 1,000-10,000 books → With indexes, < 100ms
- **Large scale**: > 10,000 books → Consider pagination at DB level

---

## Security Notes

1. ✅ **RLS Enabled** - Users can only modify their own listings
2. ✅ **Email Validation** - Only @gmu.edu emails allowed
3. ✅ **Price Validation** - Cannot be negative
4. ✅ **No Base64 Images** - Prevents database bloat
5. ✅ **Input Length Limits** - Prevents abuse
6. ⚠️ **No Direct DB Access** - All access through Supabase Auth

---

## Future Enhancements

### Potential Additional Tables

1. **`messages` Table** - For in-app messaging
   ```sql
   CREATE TABLE messages (
     id BIGSERIAL PRIMARY KEY,
     listing_id BIGINT REFERENCES books(id) ON DELETE CASCADE,
     sender_email VARCHAR(255) NOT NULL,
     recipient_email VARCHAR(255) NOT NULL,
     message TEXT NOT NULL,
     read_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **`favorites` Table** - Saved listings
   ```sql
   CREATE TABLE favorites (
     user_email VARCHAR(255) NOT NULL,
     book_id BIGINT REFERENCES books(id) ON DELETE CASCADE,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     PRIMARY KEY (user_email, book_id)
   );
   ```

3. **`reports` Table** - Report inappropriate listings
   ```sql
   CREATE TABLE reports (
     id BIGSERIAL PRIMARY KEY,
     book_id BIGINT REFERENCES books(id) ON DELETE CASCADE,
     reporter_email VARCHAR(255) NOT NULL,
     reason TEXT NOT NULL,
     status VARCHAR(50) DEFAULT 'pending',
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

---

## Maintenance

### Regular Tasks

**Weekly:**
- Review slow query logs
- Check index usage
- Monitor table size growth

**Monthly:**
- Vacuum analyze tables
- Review and archive old listings (optional)
- Check for orphaned data

**Quarterly:**
- Review RLS policies
- Update constraints if needed
- Performance testing with production data volume

---

**Last Updated**: December 6, 2025
**Schema Version**: 1.0.0
**Database**: Supabase (PostgreSQL 15+)
