import Link from "next/link";
import { Plus, ListMusic, Lock, Globe, ArrowUpRight } from "lucide-react";
import {
  catalog,
  session,
  personalRows,
  notes,
  playlists,
  profiles,
  ledger,
  contributions,
  demoMode,
} from "@/lib/data/repository";
import { TrackRow, NoteCard, Empty } from "@/components/music";
import type { Note } from "@/lib/types";
export const metadata = { title: "내 음악 서재" };
export default async function Library({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab = "tracks", q = "" } = await searchParams;
  const [
    data,
    ctx,
    allNotes,
    allLists,
    people,
    points,
    proposals,
    saved,
    artists,
    stories,
    concerts,
  ] = await Promise.all([
    catalog(),
    session(),
    notes(),
    playlists(),
    profiles(),
    ledger(),
    contributions(),
    personalRows<{ track_id: string }>("user_saved_tracks"),
    personalRows<{ artist_id: string }>("user_saved_artists"),
    personalRows<{ story_id: string }>("user_saved_stories"),
    personalRows<{ concert_id: string }>("user_saved_concerts"),
  ]);
  const mine = ctx.user?.id;
  const lists = allLists.filter((p) => p.user_id === mine);
  const posts: Note[] = allNotes.filter((n) => n.user_id === mine);
  const tracks = data.tracks.filter(
    (t) =>
      saved.some((s) => s.track_id === t.id) &&
      (!q ||
        (
          t.title + data.artists.find((a) => a.id === t.artist_id)?.name
        ).includes(q)),
  );
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">YOUR PERSONAL MUSIC ARCHIVE</p>
        <h1>나의 음악 서재</h1>
        <p>좋아하는 음악, 지나간 순간, 그리고 오래 남길 이야기.</p>
      </header>
      <div className="actions">
        <Link href="/playlists/new" className="btn btn-outline">
          <Plus size={16} />
          플레이리스트 만들기
        </Link>
        <Link href="/write" className="btn btn-primary">
          음악 기록하기 <ArrowUpRight size={16} />
        </Link>
      </div>
      {!mine && (
        <div className="notice" style={{ marginTop: 22 }}>
          {demoMode() ? (
            "읽기 전용 데모입니다. 아래 개인 데이터는 비어 있으며, 실제 DB 연결과 로그인 후 사용할 수 있습니다."
          ) : (
            <Link href="/login?next=/library">
              로그인하고 당신의 음악을 모아 보세요 →
            </Link>
          )}
        </div>
      )}
      <div className="tabs">
        {[
          ["tracks", "저장한 음악"],
          ["notes", "내 기록"],
          ["playlists", "플레이리스트"],
          ["artists", "아티스트"],
          ["stories", "저장한 해설"],
          ["concerts", "공연"],
          ["points", "기여·포인트"],
        ].map(([k, v]) => (
          <Link
            key={k}
            href={`/library?tab=${k}`}
            className={tab === k ? "active" : ""}
          >
            {v}
          </Link>
        ))}
      </div>
      {tab === "tracks" && (
        <>
          <form
            action="/library"
            className="inline-form"
            style={{ marginBottom: 20 }}
          >
            <input
              className="input"
              aria-label="내 음악 검색"
              name="q"
              defaultValue={q}
              placeholder="내 서재에서 음악 찾기"
            />
            <button className="btn btn-outline">검색</button>
          </form>
          {tracks.length ? (
            tracks.map((t) => (
              <TrackRow
                key={t.id}
                track={t}
                artist={data.artists.find((a) => a.id === t.artist_id)}
              />
            ))
          ) : (
            <Empty
              title={
                q ? "검색 결과가 없어요" : "아직 서재에 담긴 음악이 없어요"
              }
              body="곡 페이지에서 ‘내 서재에 저장’을 누르면 좋아하는 음악을 이곳에서 만날 수 있어요."
              href="/"
            />
          )}
        </>
      )}
      {tab === "notes" &&
        (posts.length ? (
          <div className="note-grid">
            {posts.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                track={data.tracks.find((t) => t.id === n.track_id)}
                author={people.find((p) => p.id === mine)}
              />
            ))}
          </div>
        ) : (
          <Empty
            title="첫 음악 기록을 남겨보세요"
            body="나의 감상부터 공연의 기억까지. 기본은 나만 보는 비공개 기록입니다."
            href="/write"
            label="기록하기"
          />
        ))}
      {tab === "playlists" &&
        (lists.length ? (
          <div className="playlist-grid">
            {lists.map((p) => (
              <Link
                href={`/playlists/${p.id}`}
                key={p.id}
                className="playlist-card"
              >
                <ListMusic size={28} />
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <span className="tag">
                  {p.visibility === "private" ? (
                    <Lock size={11} />
                  ) : (
                    <Globe size={11} />
                  )}{" "}
                  {p.visibility === "private" ? "비공개" : "공개"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            title="순간에 어울리는 음악을 모아보세요"
            body="밤의 드라이브, 비 오는 날, 공연 전 듣고 싶은 음악까지."
            href="/playlists/new"
            label="플레이리스트 만들기"
          />
        ))}
      {tab === "artists" && (
        <div className="playlist-grid">
          {data.artists
            .filter((a) => artists.some((s) => s.artist_id === a.id))
            .map((a) => (
              <Link
                className="playlist-card"
                href={`/artists/${a.id}`}
                key={a.id}
              >
                <h3>{a.name}</h3>
                <p>{a.bio}</p>
              </Link>
            ))}
          {!artists.length && (
            <Empty
              title="좋아하는 아티스트를 모아보세요"
              body="곡 상세에서 아티스트를 저장할 수 있습니다."
              href="/"
            />
          )}
        </div>
      )}
      {tab === "stories" && (
        <div className="stack">
          {data.stories
            .filter((s) => stories.some((v) => v.story_id === s.id))
            .map((s) => (
              <Link
                className="story-block"
                href={`/tracks/${s.track_id}`}
                key={s.id}
              >
                <h3>{s.title}</h3>
                <p className="prose">{s.body}</p>
              </Link>
            ))}
          {!stories.length && (
            <Empty
              title="다시 읽고 싶은 음악 이야기"
              body="곡 페이지에서 해설을 저장해 보세요."
              href="/"
            />
          )}
        </div>
      )}
      {tab === "concerts" && (
        <div className="playlist-grid">
          {data.concerts
            .filter((c) => concerts.some((s) => s.concert_id === c.id))
            .map((c) => (
              <Link className="playlist-card" href={`/live/${c.id}`} key={c.id}>
                <h3>{c.title}</h3>
                <p>{c.venue}</p>
              </Link>
            ))}
          {!concerts.length && (
            <Empty
              title="다음 공연을 준비해 보세요"
              body="공연 페이지에서 디깅 목록을 저장할 수 있어요."
              href="/live"
              label="라이브 디깅"
            />
          )}
        </div>
      )}
      {tab === "points" && (
        <div className="stack">
          <section className="panel">
            <p className="eyebrow">JI–EUM POINTS</p>
            <h2>
              {points
                .filter((p) => p.user_id === mine)
                .reduce((s, p) => s + p.amount, 0)}{" "}
              P
            </h2>
            <p className="prose">
              현금 가치가 없는 기여 인정 수단입니다. 승인된 정보 기여만
              지급됩니다.
            </p>
            {points
              .filter((p) => p.user_id === mine)
              .map((p) => (
                <p key={p.id} className="track-row">
                  {p.reason}
                  <span style={{ marginLeft: "auto" }}>
                    {p.amount > 0 ? "+" : ""}
                    {p.amount} P
                  </span>
                </p>
              ))}
          </section>
          <section className="panel">
            <h2 style={{ fontSize: 19 }}>내가 제안한 이야기</h2>
            {proposals
              .filter((p) => p.user_id === mine)
              .map((p) => (
                <div className="admin-item" key={p.id}>
                  <h3>
                    {p.title} <span className="tag">{p.status}</span>
                  </h3>
                  <p>{p.review_note || "검토 결과가 여기에 표시됩니다."}</p>
                </div>
              ))}
            <Link
              href="/contribute"
              className="text-link"
              style={{ marginTop: 15 }}
            >
              새로운 정보 제안하기 →
            </Link>
          </section>
        </div>
      )}
    </>
  );
}
