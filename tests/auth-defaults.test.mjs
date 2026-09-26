import test from 'node:test';
import assert from 'node:assert/strict';
import {loadDB} from './load-db.mjs';
test('new Auth users retain safe role defaults and respect staff allowlists',async()=>{
 const db=await loadDB();
 try{
 await db.exec(`create table private.initial_admin_allowlist(email text,active boolean);
 create table private.staff_access_allowlist(email text,app_role text,active boolean,display_name text);
 create trigger local_auth_profile after insert on auth.users for each row execute function private.handle_new_auth_user();
 insert into private.staff_access_allowlist values('disabled@example.invalid','finance',false,'Disabled finance');
 insert into private.initial_admin_allowlist values('admin@example.invalid',true);
 insert into auth.users(id,email,raw_user_meta_data) values
 ('90000000-0000-4000-8000-000000000001','ordinary@example.invalid','{"app_role":"admin"}'),
 ('90000000-0000-4000-8000-000000000002','disabled@example.invalid','{}'),
 ('90000000-0000-4000-8000-000000000003','admin@example.invalid','{}');`);
 const rows=(await db.query('select email,app_role,active from profiles order by email')).rows;
 assert.deepEqual(rows,[{email:'admin@example.invalid',app_role:'admin',active:true},{email:'disabled@example.invalid',app_role:'finance',active:false},{email:'ordinary@example.invalid',app_role:'attendee',active:true}]);
 }finally{await db.close();}
});
