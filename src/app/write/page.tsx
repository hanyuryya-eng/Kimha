import Link from "next/link";
import { notFound } from "next/navigation";
import { catalog, session, notes, demoMode } from "@/lib/data/repository";
import { NoteEditor } from "@/components/editor";
export const metadata = { title: "음악 기록하기" };
export default async function Write({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; edit?: string }>;
}) {
  const p = await searchParams;
  const [data, ctx, posts] = await Promise.all([catalog(), session(), notes()]);
  const note = p.edit
    ? posts.find((n) => n.id === p.edit && n.user_id === ctx.user?.id)
    : undefined;
  if (p.edit && !note) notFound();
  return (
    <div className="form-page">
      <header className="page-header">
        <p className="eyebrow">A NOTE TO YOUR MUSIC</p>
        <h1>{note ? "이야기를 다듬어 보세요" : "오늘의 음악, 오늘의 마음"}</h1>
        <p>완벽한 문장보다, 지금 떠오른 한 줄이면 충분해요.</p>
      </header>
      {(!ctx.user || demoMode()) && (
        <div className="notice">
          {demoMode() ? (
            "읽기 전용 데모입니다. 작성 화면을 살펴볼 수 있지만 DB 연결 전에는 저장되지 않습니다."
          ) : (
            <Link href="/login?next=/write">
              로그인하면 나만의 음악 기록을 저장할 수 있어요. 로그인하기 →
            </Link>
          )}
        </div>
      )}
      <NoteEditor
        tracks={data.tracks}
        artists={data.artists}
        note={note}
        trackId={p.track}
        disabled={!ctx.user || demoMode()}
      />
    </div>
  );
}
