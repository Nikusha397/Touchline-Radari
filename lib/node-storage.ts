import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

export class Statement {
  readonly connection: DatabaseSync;
  readonly sql: string;
  readonly values: SQLInputValue[];
  constructor(connection: DatabaseSync, sql: string, values: SQLInputValue[] = []) { this.connection = connection; this.sql = sql; this.values = values; }
  bind(...values: SQLInputValue[]) { return new Statement(this.connection, this.sql, values); }
  async first<T = Record<string, unknown>>() { return (this.connection.prepare(this.sql).get(...this.values) ?? null) as T | null; }
  async all<T = Record<string, unknown>>() { return { results: this.connection.prepare(this.sql).all(...this.values) as T[], success: true }; }
  execute() {
    const statement = this.connection.prepare(this.sql);
    if (statement.columns().length) return { success: true, results: statement.all(...this.values), meta: { changes: 0, last_row_id: 0 } };
    const result = statement.run(...this.values);
    return { success: true, results: [], meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }
  async run() { return this.execute(); }
}

export class ApplicationDatabase {
  readonly connection: DatabaseSync;
  constructor(connection: DatabaseSync) { this.connection = connection; }
  prepare(sql: string) { return new Statement(this.connection, sql); }
  async batch(statements: Statement[]) {
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      const results = statements.map(statement => {
        if (statement.connection !== this.connection) throw new Error('Invalid transaction connection');
        return statement.execute();
      });
      this.connection.exec('COMMIT');
      return results;
    } catch (error) { this.connection.exec('ROLLBACK'); throw error; }
  }
}

export function migrate(connection: DatabaseSync, directory: string) {
  connection.exec('CREATE TABLE IF NOT EXISTS _app_migrations (name TEXT PRIMARY KEY)');
  for (const name of readdirSync(directory).filter(name => /^\d+.*\.sql$/.test(name)).sort()) {
    connection.exec('BEGIN IMMEDIATE');
    try {
      if (!connection.prepare('SELECT name FROM _app_migrations WHERE name=?').get(name)) {
        // A historical customer grant is not a schema migration.
        if (name !== '0003_promotional_contact_credits.sql') connection.exec(readFileSync(path.join(directory, name), 'utf8'));
        connection.prepare('INSERT INTO _app_migrations(name) VALUES (?)').run(name);
      }
      connection.exec('COMMIT');
    } catch (error) { connection.exec('ROLLBACK'); throw error; }
  }
}

const state = globalThis as typeof globalThis & { touchlineDatabase?: ApplicationDatabase; touchlineMigrationRevision?: number };
export function getDatabase() {
  if (!state.touchlineDatabase) {
    const filename = path.resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH || '.data/touchline.sqlite');
    mkdirSync(path.dirname(filename), { recursive: true });
    const connection = new DatabaseSync(filename);
    connection.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON');
    migrate(connection, path.join(process.cwd(), 'drizzle'));
    state.touchlineDatabase = new ApplicationDatabase(connection);
  }
  if(state.touchlineMigrationRevision!==7){migrate(state.touchlineDatabase.connection,path.join(process.cwd(),'drizzle'));state.touchlineMigrationRevision=7;}
  return state.touchlineDatabase;
}

export class PrivateBucket {
  readonly root: string;
  constructor(root: string) { this.root = root; }
  private filename(key: string) {
    if (!key || key.split('/').some(part => !part || part === '.' || part === '..') || /[\\:\0]/.test(key)) throw new Error('Invalid storage key');
    return path.join(this.root, key);
  }
  async put(key: string, value: ArrayBuffer, _options?: { httpMetadata: { contentType: string } }) {
    const filename = this.filename(key);
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, new Uint8Array(value), { mode: 0o600 });
  }
  async get(key: string) {
    try {
      const bytes = new Uint8Array(await readFile(this.filename(key)));
      return { body: bytes, arrayBuffer: async () => bytes.buffer };
    } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  }
  async delete(key: string) {
    try { await unlink(this.filename(key)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
}

export const nodeRuntime = {
  get DB() { return getDatabase(); },
  get BUCKET() { return new PrivateBucket(path.resolve(/* turbopackIgnore: true */ process.env.UPLOADS_PATH || '.data/uploads')); },
  get RESEND_API_KEY() { return process.env.RESEND_API_KEY; },
  get MAIL_FROM() { return process.env.MAIL_FROM; },
};
