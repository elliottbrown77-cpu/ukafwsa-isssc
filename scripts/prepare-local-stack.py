"""Prepare an isolated Supabase project using real Auth and captured v34 grants. No remote writes."""
import json,re,subprocess,shutil
from pathlib import Path
root=Path(__file__).resolve().parent.parent
stack=root/'.local/stack';stack.mkdir(parents=True,exist_ok=True)
cli=root/'node_modules/supabase/bin/supabase'
if not (stack/'supabase/config.toml').exists():subprocess.run([str(cli),'init','--workdir',str(stack)],check=True)
p=stack/'supabase/config.toml';s=p.read_text().replace('project_id = "stack"','project_id = "isssc-v35-local"').replace('sql_paths = ["./seed.sql"]','sql_paths = []').replace('http://127.0.0.1:3000','http://127.0.0.1:53535').replace('https://127.0.0.1:3000','http://127.0.0.1:53535')
s=re.sub(r'(\[analytics\]\s*\nenabled = )true',r'\1false',s)
for name in ['invoice-delivery','transfer-manifest','send-push-announcement']:
 if '[functions.'+name+']' not in s:s+='\n[functions.'+name+']\nverify_jwt = false\n'
p.write_text(s)
a=json.loads((root/'tests/local-support/access-snapshot.json').read_text());private=json.loads((root/'tests/local-support/private-structure.json').read_text())
base=(root/'tests/v34-schema.sql').read_text().splitlines()[4:]
base=[l for l in base if not l.startswith('grant select,insert,update,delete on public.')]
lines=['-- LOCAL TEST ONLY: uses the real Supabase Auth schema. Never apply to production.','create schema if not exists private;']+base
quote=lambda x:'"'+x.replace('"','""')+'"'
for t in ['initial_admin_allowlist','staff_access_allowlist']:
 cols=[quote(c['column'])+' '+c['type']+(' default '+c['default'] if c['default'] else '')+(' not null' if c['notnull'] else '') for c in private['columns'] if c['table']==t]
 lines.append('create table private.'+quote(t)+'('+','.join(cols)+');')
for c in private['constraints']:lines.append('alter table private.'+quote(c['table'])+' add constraint '+quote(c['name'])+' '+c['definition']+';')
for trigger in a['auth_triggers']:lines.append(trigger+';')
mapping={'r':'select','a':'insert','w':'update','d':'delete','D':'truncate','x':'references','t':'trigger','X':'execute','U':'usage','C':'create'}
def grants(kind,obj,acl):
 lines.append('revoke all on '+kind+' '+obj+' from public,anon,authenticated,service_role;')
 # Null function ACL means default PUBLIC execute. Null relation ACL means owner only.
 if acl is None:
  if kind=='function':lines.append('grant execute on function '+obj+' to public;')
  return
 for entry in acl:
  role,priv=entry.split('=',1);priv=priv.split('/')[0]
  if role not in ('','anon','authenticated','service_role'):continue
  privileges=[mapping[c] for c in priv if c in mapping]
  if privileges:lines.append('grant '+','.join(privileges)+' on '+kind+' '+obj+' to '+(quote(role) if role else 'public')+';')
for r in a['relations']:
 kind='sequence' if r['kind']=='S' else 'table';obj=quote(r['schema'])+'.'+quote(r['name'])
 if r['kind']=='r':lines.append('alter table '+obj+(' enable' if r['rls'] else ' disable')+' row level security;')
 grants(kind,obj,r['acl'])
for f in a['functions']:grants('function',f['signature'],f['acl'])
for schema in private['schemas']:grants('schema',quote(schema['name']),schema['acl'])
for p in sorted((root/'supabase/migrations').glob('*.sql')):lines.append(p.read_text())
migrations=stack/'supabase/migrations';existing=list(migrations.glob('*_local_fixture_baseline.sql')) if migrations.exists() else []
if existing:target=existing[0]
else:
 subprocess.run([str(cli),'migration','new','local_fixture_baseline','--workdir',str(stack)],check=True)
 target=next(migrations.glob('*_local_fixture_baseline.sql'))
target.write_text('\n'.join(lines)+'\n')
shutil.copytree(root/'supabase/functions',stack/'supabase/functions',dirs_exist_ok=True)
print('Prepared .local/stack with real Auth, captured permissions and v35. No remote connection.')
