import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// Load .env with override so the Supabase connection string takes precedence
// over any system-level DATABASE_URL (the sandbox pre-sets a SQLite path).
config({ path: '.env', override: true })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
