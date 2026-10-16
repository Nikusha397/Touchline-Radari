import { getDatabase } from '../lib/node-storage';
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

export function getDb() {
  return drizzle(async (sql, params, method) => {
    const statement = getDatabase().connection.prepare(sql);
    if (method === 'run') { statement.run(...params); return { rows: [] }; }
    statement.setReturnArrays(true);
    const rows = method === 'get' ? statement.get(...params) : statement.all(...params);
    return { rows: rows as unknown[] };
  }, { schema });
}
