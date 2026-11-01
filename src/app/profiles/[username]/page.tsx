import Link from "next/link";
import { notFound } from "next/navigation";
import { ListMusic, UserPlus } from "lucide-react";
import {
  profiles,
  notes,
  playlists,
  catalog,
  session,
  contributions,
} from "@/lib/data/repository";
import { NoteCard } from "@/components/music";
import { ActionForm, Hidden, Submit } from "@/components/action-form";
import { socialAction } from "@/app/actions";
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [people, posts, lists, data, ctx, proposals] = await Promise.all([
    profiles(),
    notes(),
    playlists(),
    catalog(),
    session(),
    contributions(),
  ]);
  const p = people.find((p) => p.username === username);
  if (!p) notFound();
  const following = ctx.db
    ? (await ctx.db.from("follows").select("*").eq("following_id", p.id))
        .data || []
    : [];
  const follows = ctx.db
    ? (await ctx.db.from("follows").select("*").eq("follower_id", p.id)).data ||
      []
    : [];
  return (
    <>
      <header className="profile-header">
        <span className="avatar large">{p.nickname.slice(0, 1)}</span>
        <div>
          <p className="eyebrow">A LISTENER’S ARCHIVE</p>
          <h1>{p.nickname}</h1>
          <p>{p.bio || "음악과 함께 이야기를 쌓아 가는 중입니다."}</p>
        </div>
      </header>
      <div className="actions">
        {p.genres.map((g) => (
          <span className="chip" key={g}>
            {g}
          </span>
        ))}
        {ctx.user?.id === p.id ? (
          <Link className="btn btn-outline" href="/settings">
            프로필 편집
          </Link>
        ) : (
          <ActionForm action={socialAction}>
            <Hidden name="op" value="follow" />
            <Hidden name="target" value={p.id} />
            <Submit disabled={!ctx.user} variant="outline">
              <UserPlus size={15} />
              {following.some((f) => f.follower_id === ctx.user?.id)
                ? "팔로우 취소"
                : "팔로우"}
            </Submit>
          </ActionForm>
        )}
      </div>
      <p className="profile-stats">
        팔로워 {following.length} · 팔로잉 {follows.length} · 공개 기록{" "}
        {
          posts.filter((n) => n.user_id === p.id && n.visibility === "public")
            .length
        }
      </p>
      <section className="section-block">
        <h2>공개한 음악 기록</h2>
        <div className="note-grid">
          {posts
            .filter((n) => n.user_id === p.id && n.visibility === "public")
            .map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                track={data.tracks.find((t) => t.id === n.track_id)}
                author={p}
              />
            ))}
        </div>
        {!posts.some(
          (n) => n.user_id === p.id && n.visibility === "public",
        ) && <p>아직 공개한 기록이 없습니다.</p>}
      </section>
      <section className="section-block">
        <h2>공개 플레이리스트</h2>
        <div className="playlist-grid">
          {lists
            .filter((l) => l.user_id === p.id && l.visibility === "public")
            .map((l) => (
              <Link
                className="playlist-card"
                href={`/playlists/${l.id}`}
                key={l.id}
              >
                <ListMusic size={25} />
                <h3>{l.name}</h3>
                <p>{l.description}</p>
              </Link>
            ))}
        </div>
      </section>
      <section className="section-block">
        <h2>좋아하는 아티스트</h2>
        <div className="actions">
          {(p.favorite_artists || []).map((a) => (
            <span className="chip" key={a}>
              {a}
            </span>
          ))}
        </div>
        {!p.favorite_artists?.length && <p>아직 공개한 아티스트가 없습니다.</p>}
      </section>
      <section className="section-block">
        <h2>승인된 기여 이력</h2>
        {proposals
          .filter((c) => c.user_id === p.id && c.status === "approved")
          .map((c) => (
            <Link
              className="story-block"
              style={{ display: "block" }}
              href={c.track_id ? `/tracks/${c.track_id}` : "/"}
              key={c.id}
            >
              <h3>{c.title}</h3>
              <span className="tag">승인된 기여</span>
            </Link>
          ))}
        {!proposals.some(
          (c) => c.user_id === p.id && c.status === "approved",
        ) && <p>아직 승인된 기여가 없습니다.</p>}
      </section>
    </>
  );
}
