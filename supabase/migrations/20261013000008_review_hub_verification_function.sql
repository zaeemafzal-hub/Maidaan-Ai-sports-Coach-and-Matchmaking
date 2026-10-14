-- Maidaan Phase 6B Database Migration
-- Atomic PostgreSQL stored procedure for Admin Hub Verification Review

create or replace function public.review_hub_verification(
  p_request_id uuid,
  p_admin_id uuid,
  p_action text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_request record;
  v_new_status text;
  v_now timestamptz := now();
begin
  -- Validate action
  if p_action = 'APPROVE' then
    v_new_status := 'APPROVED';
  elsif p_action = 'REJECT' then
    v_new_status := 'REJECTED';
  else
    raise exception 'Invalid verification review action: %', p_action;
  end if;

  -- Validate admin note limit
  if p_admin_note is not null and length(p_admin_note) > 300 then
    raise exception 'Admin note exceeds 300 characters';
  end if;

  -- Lock and fetch request
  select * into v_request
  from public.hub_verification_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Verification request not found';
  end if;

  -- Disallow transitions from non-PENDING states
  if v_request.status != 'PENDING' then
    raise exception 'Cannot review verification request with status: %', v_request.status;
  end if;

  -- Update request record
  update public.hub_verification_requests
  set
    status = v_new_status,
    admin_note = p_admin_note,
    reviewed_by = p_admin_id,
    reviewed_at = v_now,
    updated_at = v_now
  where id = p_request_id;

  -- Atomic state update: if approved, mark hub_owner_profiles.is_verified = true
  if v_new_status = 'APPROVED' then
    update public.hub_owner_profiles
    set
      is_verified = true,
      updated_at = v_now
    where user_id = v_request.hub_owner_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'requestId', p_request_id,
    'status', v_new_status,
    'reviewedAt', v_now
  );
end;
$$;
