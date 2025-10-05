// app/nextjs/lib/db.ts
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool({
  connectionString,
  // Neon (Postgres in der Cloud) braucht SSL:
  ssl: { rejectUnauthorized: false }
});
