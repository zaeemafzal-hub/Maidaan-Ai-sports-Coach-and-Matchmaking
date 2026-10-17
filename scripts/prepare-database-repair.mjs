import fs from 'node:fs';

const files = [
  'supabase/migrations/20261016000001_create_user_roles_table.sql',
  'supabase/migrations/20261016000002_create_teams_and_team_members_tables.sql',
];
const sql = [
  '-- Repairs the missing role/team schema and backfills existing accounts.',
  '-- Run in the Supabase SQL Editor for this project. Existing records are preserved.',
  'begin;',
  ...files.map((file) => `-- Source: ${file}\n${fs.readFileSync(file, 'utf8')}`),
  "notify pgrst, 'reload schema';",
  'commit;',
  '',
].join('\n\n');
fs.mkdirSync('output', { recursive: true });
fs.writeFileSync('output/database-repair.sql', sql);
console.log('Prepared output/database-repair.sql');
