/**
 * Setup script — creates the 'uploads' storage bucket in Supabase.
 * Run after `bun run db:push` to enable image uploads.
 *
 * Run: bun run scripts/setup-storage.ts
 */
import pg from "pg";
const { Client } = pg;

const connStr =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL?.split("?")[0] ||
  "postgresql://postgres.briqnbwwfztfphyivefq:Hazwanrais%4012@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres";

async function main() {
  console.log("🪣 Mencipta bucket 'uploads' di Supabase Storage...\n");
  const client = new Client({ connectionString: connStr, connectionTimeoutMillis: 10000 });

  try {
    await client.connect();
    console.log("✅ Berjaya sambung ke Supabase Postgres");

    // 1. Create bucket 'uploads' as public
    const r1 = await client.query(`
      INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
      VALUES ('uploads', 'uploads', true, now(), now())
      ON CONFLICT (id) DO UPDATE SET public = true
      RETURNING id, name, public;
    `);
    console.log("✅ Bucket dicipta/updated:", JSON.stringify(r1.rows[0]));

    // 2. Public read policy
    await client.query(`
      DROP POLICY IF EXISTS "uploads_public_read" ON storage.objects;
      CREATE POLICY "uploads_public_read" ON storage.objects
        FOR SELECT USING (bucket_id = 'uploads');
    `);
    console.log("✅ Policy read dicipta");

    // 3. Public insert policy
    await client.query(`
      DROP POLICY IF EXISTS "uploads_public_insert" ON storage.objects;
      CREATE POLICY "uploads_public_insert" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'uploads');
    `);
    console.log("✅ Policy insert dicipta");

    // 4. Public delete policy
    await client.query(`
      DROP POLICY IF EXISTS "uploads_public_delete" ON storage.objects;
      CREATE POLICY "uploads_public_delete" ON storage.objects
        FOR DELETE USING (bucket_id = 'uploads');
    `);
    console.log("✅ Policy delete dicipta");

    console.log("\n🎉 Bucket 'uploads' berjaya dicipta dan sedia diguna!");
    console.log("   Gambar yang dimuat naik akan disimpan di Supabase Storage (cloud).");
  } catch (e) {
    console.error("❌ Ralat:", e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
