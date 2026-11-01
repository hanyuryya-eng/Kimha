import { PlaybackLinks } from "@/components/playback-links";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Check,
  ExternalLink,
  Info,
  Plus,
} from "lucide-react";
import {
  catalog,
  notes,
  profiles,
  session,
  personalRows,
  musicLinks,
  rights,
  demoMode,
  playlists,
} from "@/lib/data/repository";
import { mayShowLyrics, safeHttps, safeMusicUrl } from "@/lib/domain";
import { Cover, NoteCard, WriteLink } from "@/components/music";
import { ShareButton } from "@/components/client-tools";
import { ActionForm, Hidden, Submit } from "@/components/action-form";
import { toggleSave, playlistMutation, socialAction } from "@/app/actions";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = (await catalog()).tracks.find((t) => t.id === id);
  return { title: t?.title || "곡을 찾을 수 없습니다" };
}
export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [
    data,
    posts,
    people,
    ctx,
    saved,
    links,
    allRights,
    lists,
    savedStories,
    savedArtists,
  ] = await Promise.all([
    catalog(),
    notes(),
    profiles(),
    session(),
    personalRows<{ track_id: string }>("user_saved_tracks"),
    musicLinks(),
    rights(),
    playlists(),
    personalRows<{ story_id: string }>("user_saved_stories"),
    personalRows<{ artist_id: string }>("user_saved_artists"),
  ]);
  const track = data.tracks.find((t) => t.id === id);
  if (!track) notFound();
  const artist = data.artists.find((a) => a.id === track.artist_id);
  const isSaved = saved.some((s) => s.track_id === id);
  const license = allRights.find((r) => r.track_id === id) || null;
  const mine = lists.filter((p) => p.user_id === ctx.user?.id);
  const active = !!ctx.user && !demoMode();
  const validLinks = links.filter(
    (l) => l.track_id === id && safeMusicUrl(l.service, l.url),
  );
  return (
    <>
      <Link href="/" className="back">
        <ArrowLeft size={14} />
        디깅으로 돌아가기
      </Link>
      <section className="track-top">
        <Cover track={track} />
        <div>
          <div className="actions">
            <span className="eyebrow">MUSIC ARCHIVE</span>
            {track.is_demo && <span className="tag">데모 데이터</span>}
          </div>
          <h1>{track.title}</h1>
          <Link className="artist-name" href={`/artists/${artist?.id}`}>
            {artist?.name}
          </Link>
          <p className="track-meta">
            {track.album_title ? `${track.album_title} · ` : ""}
            {track.released_year} · {track.genre} ·{" "}
            {track.version === "original" ? "오리지널" : track.version}
          </p>
          <div className="actions">
            <ActionForm action={toggleSave}>
              <Hidden name="track_id" value={id} />
              <Submit
                disabled={!active}
                variant={isSaved ? "outline" : "default"}
              >
                {isSaved ? <Check size={16} /> : <Bookmark size={16} />}{" "}
                {isSaved ? "서재에 저장됨" : "내 서재에 저장"}
              </Submit>
            </ActionForm>
            <WriteLink trackId={id} />
            <ShareButton title={`${track.title} | 지음`} />
          </div>
          {!active && (
            <p className="tiny" style={{ marginTop: 12 }}>
              {demoMode() ? (
                "읽기 전용 데모입니다. 실제 저장에는 DB 연결이 필요합니다."
              ) : (
                <Link href={`/login?next=/tracks/${id}`}>
                  로그인하고 내 서재에 저장하세요 →
                </Link>
              )}
            </p>
          )}
        </div>
      </section>
      <div className="two-columns">
        <div>
          <section className="section-block">
            <h2>곡 소개</h2>
            <p>{track.description || "아직 곡 소개가 등록되지 않았습니다."}</p>
            {safeHttps(track.source_url) && (
              <a
                className="text-link"
                href={safeHttps(track.source_url)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                메타데이터 출처 <ExternalLink size={13} />
              </a>
            )}
          </section>
          <section className="section-block">
            <h2>가사와 의미</h2>
            {mayShowLyrics(license) ? (
              <>
                <p>
                  {license?.lyrics ||
                    "이용권이 확인된 가사 원문이 아직 등록되지 않았습니다."}
                </p>
                {license?.translation_allowed && license.translation && (
                  <>
                    <h3>번역</h3>
                    <p>{license.translation}</p>
                  </>
                )}
                {license?.pronunciation_allowed && license.pronunciation && (
                  <>
                    <h3>발음 가이드</h3>
                    <p>{license.pronunciation}</p>
                  </>
                )}
              </>
            ) : (
              <p>
                가사와 번역의 이용권이 확인되지 않아 전문을 제공하지 않습니다.
                아래 음악 해설과 사람들의 기록에서 다양한 감상을 만나보세요.
              </p>
            )}
            {safeHttps(license?.provider_url) && (
              <a
                className="btn btn-outline"
                href={safeHttps(license?.provider_url)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                허용된 제공처에서 보기 <ExternalLink size={14} />
              </a>
            )}
          </section>
          <section className="section-block">
            <h2>음악적 배경과 이야기</h2>
            {data.stories
              .filter((s) => s.track_id === id)
              .map((s) => (
                <article key={s.id} className="story-block">
                  <span className="eyebrow">
                    {s.is_demo ? "DEMO · 독자적 예시" : "승인된 음악 이야기"}
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                  {safeHttps(s.source_url) && (
                    <a
                      className="source"
                      href={safeHttps(s.source_url)!}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      출처 확인 <ExternalLink size={12} />
                    </a>
                  )}
                  <ActionForm action={socialAction}>
                    <Hidden name="op" value="story" />
                    <Hidden name="target" value={s.id} />
                    <Submit disabled={!active} variant="ghost">
                      <Bookmark size={13} />
                      {savedStories.some((x) => x.story_id === s.id)
                        ? "해설 저장 취소"
                        : "해설 저장"}
                    </Submit>
                  </ActionForm>
                </article>
              ))}
            {!data.stories.some((s) => s.track_id === id) && (
              <p>
                아직 등록된 해설이 없습니다. 출처가 있는 이야기를 제안해 주세요.
              </p>
            )}
            <Link
              className="text-link"
              href={`/contribute?track=${id}`}
              style={{ marginTop: 18 }}
            >
              <Plus size={14} />
              정보 추가·수정 제안
            </Link>
          </section>
          <section className="section-block">
            <h2>사람들의 기록</h2>
            <div className="stack">
              {posts
                .filter((n) => n.track_id === id && n.visibility === "public")
                .map((n) => (
                  <NoteCard
                    key={n.id}
                    note={n}
                    author={people.find((p) => p.id === n.user_id)}
                  />
                ))}
            </div>
            {!posts.some(
              (n) => n.track_id === id && n.visibility === "public",
            ) && <p>이 음악의 첫 번째 이야기를 남겨 주세요.</p>}
          </section>
        </div>
        <aside className="stack">
          <section className="panel aside-panel">
            <h3>음악은 듣던 곳에서</h3>
            <p>
              지음은 음원을 재생하지 않습니다. 등록된 곡 링크만 외부 음악
              서비스로 연결합니다.
            </p>
            <PlaybackLinks links={validLinks} />
            {!validLinks.length && (
              <p>
                <Info
                  size={14}
                  style={{ display: "inline", verticalAlign: "middle" }}
                />{" "}
                확인된 외부 곡 링크가 없습니다.
                {track.is_demo
                  ? " 가상의 데모 곡에는 재생 링크를 제공하지 않습니다."
                  : ""}
              </p>
            )}
          </section>
          <section className="panel aside-panel">
            <h3>나의 플레이리스트에</h3>
            {mine.length ? (
              <ActionForm action={playlistMutation} className="stack">
                <Hidden name="op" value="add" />
                <Hidden name="track_id" value={id} />
                <label className="field">
                  <span>플레이리스트 선택</span>
                  <select className="input" name="playlist_id">
                    {mine.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Submit>
                  <Plus size={15} />곡 추가하기
                </Submit>
              </ActionForm>
            ) : (
              <>
                <p>음악과 순간을 이어 나만의 목록을 만들어 보세요.</p>
                <Link href="/playlists/new" className="text-link">
                  플레이리스트 만들기 →
                </Link>
              </>
            )}
          </section>
          <section className="panel aside-panel">
            <h3>좋아하는 아티스트</h3>
            <p>{artist?.name}의 음악을 모아보세요.</p>
            <ActionForm action={socialAction}>
              <Hidden name="op" value="artist" />
              <Hidden name="target" value={track.artist_id} />
              <Submit disabled={!active} variant="outline">
                {savedArtists.some((x) => x.artist_id === track.artist_id)
                  ? "아티스트 저장 취소"
                  : "아티스트 저장"}
              </Submit>
            </ActionForm>
          </section>
          <section className="panel aside-panel">
            <h3>공연으로 이어지는 음악</h3>
            <p>한 곡씩 익숙해지고, 함께 부르는 순간까지.</p>
            <Link href="/live" className="text-link">
              라이브 디깅 둘러보기 →
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
