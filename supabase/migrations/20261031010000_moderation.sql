-- Administrators may moderate by ID without gaining read access to private notes.
-- A definer function is needed because an UPDATE into a private row must not
-- grant the caller a SELECT policy over that row.
drop policy notes_update on public.user_notes;
create policy notes_update on public.user_notes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy notes_delete on public.user_notes;
create policy notes_delete on public.user_notes for delete to authenticated
  using (user_id = (select auth.uid()));

create function public.moderate_content(target_table text, target_id uuid, operation text)
returns void language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  if not public.is_admin() then raise exception '관리자 권한이 필요합니다'; end if;
  if target_table not in ('tracks','music_stories','user_notes') or operation not in ('hide','delete') then
    raise exception '지원하지 않는 관리 작업입니다';
  end if;
  if operation = 'delete' then
    execute format('delete from public.%I where id = $1', target_table) using target_id;
  else
    execute format('update public.%I set visibility = $1 where id = $2', target_table)
      using (case when target_table='user_notes' then 'private' else 'hidden' end), target_id;
  end if;
  get diagnostics affected = row_count;
  if affected = 0 then raise exception '대상 콘텐츠를 찾을 수 없습니다'; end if;
end;
$$;
revoke all on function public.moderate_content(text,uuid,text) from public,anon;
grant execute on function public.moderate_content(text,uuid,text) to authenticated;
