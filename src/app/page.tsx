import Link from "next/link";
import { ArrowRight, ArrowUpRight, PenLine, Radio, Disc3 } from "lucide-react";
import { catalog, findMusic, notes, profiles } from "@/lib/data/repository";
import { SearchBox } from "@/components/client-tools";
import {
  TrackCard,
  TrackRow,
  SectionTitle,
  NoteCard,
  Empty,
} from "@/components/music";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tab?: string;
    genre?: string;
    view?: string;
  }>;
}) {
  const p = await searchParams;
  const q = (p.q || "").slice(0, 120),
    tab = p.tab || "tracks";
  const [data, posts, people] = await Promise.all([
    catalog(),
    notes(),
    profiles(),
  ]);
  const artist = (id: string) => data.artists.find((a) => a.id === id);
  const searching = !!(q || p.genre || p.view);
  const results = await findMusic(q, tab);
  const tracks = results.tracks.filter((t) => !p.genre || t.genre === p.genre);
  return (
    <>
      <section className="hero">
        <p className="eyebrow">DIG DEEPER. KEEP CLOSER.</p>
        <h1>
          좋아하는 음악에는
          <br />
          <em>더 많은 이야기</em>가 있어요.
        </h1>
        <p className="hero-sub">
          발견한 음악을 깊이 들여다보고, 당신만의 이야기를 남겨 보세요.
        </p>
        <span className="hero-number">ARCHIVE NO. 001 — YOUR TASTE</span>
      </section>
      <SearchBox key={q} value={q} />
      <div className="quick-tags">
        {["인디 록", "드림 팝", "포크", "얼터너티브"].map((g) => (
          <Link
            className={`chip ${p.genre === g ? "active" : ""}`}
            key={g}
            href={`/?genre=${encodeURIComponent(g)}`}
          >
            # {g}
          </Link>
        ))}
      </div>
      {searching ? (
        <>
          <div className="tabs">
            {[
              ["tracks", "곡"],
              ["artists", "아티스트"],
              ["stories", "음악 이야기"],
              ["notes", "사람들의 기록"],
            ].map(([k, t]) => (
              <Link
                key={k}
                className={tab === k ? "active" : ""}
                href={`/?q=${encodeURIComponent(q)}&tab=${k}${p.genre ? `&genre=${encodeURIComponent(p.genre)}` : ""}`}
              >
                {t}
              </Link>
            ))}
          </div>
          <SectionTitle
            eyebrow="SEARCH THE ARCHIVE"
            title={q ? `‘${q}’ 검색 결과` : p.genre || "음악 아카이브"}
            href="/"
            label="검색 초기화"
          />
          {tab === "tracks" &&
            (tracks.length ? (
              <div>
                {tracks.map((t, i) => (
                  <TrackRow
                    key={t.id}
                    track={t}
                    artist={artist(t.artist_id)}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <Empty
                title="아직 서재에 없는 음악이에요"
                body="곡과 아티스트 표기를 바꾸어 보거나, 이 음악의 등록을 요청해 주세요."
                href={`/contribute?type=track_request&title=${encodeURIComponent(q)}`}
                label="이 음악을 등록 요청하기"
              />
            ))}
          {tab === "artists" && (
            <div className="playlist-grid">
              {results.artists.map((a) => (
                <Link
                  className="playlist-card"
                  key={a.id}
                  href={`/artists/${a.id}`}
                >
                  <Disc3 size={28} />
                  <h3>{a.name}</h3>
                  <p>
                    {a.aliases.join(" · ")} {a.is_demo ? "· 데모" : ""}
                  </p>
                  <span className="text-link">
                    아티스트의 음악 <ArrowUpRight size={14} />
                  </span>
                </Link>
              ))}
              {!results.artists.length && (
                <Empty
                  title="아티스트를 찾지 못했어요"
                  body="다른 이름으로 검색해 보세요."
                />
              )}
            </div>
          )}
          {tab === "stories" && (
            <div className="stack">
              {results.stories.map((s) => (
                <Link
                  className="story-block"
                  key={s.id}
                  href={`/tracks/${s.track_id}`}
                >
                  <span className="eyebrow">
                    {s.is_demo ? "DEMO STORY" : "MUSIC STORY"}
                  </span>
                  <h3>{s.title}</h3>
                  <p className="prose">{s.body}</p>
                </Link>
              ))}
              {!results.stories.length && (
                <Empty
                  title="아직 등록된 이야기가 없어요"
                  body="음악에 관한 출처 있는 이야기를 함께 남겨 주세요."
                  href="/contribute"
                  label="음악 이야기 제안하기"
                />
              )}
            </div>
          )}
          {tab === "notes" && (
            <div className="note-grid">
              {posts
                .filter(
                  (n) =>
                    n.visibility === "public" &&
                    (!q || n.body.toLowerCase().includes(q.toLowerCase())),
                )
                .map((n) => (
                  <NoteCard
                    key={n.id}
                    note={n}
                    track={data.tracks.find((t) => t.id === n.track_id)}
                    author={people.find((u) => u.id === n.user_id)}
                  />
                ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="entry-grid">
            <Link href="/live" className="entry-card live">
              <div className="entry-icon">
                <Radio size={23} />
              </div>
              <div>
                <p className="eyebrow">LIVE DIGGING</p>
                <h3>공연의 설렘, 미리 들어보기</h3>
                <p>무대에서 만나기 전, 한 곡 더 가까이.</p>
              </div>
              <ArrowUpRight className="entry-arrow" size={21} />
            </Link>
            <Link href="/write" className="entry-card">
              <div className="entry-icon">
                <PenLine size={21} />
              </div>
              <div>
                <p className="eyebrow">YOUR MUSIC JOURNAL</p>
                <h3>오늘의 음악, 한 줄의 마음</h3>
                <p>문득 떠오른 생각을 가볍게 남겨 보세요.</p>
              </div>
              <ArrowUpRight className="entry-arrow" size={21} />
            </Link>
          </div>
          <section>
            <SectionTitle
              eyebrow="A LITTLE DEEPER"
              title="오늘, 조금 더 알아갈 음악"
              href="/?view=all"
            />
            <div className="track-grid home-tracks">
              {data.tracks.slice(0, 4).map((t) => (
                <TrackCard key={t.id} track={t} artist={artist(t.artist_id)} />
              ))}
            </div>
          </section>
          <div className="home-divider" />
          <section>
            <SectionTitle
              eyebrow="BETWEEN MUSIC & US"
              title="음악 사이, 우리의 이야기"
              href="/?tab=notes&view=all"
            />
            <div className="note-grid">
              {posts
                .filter((n) => n.visibility === "public")
                .slice(0, 3)
                .map((n) => (
                  <NoteCard
                    key={n.id}
                    note={n}
                    track={data.tracks.find((t) => t.id === n.track_id)}
                    author={people.find((u) => u.id === n.user_id)}
                  />
                ))}
            </div>
            {!posts.some((n) => n.visibility === "public") && (
              <Empty
                title="첫 번째 음악 이야기를 기다려요"
                body="음악에 얽힌 한 줄의 기억을 기록하고 공개해 보세요."
                href="/write"
                label="음악 기록하기"
              />
            )}
          </section>
          <div className="home-divider" />
          <SectionTitle
            eyebrow="MAKE ROOM FOR MUSIC"
            title="취향을 모아 나만의 서재로"
            href="/library"
            label="내 서재 열기"
          />
          <p className="prose">
            어디에서 듣든, 좋아하는 음악은 한곳에.
            <br />
            노래와 순간을 연결해 당신의 음악 지도를 만들어 보세요.
          </p>
          <Link
            className="text-link"
            style={{ marginTop: 18, color: "var(--accent)" }}
            href="/contribute"
          >
            함께 만드는 지음 <ArrowRight size={15} />
          </Link>
        </>
      )}
    </>
  );
}
