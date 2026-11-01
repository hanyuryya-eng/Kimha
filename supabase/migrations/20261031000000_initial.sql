set search_path = public, extensions;

-- 지음: private by default, no service-role dependency in the web application.
create extension if not exists pg_trgm;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,40}$'),
  nickname text not null check (char_length(nickname) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 500),
  genres text[] not null default '{}',
  favorite_artists text[] not null default '{}',
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create function public.is_admin () returns boolean language sql stable security definer
set
  search_path = '' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin');
$$;

create function public.on_signup () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
 insert into public.profiles(id,username,nickname) values(new.id, 'u_'||replace(new.id::text,'-',''), left(coalesce(nullif(new.raw_user_meta_data->>'nickname',''),'새로운 리스너'),40));
 return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users for each row
execute function public.on_signup ();

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] not null default '{}',
  bio text not null default '',
  is_demo boolean not null default false
);

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists,
  title text not null,
  released_on date,
  artwork_url text,
  artwork_source_url text,
  artwork_license text,
  artwork_status text not null default 'unverified' check (
    artwork_status in ('unverified', 'verified', 'expired')
  ),
  artwork_expires_at timestamptz,
  check (
    artwork_url is null
    or (
      artwork_url like 'https://%'
      and artwork_source_url like 'https://%'
      and artwork_license is not null
      and artwork_status = 'verified'
    )
  )
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists,
  album_id uuid references public.albums on delete set null,
  title text not null check (char_length(title) between 1 and 150),
  aliases text[] not null default '{}',
  version text not null default 'original',
  released_year integer check (released_year between 1900 and 2200),
  genre text not null default '인디',
  description text not null default '',
  cover_index integer not null default 0 check (cover_index between 0 and 11),
  source_url text check (
    source_url is null
    or source_url ~ '^https://[^[:space:]]+$'
  ),
  visibility text not null default 'public' check (visibility in ('public', 'hidden')),
  is_demo boolean not null default false,
  unique (artist_id, title, version)
);

create table public.external_music_links (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks on delete cascade,
  service text not null check (
    service in (
      'spotify',
      'apple',
      'youtube',
      'bandcamp',
      'melon'
    )
  ),
  url text not null check (url ~ '^https://[^[:space:]]+$'),
  external_id text,
  unique (track_id, service)
);

create table public.lyric_rights (
  track_id uuid primary key references public.tracks on delete cascade,
  status text not null default 'unverified' check (status in ('unverified', 'verified', 'expired')),
  provider_url text check (
    provider_url is null
    or provider_url ~ '^https://[^[:space:]]+$'
  ),
  license_reference text,
  expires_at timestamptz,
  lyrics text,
  translation text,
  pronunciation text,
  translation_allowed boolean not null default false,
  pronunciation_allowed boolean not null default false,
  check (
    (
      lyrics is null
      and translation is null
      and pronunciation is null
    )
    or (
      status = 'verified'
      and license_reference is not null
    )
  ),
  check (
    translation is null
    or translation_allowed
  ),
  check (
    pronunciation is null
    or pronunciation_allowed
  )
);

create table public.music_stories (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks on delete cascade,
  title text not null,
  body text not null,
  source_url text check (
    source_url is null
    or source_url ~ '^https://[^[:space:]]+$'
  ),
  author_id uuid references public.profiles on delete set null,
  visibility text not null default 'public' check (visibility in ('public', 'hidden')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  track_id uuid not null references public.tracks on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  kind text not null check (
    kind in (
      'impression',
      'interpretation',
      'knowledge',
      'concert'
    )
  ),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_saved_tracks (
  user_id uuid not null references public.profiles on delete cascade,
  track_id uuid not null references public.tracks on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create table public.user_saved_artists (
  user_id uuid not null references public.profiles on delete cascade,
  artist_id uuid not null references public.artists on delete cascade,
  primary key (user_id, artist_id)
);

create table public.user_saved_stories (
  user_id uuid not null references public.profiles on delete cascade,
  story_id uuid not null references public.music_stories on delete cascade,
  primary key (user_id, story_id)
);

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now()
);

create table public.playlist_tracks (
  playlist_id uuid not null references public.playlists on delete cascade,
  track_id uuid not null references public.tracks on delete cascade,
  position integer not null default 0 check (position >= 0),
  primary key (playlist_id, track_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles on delete cascade,
  following_id uuid not null references public.profiles on delete cascade,
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.post_reactions (
  user_id uuid not null references public.profiles on delete cascade,
  note_id uuid not null references public.user_notes on delete cascade,
  kind text not null check (kind in ('empathy', 'helpful')),
  primary key (user_id, note_id, kind)
);

create table public.concerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  venue text not null,
  starts_at timestamptz not null,
  description text not null default '',
  is_demo boolean not null default false
);

create table public.concert_artists (
  concert_id uuid not null references public.concerts on delete cascade,
  artist_id uuid not null references public.artists on delete cascade,
  primary key (concert_id, artist_id)
);

create table public.concert_tracks (
  concert_id uuid not null references public.concerts on delete cascade,
  track_id uuid not null references public.tracks on delete cascade,
  list_type text not null check (
    list_type in ('confirmed', 'fan_pick', 'expected')
  ),
  primary key (concert_id, track_id)
);

create table public.user_concert_progress (
  user_id uuid not null references public.profiles on delete cascade,
  concert_id uuid not null references public.concerts on delete cascade,
  track_id uuid not null references public.tracks on delete cascade,
  state text not null default 'new' check (state in ('new', 'familiar', 'singalong')),
  primary key (user_id, concert_id, track_id),
  foreign key (concert_id, track_id) references public.concert_tracks on delete cascade
);

create table public.user_saved_concerts (
  user_id uuid not null references public.profiles on delete cascade,
  concert_id uuid not null references public.concerts on delete cascade,
  primary key (user_id, concert_id)
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  track_id uuid references public.tracks on delete cascade,
  kind text not null check (
    kind in (
      'metadata',
      'artist',
      'background',
      'story',
      'interpretation',
      'error',
      'track_request'
    )
  ),
  title text not null check (char_length(title) between 1 and 150),
  body text not null check (char_length(body) between 1 and 5000),
  source_url text check (
    source_url is null
    or source_url ~ '^https://[^[:space:]]+$'
  ),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles,
  created_at timestamptz not null default now()
);

create table public.contribution_revisions (
  id bigint generated always as identity primary key,
  contribution_id uuid not null references public.contributions on delete cascade,
  revision jsonb not null,
  changed_at timestamptz not null default now()
);

create function public.log_contribution () returns trigger language plpgsql security definer
set
  search_path = '' as $$ begin insert into public.contribution_revisions(contribution_id,revision) values(new.id,to_jsonb(new));return new; end;$$;

create trigger contribution_revision
after insert or update on public.contributions for each row
execute function public.log_contribution ();

create table public.point_rules (
  kind text primary key,
  points integer not null check (points between 0 and 1000)
);

insert into
  public.point_rules
values
  ('background', 10),
  ('story', 10),
  ('metadata', 5),
  ('artist', 5),
  ('interpretation', 5),
  ('error', 3),
  ('track_request', 0);

create table public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  contribution_id uuid unique references public.contributions on delete set null,
  amount integer not null check (amount between -1000 and 1000),
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  note_id uuid references public.user_notes on delete cascade,
  track_id uuid references public.tracks on delete cascade,
  reason text not null check (char_length(reason) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  created_at timestamptz not null default now(),
  check (
    note_id is not null
    or track_id is not null
  )
);

-- Every table has RLS; explicit grants do not grant policy bypass.
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='public' loop
 execute format('alter table public.%I enable row level security', t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('grant select on public.%I to anon',t);
 end loop;
end $$;

grant usage on schema public to anon,
authenticated;

grant usage,
select
  on all sequences in schema public to authenticated;

revoke
update on public.profiles
from
  authenticated;

grant
update (username, nickname, bio, genres, favorite_artists) on public.profiles to authenticated;

create policy profiles_read on public.profiles for
select
  using (true);

create policy profiles_update on public.profiles
for update
  to authenticated using (
    id = (
      select
        auth.uid ()
    )
  )
with
  check (
    id = (
      select
        auth.uid ()
    )
  );

do $$ declare t text; begin
 foreach t in array array['artists','albums','external_music_links','concerts','concert_artists','concert_tracks','point_rules'] loop
 execute format('create policy catalog_read on public.%I for select using(true)',t);
 execute format('create policy catalog_admin on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
 end loop;
end $$;

create policy tracks_read on public.tracks for
select
  using (
    visibility = 'public'
    or public.is_admin ()
  );

create policy tracks_admin on public.tracks for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy stories_read on public.music_stories for
select
  using (
    visibility = 'public'
    or public.is_admin ()
  );

create policy stories_admin on public.music_stories for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy rights_read on public.lyric_rights for
select
  using (
    (
      status = 'verified'
      and (
        expires_at is null
        or expires_at > now()
      )
    )
    or public.is_admin ()
  );

create policy rights_admin on public.lyric_rights for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy notes_read on public.user_notes for
select
  using (
    visibility = 'public'
    or user_id = (
      select
        auth.uid ()
    )
  );

create policy notes_insert on public.user_notes for insert to authenticated
with
  check (
    user_id = (
      select
        auth.uid ()
    )
  );

create policy notes_update on public.user_notes
for update
  to authenticated using (
    user_id = (
      select
        auth.uid ()
    )
    or public.is_admin ()
  )
with
  check (
    user_id = (
      select
        auth.uid ()
    )
    or public.is_admin ()
  );

create policy notes_delete on public.user_notes for delete to authenticated using (
  user_id = (
    select
      auth.uid ()
  )
  or public.is_admin ()
);

do $$ declare t text; begin
 foreach t in array array['user_saved_tracks','user_saved_artists','user_saved_stories','user_concert_progress','user_saved_concerts'] loop
 execute format('create policy owner_only on public.%I for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',t);
 end loop;
end $$;

create policy playlists_read on public.playlists for
select
  using (
    visibility = 'public'
    or user_id = (
      select
        auth.uid ()
    )
  );

create policy playlists_owner on public.playlists for all to authenticated using (
  user_id = (
    select
      auth.uid ()
  )
)
with
  check (
    user_id = (
      select
        auth.uid ()
    )
  );

create policy playlist_tracks_read on public.playlist_tracks for
select
  using (
    exists (
      select
        1
      from
        public.playlists p
      where
        p.id = playlist_id
        and (
          p.visibility = 'public'
          or p.user_id = (
            select
              auth.uid ()
          )
        )
    )
  );

create policy playlist_tracks_owner on public.playlist_tracks for all to authenticated using (
  exists (
    select
      1
    from
      public.playlists p
    where
      p.id = playlist_id
      and p.user_id = (
        select
          auth.uid ()
      )
  )
)
with
  check (
    exists (
      select
        1
      from
        public.playlists p
      where
        p.id = playlist_id
        and p.user_id = (
          select
            auth.uid ()
        )
    )
  );

create policy follows_read on public.follows for
select
  using (true);

create policy follows_owner on public.follows for all to authenticated using (
  follower_id = (
    select
      auth.uid ()
  )
)
with
  check (
    follower_id = (
      select
        auth.uid ()
    )
  );

create policy reactions_read on public.post_reactions for
select
  using (
    exists (
      select
        1
      from
        public.user_notes n
      where
        n.id = note_id
        and n.visibility = 'public'
    )
  );

create policy reactions_owner on public.post_reactions for all to authenticated using (
  user_id = (
    select
      auth.uid ()
  )
)
with
  check (
    user_id = (
      select
        auth.uid ()
    )
    and exists (
      select
        1
      from
        public.user_notes n
      where
        n.id = note_id
        and n.visibility = 'public'
    )
  );

create policy contributions_read on public.contributions for
select
  using (
    user_id = (
      select
        auth.uid ()
    )
    or public.is_admin ()
    or status = 'approved'
  );

create policy contributions_insert on public.contributions for insert to authenticated
with
  check (
    user_id = (
      select
        auth.uid ()
    )
    and status = 'pending'
    and reviewed_by is null
    and review_note is null
  );

-- Decisions only through review_contribution, which atomically publishes and awards points.
create policy contributions_edit on public.contributions
for update
  to authenticated using (
    user_id = (
      select
        auth.uid ()
    )
    and status = 'pending'
  )
with
  check (
    user_id = (
      select
        auth.uid ()
    )
    and status = 'pending'
    and reviewed_by is null
    and review_note is null
  );

create policy revisions_read on public.contribution_revisions for
select
  using (
    public.is_admin ()
    or exists (
      select
        1
      from
        public.contributions c
      where
        c.id = contribution_id
        and c.user_id = (
          select
            auth.uid ()
        )
    )
  );

create policy points_read on public.point_ledger for
select
  to authenticated using (
    user_id = (
      select
        auth.uid ()
    )
    or public.is_admin ()
  );

create policy reports_insert on public.content_reports for insert to authenticated
with
  check (
    user_id = (
      select
        auth.uid ()
    )
    and status = 'pending'
  );

create policy reports_read on public.content_reports for
select
  to authenticated using (
    user_id = (
      select
        auth.uid ()
    )
    or public.is_admin ()
  );

create policy reports_admin on public.content_reports
for update
  to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create function public.review_contribution (
  target uuid,
  decision text,
  feedback text default ''
) returns void language plpgsql security definer
set
  search_path = '' as $$
declare c public.contributions; award integer;
begin
 if not public.is_admin() then raise exception '관리자 권한이 필요합니다'; end if;
 if decision not in ('approved','rejected') then raise exception '잘못된 결정'; end if;
 select * into c from public.contributions where id=target for update;
 if not found then raise exception '제안을 찾을 수 없습니다'; end if;
 if c.status<>'pending' then raise exception '이미 검토한 제안입니다'; end if;
 if decision='approved' and (c.source_url is null or c.kind='track_request') then raise exception '출처와 등록된 곡을 확인해 주세요'; end if;
 if decision='approved' and c.track_id is null then raise exception '공식 정보에 연결할 곡이 필요합니다'; end if;
 update public.contributions set status=decision,review_note=left(feedback,1000),reviewed_by=auth.uid() where id=target;
 if decision='approved' then
 insert into public.music_stories(track_id,title,body,source_url,author_id) values(c.track_id,c.title,c.body,c.source_url,c.user_id);
 select points into award from public.point_rules where kind=c.kind;
 insert into public.point_ledger(user_id,contribution_id,amount,reason) values(c.user_id,c.id,coalesce(award,0),'승인된 기여: '||c.title);
 end if;
end; $$;

create function public.adjust_points (target_user uuid, delta integer, explanation text) returns void language plpgsql security definer
set
  search_path = '' as $$
begin
 if not public.is_admin() then raise exception '관리자 권한이 필요합니다'; end if;
 if delta=0 or abs(delta)>1000 or char_length(trim(explanation))<1 then raise exception '금액과 사유를 확인하세요'; end if;
 insert into public.point_ledger(user_id,amount,reason) values(target_user,delta,left(explanation,500));
end; $$;

create function public.reorder_playlist (target uuid, ordered_ids uuid[]) returns void language plpgsql security definer
set
  search_path = '' as $$
declare existing uuid[];
begin
 perform 1 from public.playlists where id=target and user_id=auth.uid() for update;
 if not found then raise exception '플레이리스트 권한이 없습니다'; end if;
 select coalesce(array_agg(track_id order by track_id),'{}') into existing from public.playlist_tracks where playlist_id=target;
 if existing<>(select coalesce(array_agg(x order by x),'{}') from unnest(ordered_ids) x) then raise exception '곡 목록이 일치하지 않습니다'; end if;
 update public.playlist_tracks pt set position=i.ord-1 from unnest(ordered_ids) with ordinality i(id,ord) where pt.playlist_id=target and pt.track_id=i.id;
end; $$;

-- Security definer routines are callable only where explicitly intended.
revoke all on function public.on_signup (),
public.log_contribution ()
from
  public,
  anon,
  authenticated;

revoke all on function public.review_contribution (uuid, text, text),
public.adjust_points (uuid, integer, text),
public.reorder_playlist (uuid, uuid[])
from
  public,
  anon;

grant
execute on function public.review_contribution (uuid, text, text),
public.adjust_points (uuid, integer, text),
public.reorder_playlist (uuid, uuid[]) to authenticated;

create index tracks_title_trgm on public.tracks using gin (title gin_trgm_ops);

create index notes_track_public on public.user_notes (track_id, visibility, created_at desc);

create index notes_user on public.user_notes (user_id);

create index playlist_owner on public.playlists (user_id);

create index contribution_pending on public.contributions (status);

create unique index tracks_normalized_dedupe on public.tracks (
  artist_id,
  lower(
    regexp_replace(
      normalize(title, NFKC),
      '[[:space:][:punct:]]',
      '',
      'g'
    )
  ),
  lower(version)
);
