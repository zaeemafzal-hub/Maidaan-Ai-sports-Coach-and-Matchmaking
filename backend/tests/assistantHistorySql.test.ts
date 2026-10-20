import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('assistant history migration: durable turns, account isolation, retry IDs and reset cascade', async () => {
  const db = new PGlite();
  const a = '00000000-0000-0000-0000-0000000000a1', b = '00000000-0000-0000-0000-0000000000b1';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
    await db.query('insert into auth.users values($1),($2)', [a,b]);
    const migration = fs.readFileSync(new URL('../../supabase/migrations/20261020000001_assistant_history.sql', import.meta.url),'utf8');
    await db.exec(migration);
    const rows = await db.query<{id: string}>(`insert into assistant_conversations(user_id,assistant,topic) values($1,'coach','cricket'),($2,'coach','cricket') returning id`,[a,b]);
    const [first, second] = rows.rows.map(row=>row.id);
    await db.query(`insert into assistant_messages(conversation_id,user_id,client_message_id,role,message) values($1,$2,'turn-1','user','Private footwork question'),($1,$2,'turn-1','assistant','Private coaching reply'),($3,$4,'turn-1','user','Other account question')`,[first,a,second,b]);
    await db.exec(migration);
    assert.equal((await db.query('select * from assistant_messages')).rows.length,3,'reapplying preserves history');
    await assert.rejects(db.query(`insert into assistant_messages(conversation_id,user_id,client_message_id,role,message) values($1,$2,'turn-1','user','duplicate')`,[first,a]),/unique|duplicate/i);
    await assert.rejects(db.query(`insert into assistant_messages(conversation_id,user_id,client_message_id,role,message) values($1,$2,'bad-owner','assistant','wrong account')`,[first,b]),/foreign key/i);
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${a}',false);`);
    assert.equal((await db.query('select * from assistant_conversations')).rows.length,1);
    assert.equal((await db.query('select * from assistant_messages')).rows.length,2);
    assert.equal((await db.query('select * from assistant_messages where user_id=$1',[b])).rows.length,0);
    await assert.rejects(db.query(`insert into assistant_messages(conversation_id,user_id,client_message_id,role,message) values($1,$2,'fake-reply','assistant','forged')`,[first,a]),/permission denied/i);
    await assert.rejects(db.query(`delete from assistant_conversations where id=$1`,[first]),/permission denied/i);
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select * from assistant_messages'),/permission denied/i);
    await db.exec('reset role;');
    await db.query('delete from assistant_conversations where id=$1',[first]);
    assert.equal((await db.query('select * from assistant_messages')).rows.length,1,'reset clears only selected conversation');
    await assert.rejects(db.query(`insert into assistant_messages(conversation_id,user_id,client_message_id,role,message) values($1,$2,'late-reply','assistant','late')`,[first,a]),/foreign key/i,'an in-flight reply cannot resurrect a cleared conversation');
    await db.query('delete from auth.users where id=$1',[b]);
    assert.equal((await db.query('select * from assistant_messages')).rows.length,0);
  } finally { await db.close(); }
});
