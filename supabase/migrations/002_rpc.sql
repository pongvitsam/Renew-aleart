-- Renew Aleart — RPC (เรียกจาก frontend ด้วย anon key)

-- ─── Helpers ──────────────────────────────────────────────────────────────

create or replace function public.default_steps()
returns jsonb language sql immutable as $$
  select '[
    "แจ้งผู้รับเหมา/ทีมงานที่เกี่ยวข้อง",
    "ขอเอกสารสนับสนุนจากลูกค้า",
    "ได้รับเอกสารครบถ้วน",
    "ยื่นดำเนินการต่อใบอนุญาตกับหน่วยงานรัฐ",
    "แจ้งผลให้ลูกค้าทราบ",
    "เสร็จสิ้นสมบูรณ์"
  ]'::jsonb;
$$;

create or replace function public.user_to_json(u public.app_users)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', u.id,
    'username', u.username,
    'displayName', u.display_name,
    'role', u.role,
    'active', u.active
  );
$$;

create or replace function public.require_session(p_token text)
returns public.app_users
language plpgsql security definer set search_path = public as $$
declare
  v_user public.app_users;
begin
  if p_token is null or length(trim(p_token)) = 0 then
    raise exception 'กรุณาเข้าสู่ระบบ';
  end if;
  delete from public.sessions where expires_at < now();
  select u.* into v_user
  from public.sessions s
  join public.app_users u on u.id = s.user_id
  where s.token = p_token and s.expires_at > now();
  if not found then
    raise exception 'กรุณาเข้าสู่ระบบ';
  end if;
  if not v_user.active then
    raise exception 'บัญชีนี้ถูกปิดใช้งาน';
  end if;
  return v_user;
end;
$$;

create or replace function public.require_admin(p_token text)
returns public.app_users
language plpgsql security definer set search_path = public as $$
declare
  v_user public.app_users;
begin
  v_user := public.require_session(p_token);
  if v_user.role <> 'admin' then
    raise exception 'เฉพาะผู้ดูแลระบบเท่านั้น';
  end if;
  return v_user;
end;
$$;

create or replace function public.departments_with_counts()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  result jsonb := '[]'::jsonb;
  r record;
  cnt int;
begin
  for r in select * from public.departments order by name loop
    select count(*)::int into cnt from public.projects p where p.department = r.name;
    result := result || jsonb_build_array(jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'projectCount', cnt,
      'canDelete', cnt = 0
    ));
  end loop;
  return result;
end;
$$;

create or replace function public.license_to_lite(l public.licenses)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', l.id,
    'name', l.name,
    'issueDate', coalesce(to_char(l.issue_date, 'YYYY-MM-DD'), ''),
    'expiryDate', coalesce(to_char(l.expiry_date, 'YYYY-MM-DD'), ''),
    'alertMonths', l.alert_months,
    'driveUrl', l.drive_url,
    'status', l.status,
    'steps', coalesce(l.steps, '[]'::jsonb)
  );
$$;

create or replace function public.license_to_full(l public.licenses, p_include_history boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  hist jsonb := '[]'::jsonb;
  h record;
begin
  if p_include_history then
    for h in
      select * from public.license_history
      where license_id = l.id
      order by entry_date, id
    loop
      hist := hist || jsonb_build_array(jsonb_build_object(
        'id', h.id,
        'date', to_char(h.entry_date, 'YYYY-MM-DD'),
        'action', h.action,
        'note', h.note
      ));
    end loop;
  end if;
  return jsonb_build_object(
    'id', l.id,
    'name', l.name,
    'issueDate', coalesce(to_char(l.issue_date, 'YYYY-MM-DD'), ''),
    'expiryDate', coalesce(to_char(l.expiry_date, 'YYYY-MM-DD'), ''),
    'alertMonths', l.alert_months,
    'driveUrl', l.drive_url,
    'status', l.status,
    'steps', coalesce(l.steps, public.default_steps()),
    'renewalCycles', coalesce(l.renewal_cycles, '[]'::jsonb),
    'history', hist
  );
end;
$$;

create or replace function public.build_projects_payload()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  projects jsonb := '[]'::jsonb;
  p record;
  lic jsonb;
  licenses jsonb;
begin
  for p in select * from public.projects order by name loop
    licenses := '[]'::jsonb;
    for lic in
      select l.* from public.licenses l
      where l.project_id = p.id
      order by l.name
    loop
      licenses := licenses || jsonb_build_array(public.license_to_lite(lic));
    end loop;
    projects := projects || jsonb_build_array(jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'department', p.department,
      'emails', coalesce(p.emails, '[]'::jsonb),
      'driveUrl', p.drive_url,
      'isDemo', p.is_demo,
      'licenses', licenses
    ));
  end loop;
  return projects;
end;
$$;

-- ─── Auth ─────────────────────────────────────────────────────────────────

create or replace function public.api_login(p_username text, p_password text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user public.app_users;
  v_token text;
  v_expires timestamptz;
begin
  select * into v_user from public.app_users
  where lower(username) = lower(trim(p_username));
  if not found then
    raise exception 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
  end if;
  if not v_user.active then
    raise exception 'บัญชีนี้ถูกปิดใช้งาน';
  end if;
  if v_user.password_hash <> crypt(p_password, v_user.password_hash) then
    raise exception 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
  end if;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_expires := now() + interval '6 hours';
  insert into public.sessions (token, user_id, expires_at) values (v_token, v_user.id, v_expires);
  return jsonb_build_object(
    'success', true,
    'token', v_token,
    'expiresAt', v_expires,
    'user', public.user_to_json(v_user)
  );
end;
$$;

create or replace function public.api_logout(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_token is not null then
    delete from public.sessions where token = p_token;
  end if;
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.api_validate_session(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user public.app_users;
begin
  v_user := public.require_session(p_token);
  return jsonb_build_object('success', true, 'user', public.user_to_json(v_user));
end;
$$;

create or replace function public.api_list_users(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  users jsonb := '[]'::jsonb;
  u record;
begin
  perform public.require_admin(p_token);
  for u in select * from public.app_users order by username loop
    users := users || jsonb_build_array(public.user_to_json(u));
  end loop;
  return jsonb_build_object('success', true, 'users', users);
end;
$$;

create or replace function public.api_save_user(p_token text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin public.app_users;
  v_id bigint;
  v_username text;
  v_password text;
  v_row public.app_users;
begin
  v_admin := public.require_admin(p_token);
  v_id := nullif(p_data->>'id', '')::bigint;
  v_username := trim(p_data->>'username');
  v_password := coalesce(p_data->>'password', '');
  if v_username is null or length(v_username) < 2 then
    raise exception 'กรุณาระบุชื่อผู้ใช้';
  end if;
  if exists (
    select 1 from public.app_users
    where lower(username) = lower(v_username) and (v_id is null or id <> v_id)
  ) then
    raise exception 'มีชื่อผู้ใช้นี้อยู่แล้ว';
  end if;
  if v_id is null then
    if length(v_password) < 1 then raise exception 'กรุณาตั้งรหัสผ่านสำหรับผู้ใช้ใหม่'; end if;
    v_id := (extract(epoch from now()) * 1000)::bigint;
    insert into public.app_users (id, username, password_hash, display_name, role, active)
    values (
      v_id, v_username, crypt(v_password, gen_salt('bf')),
      coalesce(nullif(trim(p_data->>'displayName'), ''), v_username),
      case when p_data->>'role' = 'admin' then 'admin' else 'user' end,
      coalesce((p_data->>'active')::boolean, true)
    );
  else
    select * into v_row from public.app_users where id = v_id;
    if not found then raise exception 'ไม่พบผู้ใช้'; end if;
    update public.app_users set
      username = v_username,
      display_name = coalesce(nullif(trim(p_data->>'displayName'), ''), v_username),
      role = case when p_data->>'role' = 'admin' then 'admin' else 'user' end,
      active = coalesce((p_data->>'active')::boolean, true),
      password_hash = case when length(v_password) > 0 then crypt(v_password, gen_salt('bf')) else password_hash end,
      updated_at = now()
    where id = v_id;
  end if;
  select * into v_row from public.app_users where id = v_id;
  return jsonb_build_object('success', true, 'id', v_id, 'user', public.user_to_json(v_row));
end;
$$;

create or replace function public.api_delete_user(p_token text, p_user_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin public.app_users;
  v_target public.app_users;
  admin_cnt int;
begin
  v_admin := public.require_admin(p_token);
  if v_admin.id = p_user_id then raise exception 'ไม่สามารถลบบัญชีของตัวเองได้'; end if;
  select * into v_target from public.app_users where id = p_user_id;
  if not found then raise exception 'ไม่พบผู้ใช้'; end if;
  if v_target.role = 'admin' then
    select count(*)::int into admin_cnt from public.app_users where role = 'admin' and active;
    if admin_cnt <= 1 then raise exception 'ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน'; end if;
  end if;
  delete from public.app_users where id = p_user_id;
  return jsonb_build_object('success', true, 'id', p_user_id);
end;
$$;

-- ─── Data read ────────────────────────────────────────────────────────────

create or replace function public.api_get_projects(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.require_session(p_token);
  return jsonb_build_object(
    'success', true,
    'projects', public.build_projects_payload(),
    'departments', public.departments_with_counts()
  );
end;
$$;

create or replace function public.api_get_license_detail(p_token text, p_license_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  l public.licenses;
begin
  perform public.require_session(p_token);
  select * into l from public.licenses where id = p_license_id;
  if not found then raise exception 'ไม่พบใบอนุญาต'; end if;
  return jsonb_build_object('success', true, 'license', public.license_to_full(l, true));
end;
$$;

-- ─── Projects / licenses / departments ──────────────────────────────────────

create or replace function public.api_save_project(p_token text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
  v_name text;
  v_dept text;
  v_demo boolean;
begin
  perform public.require_session(p_token);
  v_id := nullif(p_data->>'id', '')::bigint;
  v_name := trim(p_data->>'name');
  v_dept := trim(p_data->>'department');
  if v_name is null or length(v_name) = 0 then raise exception 'กรุณาระบุชื่อโครงการ'; end if;
  if v_dept is null or length(v_dept) = 0 then raise exception 'กรุณาเลือกแผนก'; end if;
  v_demo := coalesce((p_data->>'isDemo')::boolean, false);
  if v_id is not null then
    select coalesce(is_demo, false) into v_demo from public.projects where id = v_id;
    if not found then v_id := null; end if;
  end if;
  if v_id is null then
    v_id := (extract(epoch from now()) * 1000)::bigint;
    insert into public.projects (id, name, department, emails, drive_url, is_demo)
    values (v_id, v_name, v_dept, coalesce(p_data->'emails', '[]'::jsonb), coalesce(p_data->>'driveUrl', ''), v_demo);
  else
    update public.projects set
      name = v_name, department = v_dept,
      emails = coalesce(p_data->'emails', emails),
      drive_url = coalesce(p_data->>'driveUrl', drive_url),
      is_demo = v_demo, updated_at = now()
    where id = v_id;
  end if;
  return jsonb_build_object('success', true, 'id', v_id);
end;
$$;

create or replace function public.api_delete_project(p_token text, p_project_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.require_session(p_token);
  if not exists (select 1 from public.projects where id = p_project_id) then
    raise exception 'ไม่พบโครงการ';
  end if;
  delete from public.projects where id = p_project_id;
  return jsonb_build_object('success', true, 'id', p_project_id);
end;
$$;

create or replace function public.api_save_license(p_token text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
  v_steps jsonb;
  v_cycles jsonb;
  v_status text;
  v_existing public.licenses;
begin
  perform public.require_session(p_token);
  v_id := nullif(p_data->>'id', '')::bigint;
  v_steps := coalesce(p_data->'steps', public.default_steps());
  if jsonb_typeof(v_steps) = 'string' then
    v_steps := (p_data->>'steps')::jsonb;
  end if;
  if v_id is not null then
    select * into v_existing from public.licenses where id = v_id;
    v_cycles := coalesce(v_existing.renewal_cycles, '[]'::jsonb);
    v_status := coalesce(nullif(p_data->>'status', ''), v_existing.status);
  else
    v_cycles := '[]'::jsonb;
    v_status := coalesce(nullif(p_data->>'status', ''), 'รอเริ่มดำเนินการ');
  end if;
  if v_id is null then
    v_id := (extract(epoch from now()) * 1000)::bigint;
    insert into public.licenses (
      id, project_id, name, issue_date, expiry_date, alert_months,
      drive_url, status, steps, renewal_cycles
    ) values (
      v_id,
      (p_data->>'projectId')::bigint,
      trim(p_data->>'name'),
      nullif(p_data->>'issueDate', '')::date,
      nullif(p_data->>'expiryDate', '')::date,
      coalesce((p_data->>'alertMonths')::int, 3),
      coalesce(p_data->>'driveUrl', ''),
      v_status, v_steps, v_cycles
    );
  else
    update public.licenses set
      name = trim(p_data->>'name'),
      issue_date = nullif(p_data->>'issueDate', '')::date,
      expiry_date = nullif(p_data->>'expiryDate', '')::date,
      alert_months = coalesce((p_data->>'alertMonths')::int, alert_months),
      drive_url = coalesce(p_data->>'driveUrl', drive_url),
      status = v_status,
      steps = v_steps,
      renewal_cycles = v_cycles,
      updated_at = now()
    where id = v_id;
  end if;
  return jsonb_build_object('success', true, 'id', v_id, 'projectId', (p_data->>'projectId')::bigint);
end;
$$;

create or replace function public.api_save_license_steps(p_token text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
  v_steps jsonb;
  l public.licenses;
  v_status text;
  i int;
  done jsonb;
begin
  perform public.require_session(p_token);
  v_id := (p_data->>'licenseId')::bigint;
  v_steps := p_data->'steps';
  if v_steps is null or jsonb_array_length(v_steps) < 1 then
    raise exception 'ต้องมีอย่างน้อย 1 ขั้นตอน';
  end if;
  select * into l from public.licenses where id = v_id;
  if not found then raise exception 'ไม่พบใบอนุญาต'; end if;
  v_status := l.status;
  if v_status is null or not exists (
    select 1 from jsonb_array_elements_text(v_steps) s where s.value = v_status
  ) then
    v_status := v_steps->>0;
    for i in 0..jsonb_array_length(v_steps)-1 loop
      exit when not exists (
        select 1 from public.license_history h
        where h.license_id = v_id and h.action = v_steps->>i
      );
      if i = jsonb_array_length(v_steps)-1 then
        v_status := v_steps->>i;
      else
        v_status := v_steps->>(i+1);
      end if;
    end loop;
  end if;
  update public.licenses set steps = v_steps, status = v_status, updated_at = now() where id = v_id;
  return jsonb_build_object('success', true, 'licenseId', v_id, 'status', v_status, 'steps', v_steps);
end;
$$;

create or replace function public.api_save_timeline_update(p_token text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_license_id bigint;
  v_step text;
  v_note text;
begin
  perform public.require_session(p_token);
  v_license_id := (p_data->>'licenseId')::bigint;
  v_step := coalesce(p_data->>'step', '');
  v_note := coalesce(p_data->>'note', '');
  if length(v_step) > 0 then
    update public.licenses set status = v_step, updated_at = now() where id = v_license_id;
  end if;
  insert into public.license_history (id, license_id, entry_date, action, note)
  values (
    (extract(epoch from now()) * 1000)::bigint,
    v_license_id, current_date,
    case when length(v_step) > 0 then v_step else 'บันทึกทั่วไป' end,
    v_note
  );
  return jsonb_build_object('success', true, 'licenseId', v_license_id);
end;
$$;

create or replace function public.api_complete_renewal(p_token text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  l public.licenses;
  v_cycles jsonb;
  v_steps jsonb;
  last_step text;
  v_round int;
begin
  perform public.require_session(p_token);
  select * into l from public.licenses where id = (p_data->>'licenseId')::bigint;
  if not found then raise exception 'ไม่พบใบอนุญาต'; end if;
  if nullif(p_data->>'issueDate','') is null or nullif(p_data->>'expiryDate','') is null then
    raise exception 'กรุณากรอกวันเริ่มและวันหมดอายุรอบถัดไป';
  end if;
  v_steps := coalesce(l.steps, public.default_steps());
  last_step := v_steps->>(jsonb_array_length(v_steps)-1);
  if l.status is distinct from last_step then
    raise exception 'ยังดำเนินการขั้นตอนไม่ครบ — บันทึกขั้นตอนสุดท้ายก่อนเริ่มรอบใหม่';
  end if;
  v_cycles := coalesce(l.renewal_cycles, '[]'::jsonb);
  if l.issue_date is not null and l.expiry_date is not null then
    v_cycles := v_cycles || jsonb_build_array(jsonb_build_object(
      'round', jsonb_array_length(v_cycles) + 1,
      'issueDate', to_char(l.issue_date, 'YYYY-MM-DD'),
      'expiryDate', to_char(l.expiry_date, 'YYYY-MM-DD'),
      'archivedAt', to_char(current_date, 'YYYY-MM-DD'),
      'note', coalesce(nullif(trim(p_data->>'note'), ''), 'บันทึกรอบต่ออายุ')
    ));
  end if;
  v_round := jsonb_array_length(v_cycles);
  delete from public.license_history where license_id = l.id;
  update public.licenses set
    issue_date = (p_data->>'issueDate')::date,
    expiry_date = (p_data->>'expiryDate')::date,
    status = v_steps->>0,
    renewal_cycles = v_cycles,
    updated_at = now()
  where id = l.id;
  insert into public.license_history (id, license_id, entry_date, action, note)
  values (
    (extract(epoch from now()) * 1000)::bigint, l.id, current_date,
    'เริ่มรอบติดตามใหม่',
    'รอบที่ ' || (v_round + 1) || ' · ' || (p_data->>'issueDate') || ' ถึง ' || (p_data->>'expiryDate')
  );
  return jsonb_build_object('success', true, 'licenseId', l.id, 'round', v_round + 1);
end;
$$;

create or replace function public.api_save_department(p_token text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  perform public.require_session(p_token);
  v_name := trim(p_data->>'name');
  if length(v_name) = 0 then raise exception 'กรุณาระบุชื่อแผนก'; end if;
  if exists (select 1 from public.departments where lower(name) = lower(v_name)) then
    raise exception 'มีแผนกชื่อนี้อยู่แล้ว';
  end if;
  insert into public.departments (id, name) values ((extract(epoch from now()) * 1000)::bigint, v_name);
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.api_delete_department(p_token text, p_dept_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d public.departments;
  cnt int;
begin
  perform public.require_session(p_token);
  select * into d from public.departments where id = p_dept_id;
  if not found then raise exception 'ไม่พบแผนก'; end if;
  select count(*)::int into cnt from public.projects where department = d.name;
  if cnt > 0 then raise exception 'ไม่สามารถลบแผนกที่มีโครงการอยู่'; end if;
  delete from public.departments where id = p_dept_id;
  return jsonb_build_object('success', true);
end;
$$;

-- ─── Grants: anon เรียก RPC ได้ ───────────────────────────────────────────

grant usage on schema public to anon, authenticated;

grant execute on function public.api_login(text, text) to anon, authenticated;
grant execute on function public.api_logout(text) to anon, authenticated;
grant execute on function public.api_validate_session(text) to anon, authenticated;
grant execute on function public.api_list_users(text) to anon, authenticated;
grant execute on function public.api_save_user(text, jsonb) to anon, authenticated;
grant execute on function public.api_delete_user(text, bigint) to anon, authenticated;
grant execute on function public.api_get_projects(text) to anon, authenticated;
grant execute on function public.api_get_license_detail(text, bigint) to anon, authenticated;
grant execute on function public.api_save_project(text, jsonb) to anon, authenticated;
grant execute on function public.api_delete_project(text, bigint) to anon, authenticated;
grant execute on function public.api_save_license(text, jsonb) to anon, authenticated;
grant execute on function public.api_save_license_steps(text, jsonb) to anon, authenticated;
grant execute on function public.api_save_timeline_update(text, jsonb) to anon, authenticated;
grant execute on function public.api_complete_renewal(text, jsonb) to anon, authenticated;
grant execute on function public.api_save_department(text, jsonb) to anon, authenticated;
grant execute on function public.api_delete_department(text, bigint) to anon, authenticated;
