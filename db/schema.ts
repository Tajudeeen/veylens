import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
// Only keyed rate-window digests and counters. No IPs, identifiers, or evidence.
export const collectionBudgets=sqliteTable('collection_budgets',{
 key:text('key').primaryKey(),used:integer('used').notNull(),expiresAt:integer('expires_at').notNull(),
},table=>[index('collection_budgets_expiry').on(table.expiresAt)]);
