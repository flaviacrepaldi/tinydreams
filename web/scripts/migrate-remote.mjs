import {readFile} from 'node:fs/promises';
import {remoteD1} from './d1.mjs';
import {migratePlanner} from './migrate-planner.mjs';
const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
const binding=config.d1_databases.find(b=>b.binding==='DB');
if(!binding?.remote)throw Error('DB must be configured as remote.');
const db=remoteD1({accountId:config.account_id,databaseId:binding.database_id});
await migratePlanner(db);
console.log('Application schema is ready for deployment.');
