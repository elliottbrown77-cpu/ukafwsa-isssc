import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
export async function loadDB(){
 const db=new PGlite();
 await db.exec(readFileSync(new URL('./v34-schema.sql',import.meta.url),'utf8'));
 for(const f of readdirSync('supabase/migrations').sort()) await db.exec(readFileSync('supabase/migrations/'+f,'utf8'));
 return db;
}
if(process.argv[1].endsWith('load-db.mjs')){try{const db=await loadDB();console.log('v34 schema and v35 migration loaded');await db.close()}catch(e){console.error(e.message);console.error(e.query?.slice(-2000));process.exit(1)}}
