-- Maidaan Phase 3B Database Migration
-- Atomic Captain Accept Function for Join Requests

create or replace function public.accept_join_request(
  p_request_id uuid,
  p_captain_id uuid
)
returns json
language plpgsql
security definer
as $$
declare
  v_request record;
  v_match record;
  v_participant_id uuid;
  v_new_slots integer;
  v_new_status text;
  v_now timestamptz := now();
begin
  -- 1. Lock and retrieve join request
  select * into v_request
  from public.join_requests
  where id = p_request_id
  for update;

  if not found then
    return json_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Join request not found.');
  end if;

  -- 2. Verify status is PENDING
  if v_request.status <> 'PENDING' then
    return json_build_object('success', false, 'code', 'INVALID_STATUS', 'error', 'Only PENDING requests can be accepted.');
  end if;

  -- 3. Lock and retrieve associated match
  select * into v_match
  from public.matches
  where id = v_request.match_id
  for update;

  if not found then
    return json_build_object('success', false, 'code', 'MATCH_NOT_FOUND', 'error', 'Associated match not found.');
  end if;

  -- 4. Verify captain ownership
  if v_match.captain_id <> p_captain_id then
    return json_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the match captain can accept requests.');
  end if;

  -- 5. Verify open slots > 0
  if v_match.open_slots <= 0 then
    return json_build_object('success', false, 'code', 'MATCH_FULL', 'error', 'Match is already full.');
  end if;

  -- 6. Verify player is not already confirmed participant
  if exists (
    select 1 from public.match_participants
    where match_id = v_request.match_id and player_id = v_request.player_id
  ) then
    return json_build_object('success', false, 'code', 'ALREADY_PARTICIPANT', 'error', 'Player is already a confirmed participant.');
  end if;

  -- 7. Insert match participant
  insert into public.match_participants (id, match_id, player_id, joined_at)
  values (gen_random_uuid(), v_request.match_id, v_request.player_id, v_now)
  returning id into v_participant_id;

  -- 8. Update request status to ACCEPTED
  update public.join_requests
  set status = 'ACCEPTED', updated_at = v_now
  where id = p_request_id;

  -- 9. Decrement open slots
  v_new_slots := v_match.open_slots - 1;
  v_new_status := case when v_new_slots = 0 then 'FULL' else v_match.status end;

  update public.matches
  set open_slots = v_new_slots,
      status = v_new_status,
      updated_at = v_now
  where id = v_request.match_id;

  -- 10. Return success payload
  return json_build_object(
    'success', true,
    'requestId', p_request_id,
    'matchId', v_request.match_id,
    'playerId', v_request.player_id,
    'status', 'ACCEPTED',
    'openSlots', v_new_slots,
    'matchStatus', v_new_status,
    'participantId', v_participant_id,
    'updatedAt', v_now
  );
end;
$$;
