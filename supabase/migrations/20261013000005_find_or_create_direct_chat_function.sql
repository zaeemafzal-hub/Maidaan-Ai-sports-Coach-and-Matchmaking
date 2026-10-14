-- Maidaan Phase 4B Database Migration
-- Stored procedure for atomic direct chat room creation/retrieval

create or replace function public.find_or_create_direct_chat(
  p_user_a uuid,
  p_user_b uuid
)
returns table (
  room_id uuid,
  created boolean
)
language plpgsql
security definer
as $$
declare
  v_room_id uuid;
  v_u1 uuid;
  v_u2 uuid;
begin
  if p_user_a = p_user_b then
    raise exception 'Cannot create direct chat room with oneself';
  end if;

  -- Order user IDs deterministically to eliminate deadlocks and race conditions
  if p_user_a < p_user_b then
    v_u1 := p_user_a;
    v_u2 := p_user_b;
  else
    v_u1 := p_user_b;
    v_u2 := p_user_a;
  end if;

  -- Acquire an application advisory xact lock based on hashed user pair IDs
  perform pg_advisory_xact_lock(
    ('x' || substr(md5(v_u1::text || ':' || v_u2::text), 1, 8))::bit(32)::int
  );

  -- Find existing direct room containing both users
  select m1.room_id into v_room_id
  from public.chat_room_members m1
  join public.chat_room_members m2 on m1.room_id = m2.room_id
  join public.chat_rooms r on r.id = m1.room_id
  where r.type = 'DIRECT'
    and m1.user_id = v_u1
    and m2.user_id = v_u2
  limit 1;

  if v_room_id is not null then
    return query select v_room_id, false;
    return;
  end if;

  -- Create room and both members atomically
  insert into public.chat_rooms (type, match_id)
  values ('DIRECT', null)
  returning id into v_room_id;

  insert into public.chat_room_members (room_id, user_id)
  values (v_room_id, v_u1), (v_room_id, v_u2);

  return query select v_room_id, true;
end;
$$;
