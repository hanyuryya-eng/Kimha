import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Bookmark, ArrowLeft } from "lucide-react";
import {
  catalog,
  concertTracks,
  concertArtists,
  personalRows,
  session,
} from "@/lib/data/repository";
import { TrackRow } from "@/components/music";
import { ActionForm, Hidden, Submit } from "@/components/action-form";
import { saveProgress, socialAction } from "@/app/actions";
import { progressLabels } from "@/lib/domain";
import { dateLabel } from "@/lib/utils";
export default async function ConcertDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, items, ctx, progress, saved, lineup] = await Promise.all([
    catalog(),
    concertTracks(),
    session(),
    personalRows<{ concert_id: string; track_id: string; state: string }>(
      "user_concert_progress",
    ),
    personalRows<{ concert_id: string }>("user_saved_concerts"),
    concertArtists(),
  ]);
  const c = data.concerts.find((c) => c.id === id);
  if (!c) notFound();
  const list = items.filter((t) => t.concert_id === id);
  const ready = progress.filter(
    (p) => p.concert_id === id && p.state === "singalong",
  ).length;
  return (
    <>
      <Link href="/live" className="back">
        <ArrowLeft size={14} />
        라이브 디깅
      </Link>
      <header className="concert-hero">
        <p className="eyebrow">
          {c.is_demo ? "DEMO · LIVE DIGGING" : "LIVE DIGGING"}
        </p>
        <h1>{c.title}</h1>
        <div className="concert-meta">
          <span>
            <CalendarDays size={14} />
            {dateLabel(c.starts_at)}
          </span>
          <span>
            <MapPin size={14} />
            {c.venue}
          </span>
        </div>
        <p>{c.description}</p>
      </header>
      <div className="actions" style={{ marginBottom: 24 }}>
        {lineup
          .filter((l) => l.concert_id === id)
          .map((l) => (
            <Link
              className="chip"
              href={`/artists/${l.artist_id}`}
              key={l.artist_id}
            >
              {data.artists.find((a) => a.id === l.artist_id)?.name}
            </Link>
          ))}
      </div>
      <ActionForm action={socialAction}>
        <Hidden name="op" value="concert" />
        <Hidden name="target" value={id} />
        <Submit variant="outline" disabled={!ctx.user}>
          <Bookmark size={15} />
          {saved.some((s) => s.concert_id === id)
            ? "공연 디깅 저장 취소"
            : "공연 디깅 목록 저장"}
        </Submit>
      </ActionForm>
      <div className="section-title">
        <div>
          <p className="eyebrow">ONE SONG AT A TIME</p>
          <h2>공연을 준비하는 한 곡</h2>
        </div>
        <span className="tiny">{list.length}곡</span>
      </div>
      <div className="progress-summary">
        <span>
          함께 부를 수 있는 곡 {ready}/{list.length}
        </span>
        <div className="progress-bar">
          <span
            style={{
              width: `${list.length ? (ready / list.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
      {!ctx.user && (
        <p className="notice">
          로그인 후 준비 상태를 저장할 수 있습니다. 데모에서는 상태 변경이
          저장되지 않습니다.
        </p>
      )}
      {list.map((item) => {
        const t = data.tracks.find((t) => t.id === item.track_id);
        if (!t) return null;
        const state =
          progress.find((p) => p.concert_id === id && p.track_id === t.id)
            ?.state || "new";
        return (
          <div className="live-item" key={t.id}>
            <div>
              <TrackRow
                track={t}
                artist={data.artists.find((a) => a.id === t.artist_id)}
              />
              <span className="tag" style={{ marginLeft: 68 }}>
                {
                  {
                    confirmed: "확정 셋리스트",
                    fan_pick: "팬 추천 · 셋리스트 미확정",
                    expected: "예상 곡 · 미확정",
                  }[item.list_type as "confirmed"]
                }
              </span>
            </div>
            <ActionForm action={saveProgress}>
              <Hidden name="concert_id" value={id} />
              <Hidden name="track_id" value={t.id} />
              <label>
                <span className="sr-only">{t.title} 준비 상태</span>
                <select
                  aria-label={`${t.title} 준비 상태`}
                  className="input"
                  name="state"
                  defaultValue={state}
                >
                  {Object.entries(progressLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <Submit disabled={!ctx.user} variant="outline">
                저장
              </Submit>
            </ActionForm>
          </div>
        );
      })}
    </>
  );
}
