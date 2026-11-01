import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Globe, Heart, Lightbulb, ArrowLeft } from "lucide-react";
import { notes, profiles, catalog, session } from "@/lib/data/repository";
import { noteKinds } from "@/lib/domain";
import { NoteCard, TrackRow } from "@/components/music";
import { ShareButton } from "@/components/client-tools";
import { ActionForm, Hidden, Submit } from "@/components/action-form";
import { deleteNote, socialAction, reportContent } from "@/app/actions";
import { Textarea } from "@/components/ui/input";
import { dateLabel } from "@/lib/utils";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const n = (await notes()).find(
    (n) => n.id === id && n.visibility === "public",
  );
  if (!n)
    return {
      title: "비공개 음악 기록",
      robots: { index: false, follow: false },
      openGraph: {
        title: "지음 음악 기록",
        description: "공개된 음악 이야기를 만나보세요.",
      },
    };
  const data = await catalog(),
    track = data.tracks.find((t) => t.id === n.track_id),
    p = (await profiles()).find((p) => p.id === n.user_id);
  const title = `${track?.title || "음악"} — ${p?.nickname || "리스너"}의 기록`;
  return {
    title,
    description: n.body.slice(0, 110),
    openGraph: {
      title,
      description: n.body.slice(0, 110),
      url: `/notes/${id}`,
      images: ["/opengraph-image"],
    },
  };
}
export default async function NoteDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [posts, people, data, ctx] = await Promise.all([
    notes(),
    profiles(),
    catalog(),
    session(),
  ]);
  const note = posts.find((n) => n.id === id);
  if (!note || (note.visibility === "private" && note.user_id !== ctx.user?.id))
    notFound();
  const track = data.tracks.find((t) => t.id === note.track_id),
    author = people.find((p) => p.id === note.user_id),
    own = ctx.user?.id === note.user_id;
  const reactions = ctx.db
    ? (await ctx.db.from("post_reactions").select("*").eq("note_id", id))
        .data || []
    : [];
  return (
    <article className="note-detail">
      <Link
        href={own ? "/library?tab=notes" : "/?view=all&tab=notes"}
        className="back"
      >
        <ArrowLeft size={14} />
        음악 기록
      </Link>
      <header className="page-header">
        <p className="eyebrow">BETWEEN MUSIC & US</p>
        <h1>{track?.title || "음악에 남긴 이야기"}</h1>
        <p>
          {noteKinds[note.kind as keyof typeof noteKinds]} ·{" "}
          {dateLabel(note.created_at)} ·{" "}
          {note.visibility === "private" ? (
            <>
              <Lock size={12} style={{ display: "inline" }} /> 비공개 · 나만 볼
              수 있어요
            </>
          ) : (
            <>
              <Globe size={12} style={{ display: "inline" }} /> 공개 기록
            </>
          )}
        </p>
      </header>
      <Link href={`/profiles/${author?.username}`} className="account">
        <span className="avatar" aria-hidden="true">
          {author?.nickname.slice(0, 1)}
        </span>
        {author?.nickname}
      </Link>
      {note.is_demo && (
        <div className="notice" style={{ marginTop: 20 }}>
          이 글과 작성자 프로필은 가상의 데모 데이터입니다.
        </div>
      )}
      <div className="note-content">{note.body}</div>
      {track && (
        <TrackRow
          track={track}
          artist={data.artists.find((a) => a.id === track.artist_id)}
        />
      )}
      <div className="reactions">
        {note.visibility === "public" &&
          [
            ["empathy", "공감해요", Heart],
            ["helpful", "도움이 됐어요", Lightbulb],
          ].map(([kind, label, Icon]) => {
            const K = Icon as typeof Heart;
            const k = kind as string;
            return (
              <ActionForm key={k} action={socialAction}>
                <Hidden name="op" value="reaction" />
                <Hidden name="target" value={id} />
                <Hidden name="kind" value={k} />
                <Submit
                  disabled={!ctx.user}
                  variant={
                    reactions.some(
                      (r) => r.kind === k && r.user_id === ctx.user?.id,
                    )
                      ? "default"
                      : "outline"
                  }
                >
                  <K size={15} />
                  {label as string}{" "}
                  {reactions.filter((r) => r.kind === k).length}
                </Submit>
              </ActionForm>
            );
          })}
      </div>
      <div className="actions">
        {note.visibility === "public" && (
          <ShareButton title={`${track?.title} — ${author?.nickname}의 기록`} />
        )}{" "}
        {own && (
          <>
            <Link className="btn btn-outline" href={`/write?edit=${id}`}>
              수정하기
            </Link>
            <ActionForm
              action={deleteNote}
              confirm="이 기록을 삭제할까요? 삭제한 기록은 복구할 수 없습니다."
            >
              <Hidden name="id" value={id} />
              <Submit variant="destructive">삭제하기</Submit>
            </ActionForm>
          </>
        )}
      </div>
      {ctx.user && !own && (
        <details className="section-block" style={{ marginTop: 30 }}>
          <summary>이 기록 신고하기</summary>
          <ActionForm action={reportContent} className="stack">
            <Hidden name="note_id" value={id} />
            <label className="field">
              <span>신고 사유</span>
              <Textarea name="reason" required maxLength={2000} />
            </label>
            <Submit variant="outline">신고 접수</Submit>
          </ActionForm>
        </details>
      )}
      <section style={{ marginTop: 35 }}>
        <h2 style={{ fontSize: 19 }}>같은 곡에 남긴 다른 기록</h2>
        <div className="stack" style={{ marginTop: 20 }}>
          {posts
            .filter(
              (n) =>
                n.id !== id &&
                n.track_id === note.track_id &&
                n.visibility === "public",
            )
            .slice(0, 3)
            .map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                author={people.find((p) => p.id === n.user_id)}
              />
            ))}
        </div>
      </section>
    </article>
  );
}
