"""Generate a schema-only local test fixture from an introspected v34 schema. No records."""
import json,sys
from pathlib import Path
s=json.load(open(sys.argv[1])); out=Path('tests/v34-schema.sql')
lines=['create role anon; create role authenticated; create role service_role; create schema auth; create schema private;',"create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",'create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);','grant usage on schema public,auth,private to authenticated;','set check_function_bodies=false;']
for t in s['tables']:
 cols=[]
 for c in s['columns']:
  if c['table_name']!=t:continue
  typ=c['udt_name'];typ=typ[1:]+'[]' if typ.startswith('_') else typ
  default=c['column_default']
  if c['column_name']=='id' and typ=='int8' and default is None:typ='bigserial'
  if default and 'nextval(' in default:default=None;typ='bigserial'
  cols.append('"'+c['column_name']+'" '+typ+(' default '+default if default else '')+(' not null' if c['is_nullable']=='NO' else ''))
 lines.append('create table public.'+t+'('+','.join(cols)+');')
for c in s['constraints']:
 if 'FOREIGN KEY' not in c['definition']:lines.append('alter table public.'+c['table_name']+' add constraint '+c['conname']+' '+c['definition']+';')
for c in s['constraints']:
 if 'FOREIGN KEY' in c['definition']:lines.append('alter table public.'+c['table_name']+' add constraint '+c['conname']+' '+c['definition']+';')
lines += [f['definition']+';' for f in s['functions']]
pending=s['views'][:]
while pending:
 ready=[v for v in pending if not any(o['viewname'] in v['definition'] for o in pending if o!=v)]
 if not ready: raise ValueError('View dependency cycle')
 for v in ready:
  lines.append('create view public.'+v['viewname']+' as '+v['definition']);pending.remove(v)
lines += [t['definition']+';' for t in s['triggers']]
for t in s['tables']:lines += ['alter table public.'+t+' enable row level security;','grant select,insert,update,delete on public.'+t+' to authenticated;']
for p in s['policies']:
 roles=', '.join(p['roles']) if isinstance(p['roles'],list) else p['roles'].strip('{}')
 lines.append('create policy "'+p['policyname']+'" on public.'+p['tablename']+' as '+p['permissive']+' for '+p['cmd']+' to '+roles+(' using ('+p['qual']+')' if p['qual'] else '')+(' with check ('+p['with_check']+')' if p['with_check'] else '')+';')
out.write_text('\n'.join(lines))
