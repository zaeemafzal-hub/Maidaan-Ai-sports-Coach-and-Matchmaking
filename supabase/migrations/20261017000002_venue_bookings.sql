begin;

alter table public.hub_slots
  add column if not exists booking_enabled boolean not null default false,
  add column if not exists payment_policy text not null default 'FULL_ONLY' check (payment_policy in ('FULL_ONLY','FULL_OR_ADVANCE')),
  add column if not exists advance_percent integer not null default 25 check (advance_percent between 1 and 99),
  add column if not exists cancel_before_hours integer not null default 24 check (cancel_before_hours between 0 and 720),
  add column if not exists cancellation_refund text not null default 'FULL' check (cancellation_refund in ('FULL','KEEP_ADVANCE'));

create table if not exists public.venue_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.hub_slots(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  venue_name text not null, space_name text not null, location text not null,
  starts_at timestamptz not null, ends_at timestamptz not null,
  status text not null default 'PAYMENT_PENDING' check (status in ('PAYMENT_PENDING','CONFIRMED','CANCELLED','EXPIRED')),
  provider text not null check (provider in ('safepay','jazzcash')),
  payment_reference text,
  wallet_submitted_at timestamptz,
  payment_choice text not null check (payment_choice in ('FULL','ADVANCE')),
  currency text not null default 'PKR' check (currency='PKR'),
  total_minor bigint not null check (total_minor between 1 and 100000000),
  advance_minor bigint not null check (advance_minor > 0),
  upfront_minor bigint not null check (upfront_minor > 0),
  paid_minor bigint not null default 0 check (paid_minor >= 0),
  venue_paid_minor bigint not null default 0 check (venue_paid_minor >= 0),
  cancel_before_hours integer not null,
  cancellation_refund text not null check (cancellation_refund in ('FULL','KEEP_ADVANCE')),
  cancel_deadline timestamptz not null,
  hold_expires_at timestamptz not null,
  checkout_nonce text not null default replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),
  cancelled_at timestamptz, cancelled_by uuid references public.profiles(id), cancellation_reason text,
  refund_due_minor bigint not null default 0 check (refund_due_minor >= 0),
  refunded_minor bigint not null default 0 check (refunded_minor >= 0),
  refund_status text not null default 'NONE' check (refund_status in ('NONE','PENDING','REFUNDED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(provider,payment_reference),
  check (owner_id <> customer_id),
  check (advance_minor <= total_minor and upfront_minor <= total_minor),
  check (paid_minor <= upfront_minor and venue_paid_minor <= total_minor-upfront_minor),
  check (refund_due_minor <= paid_minor and refunded_minor <= refund_due_minor),
  check (status <> 'CONFIRMED' or paid_minor=upfront_minor)
);
create unique index if not exists venue_bookings_one_reservation on public.venue_bookings(slot_id) where status in ('PAYMENT_PENDING','CONFIRMED');
create index if not exists venue_bookings_customer on public.venue_bookings(customer_id,created_at desc);
create index if not exists venue_bookings_owner on public.venue_bookings(owner_id,starts_at);
alter table public.venue_bookings enable row level security;
-- All access is through authenticated backend routes. No client mutation policies.

create table if not exists public.booking_payment_events (
  event_key text primary key,
  booking_id uuid not null references public.venue_bookings(id) on delete restrict,
  provider text not null, kind text not null,
  amount_minor bigint not null, created_at timestamptz not null default now()
);
alter table public.booking_payment_events enable row level security;
create table if not exists public.booking_audit_log (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.venue_bookings(id) on delete restrict,
  actor_id uuid references public.profiles(id), action text not null, note text not null default '', created_at timestamptz not null default now()
);
alter table public.booking_audit_log enable row level security;

create or replace function public.start_venue_booking(p_customer uuid,p_slot uuid,p_provider text,p_choice text,p_version timestamptz default null)
returns jsonb language plpgsql set search_path=public as $$
declare s public.hub_slots; c public.hub_courts; h public.hub_owner_profiles; b public.venue_bookings; total bigint; advance bigint;
begin
  if p_provider is null or p_provider not in ('safepay','jazzcash') or p_choice is null or p_choice not in ('FULL','ADVANCE') then raise exception 'Invalid checkout option' using errcode='22023'; end if;
  if not exists(select 1 from public.profiles p join public.user_roles r on r.user_id=p.id where p.id=p_customer and p.account_status='ACTIVE' and r.status='ACTIVE' and r.role in ('PLAYER','TEAM_CAPTAIN')) then raise exception 'Player or captain access required' using errcode='42501'; end if;
  select * into s from public.hub_slots where id=p_slot for update;
  if not found then raise exception 'Slot not found' using errcode='P0002'; end if;
  if p_version is not null and s.updated_at is distinct from p_version then raise exception 'Slot terms changed. Review the latest price and cancellation terms' using errcode='23505'; end if;
  select * into c from public.hub_courts where id=s.court_id;
  select * into h from public.hub_owner_profiles where user_id=c.hub_owner_id;
  if c.hub_owner_id=p_customer then raise exception 'You cannot book your own venue' using errcode='22023'; end if;
  if not s.booking_enabled or s.status<>'AVAILABLE' or c.status='UNAVAILABLE' or s.starts_at<=now() or s.price<=0 then raise exception 'This slot is not open for booking' using errcode='23505'; end if;
  if not exists(select 1 from public.profiles p join public.user_roles r on r.user_id=p.id where p.id=c.hub_owner_id and p.account_status='ACTIVE' and r.role='HUB_OWNER' and r.status='ACTIVE') then raise exception 'Venue is unavailable' using errcode='23505'; end if;
  update public.venue_bookings set status='EXPIRED',updated_at=now() where slot_id=p_slot and status='PAYMENT_PENDING' and hold_expires_at<=now();
  select * into b from public.venue_bookings where slot_id=p_slot and status in ('PAYMENT_PENDING','CONFIRMED');
  if found then
    if b.customer_id=p_customer and b.status='PAYMENT_PENDING' and b.provider=p_provider and b.payment_choice=p_choice then return to_jsonb(b); end if;
    raise exception 'This slot is already booked or temporarily held' using errcode='23505';
  end if;
  if p_choice='ADVANCE' and s.payment_policy<>'FULL_OR_ADVANCE' then raise exception 'Full upfront payment is required' using errcode='22023'; end if;
  total=(s.price*100)::bigint; advance=ceil(total*s.advance_percent/100.0)::bigint;
  insert into public.venue_bookings(slot_id,customer_id,owner_id,venue_name,space_name,location,starts_at,ends_at,provider,payment_choice,total_minor,advance_minor,upfront_minor,cancel_before_hours,cancellation_refund,cancel_deadline,hold_expires_at)
    values(s.id,p_customer,c.hub_owner_id,h.hub_name,concat_ws(' / ',nullif(c.area_name,''),c.name),h.location,s.starts_at,s.ends_at,p_provider,p_choice,total,advance,case when p_choice='FULL' then total else advance end,s.cancel_before_hours,s.cancellation_refund,s.starts_at-make_interval(hours=>s.cancel_before_hours),least(now()+interval '15 minutes',s.starts_at)) returning * into b;
  insert into public.booking_audit_log(booking_id,actor_id,action) values(b.id,p_customer,'CHECKOUT_STARTED');
  return to_jsonb(b);
end; $$;

create or replace function public.settle_venue_booking(p_booking uuid,p_reference text,p_provider text,p_event text,p_amount bigint,p_currency text,p_kind text)
returns jsonb language plpgsql set search_path=public as $$
declare b public.venue_bookings; can_confirm boolean;
begin
  -- Take the slot lock before the booking lock, matching checkout and cancellation.
  perform 1 from public.hub_slots where id=(select slot_id from public.venue_bookings where id=p_booking) for update;
  select * into b from public.venue_bookings where id=p_booking for update;
  if not found then raise exception 'Booking not found' using errcode='P0002'; end if;
  if p_reference is null or b.payment_reference is distinct from p_reference or b.provider is distinct from p_provider or p_currency is distinct from 'PKR' or p_event is null or length(p_event)>240 then raise exception 'Payment reference mismatch' using errcode='22023'; end if;
  if exists(select 1 from public.booking_payment_events where event_key=p_provider||':'||p_event) then return to_jsonb(b); end if;
  if p_kind='PAID' then
    if p_amount is distinct from b.upfront_minor then raise exception 'Payment amount mismatch' using errcode='22023'; end if;
    if b.paid_minor=0 then
      can_confirm=b.status='PAYMENT_PENDING' and b.hold_expires_at>now() and b.starts_at>now()
        and exists(select 1 from public.profiles where id=b.owner_id and account_status='ACTIVE')
        and exists(select 1 from public.profiles where id=b.customer_id and account_status='ACTIVE')
        and exists(select 1 from public.hub_slots s join public.hub_courts c on c.id=s.court_id where s.id=b.slot_id and s.status='AVAILABLE' and s.booking_enabled and c.status<>'UNAVAILABLE');
      update public.venue_bookings set paid_minor=p_amount,status=case when can_confirm then 'CONFIRMED' when status='CANCELLED' then 'CANCELLED' else 'EXPIRED' end,
        refund_due_minor=case when can_confirm then 0 else p_amount end,refund_status=case when can_confirm then 'NONE' else 'PENDING' end,updated_at=now() where id=b.id;
    end if;
  elsif p_kind='REFUNDED' then
    if p_amount is null or p_amount<=0 or b.refunded_minor+p_amount>b.refund_due_minor then raise exception 'Refund requires review' using errcode='22023'; end if;
    update public.venue_bookings set refunded_minor=refunded_minor+p_amount,refund_status=case when refunded_minor+p_amount=refund_due_minor then 'REFUNDED' else 'PENDING' end,updated_at=now() where id=b.id;
  else raise exception 'Unsupported payment event' using errcode='22023'; end if;
  insert into public.booking_payment_events(event_key,booking_id,provider,kind,amount_minor) values(p_provider||':'||p_event,b.id,p_provider,p_kind,p_amount);
  select * into b from public.venue_bookings where id=b.id;
  return to_jsonb(b);
end; $$;

create or replace function public.cancel_venue_booking(p_actor uuid,p_booking uuid,p_reason text)
returns jsonb language plpgsql set search_path=public as $$
declare b public.venue_bookings; owner_cancel boolean; refund bigint;
begin
  perform 1 from public.hub_slots where id=(select slot_id from public.venue_bookings where id=p_booking) for update;
  select * into b from public.venue_bookings where id=p_booking for update;
  if not found then raise exception 'Booking not found' using errcode='P0002'; end if;
  if p_actor not in (b.customer_id,b.owner_id) or not exists(select 1 from public.profiles where id=p_actor and account_status='ACTIVE') then raise exception 'Booking access denied' using errcode='42501'; end if;
  if p_reason is null or length(trim(p_reason))<5 or length(p_reason)>300 then raise exception 'Enter a cancellation reason of 5-300 characters' using errcode='22023'; end if;
  if b.status='CANCELLED' then return to_jsonb(b); end if;
  if b.starts_at<=now() then raise exception 'The slot has already started' using errcode='23505'; end if;
  if b.status not in ('PAYMENT_PENDING','CONFIRMED') then raise exception 'Booking is no longer active' using errcode='23505'; end if;
  owner_cancel=p_actor=b.owner_id;
  refund=case when owner_cancel then b.paid_minor when now()>b.cancel_deadline then 0 when b.cancellation_refund='FULL' then b.paid_minor else greatest(0,b.paid_minor-b.advance_minor) end;
  update public.venue_bookings set status='CANCELLED',cancelled_at=now(),cancelled_by=p_actor,cancellation_reason=trim(p_reason),refund_due_minor=refund,refund_status=case when refund>0 then 'PENDING' else 'NONE' end,updated_at=now() where id=b.id returning * into b;
  insert into public.booking_audit_log(booking_id,actor_id,action,note) values(b.id,p_actor,case when owner_cancel then 'OWNER_CANCELLED' else 'CUSTOMER_CANCELLED' end,trim(p_reason));
  return to_jsonb(b);
end; $$;

create or replace function public.guard_reserved_slot()
returns trigger language plpgsql set search_path=public as $$
begin
  if exists(select 1 from public.venue_bookings where slot_id=old.id and (status='CONFIRMED' or (status='PAYMENT_PENDING' and hold_expires_at>now()))) then
    raise exception 'Cancel the active booking before editing this slot' using errcode='23505';
  end if;
  return new;
end; $$;
drop trigger if exists protect_reserved_slot on public.hub_slots;
create trigger protect_reserved_slot before update on public.hub_slots for each row execute function public.guard_reserved_slot();

create or replace function public.record_venue_refund(p_actor uuid,p_booking uuid,p_reference text)
returns jsonb language plpgsql set search_path=public as $$
declare b public.venue_bookings; result jsonb;
begin
  if not exists(select 1 from public.profiles p join public.user_roles r on r.user_id=p.id where p.id=p_actor and p.account_status='ACTIVE' and r.role='ADMIN' and r.status='ACTIVE') then raise exception 'Super-user access required' using errcode='42501'; end if;
  select * into b from public.venue_bookings where id=p_booking;
  if not found then raise exception 'Booking not found' using errcode='P0002'; end if;
  if p_reference is null or length(trim(p_reference))<5 or length(p_reference)>160 then raise exception 'Enter the completed gateway refund reference' using errcode='22023'; end if;
  if b.refund_status='REFUNDED' then return to_jsonb(b); end if;
  if b.refund_status<>'PENDING' then raise exception 'No refund is due' using errcode='23505'; end if;
  result=public.settle_venue_booking(b.id,b.payment_reference,b.provider,'manual-refund:'||trim(p_reference),b.refund_due_minor-b.refunded_minor,'PKR','REFUNDED');
  insert into public.booking_audit_log(booking_id,actor_id,action,note) values(b.id,p_actor,'REFUND_RECORDED',trim(p_reference));
  return result;
end; $$;

create or replace function public.record_venue_balance(p_actor uuid,p_booking uuid)
returns jsonb language plpgsql set search_path=public as $$
declare b public.venue_bookings;
begin
  select * into b from public.venue_bookings where id=p_booking for update;
  if not found then raise exception 'Booking not found' using errcode='P0002'; end if;
  if b.owner_id<>p_actor then raise exception 'Owner access required' using errcode='42501'; end if;
  if b.status<>'CONFIRMED' or b.starts_at>now() then raise exception 'Record venue payment when the confirmed slot starts' using errcode='23505'; end if;
  if b.venue_paid_minor=b.total_minor-b.paid_minor then return to_jsonb(b); end if;
  update public.venue_bookings set venue_paid_minor=total_minor-paid_minor,updated_at=now() where id=b.id returning * into b;
  insert into public.booking_audit_log(booking_id,actor_id,action) values(b.id,p_actor,'VENUE_BALANCE_RECEIVED');
  return to_jsonb(b);
end; $$;

revoke all on function public.start_venue_booking(uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.settle_venue_booking(uuid,text,text,text,bigint,text,text) from public,anon,authenticated;
revoke all on function public.cancel_venue_booking(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.record_venue_refund(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.record_venue_balance(uuid,uuid) from public,anon,authenticated;
grant execute on function public.start_venue_booking(uuid,uuid,text,text,timestamptz) to service_role;
grant execute on function public.settle_venue_booking(uuid,text,text,text,bigint,text,text) to service_role;
grant execute on function public.cancel_venue_booking(uuid,uuid,text) to service_role;
grant execute on function public.record_venue_refund(uuid,uuid,text) to service_role;
grant execute on function public.record_venue_balance(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
