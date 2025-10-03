import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './src/lib/server/db/schema.js';

const DATABASE_URL = process.env.DATABASE_URL || 'local.db';

console.log('Running database migrations...');
console.log('Database URL:', DATABASE_URL);

const sqlite = new Database(DATABASE_URL);
const db = drizzle(sqlite, { schema });

try {
	await migrate(db, { migrationsFolder: './drizzle' });
	console.log('Migrations completed successfully!');
} catch (error) {
	console.error('Migration failed:', error);
	process.exit(1);
} finally {
	sqlite.close();
}