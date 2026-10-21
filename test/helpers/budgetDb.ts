import {DatabaseSync} from 'node:sqlite';
import type {D1Database,D1PreparedStatement} from '@cloudflare/workers-types';
/** Actual SQLite behind the small D1 surface used by admission. Unsupported methods throw. */
export function budgetDb(sql:DatabaseSync):D1Database{
 return {
  prepare(query:string):D1PreparedStatement{
   let values:Array<string|number>=[];
   const statement:D1PreparedStatement={
    bind(...input:unknown[]){values=input.map(value=>{if(typeof value!=='string'&&typeof value!=='number')throw new Error('Unexpected bind value');return value;});return statement;},
    async first<T>(column?:string):Promise<T|null>{const row=sql.prepare(query).get(...values);return row?(column?row[column]:row) as T:null;},
    async run(){const result=sql.prepare(query).run(...values);return {success:true as const,results:[],meta:{duration:0,size_after:0,rows_read:0,rows_written:Number(result.changes),last_row_id:Number(result.lastInsertRowid),changed_db:true,changes:Number(result.changes)}};},
    async all(){throw new Error('Unused test method');},async raw(){throw new Error('Unused test method');},
   };return statement;
  },async batch(){throw new Error('Unused test method');},async exec(){throw new Error('Unused test method');},withSession(){throw new Error('Unused test method');},async dump(){throw new Error('Unused test method');},
 };
}
