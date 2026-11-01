import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUp, ArrowDown, Plus, Trash2, Lock, Globe } from "lucide-react";
import {
  playlists,
  playlistTracks,
  catalog,
  session,
} from "@/lib/data/repository";
import { TrackRow, Empty } from "@/components/music";
import { PlaylistEditor } from "@/components/editor";
import { ActionForm, Hidden, Submit } from "@/components/action-form";
import { playlistMutation } from "@/app/actions";
import { ShareButton } from "@/components/client-tools";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = (await playlists()).find(
    (p) => p.id === id && p.visibility === "public",
  );
  return {
    title: p?.name || "나의 플레이리스트",
    robots: p ? undefined : { index: false, follow: false },
    openGraph: {
      title: p?.name || "지음 플레이리스트",
      description: p?.description || "음악을 좀 더 가까이.",
    },
  };
}
export default async function PlaylistPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const [lists, allItems, data, ctx] = await Promise.all([
    playlists(),
    playlistTracks(),
    catalog(),
    session(),
  ]);
  const p = lists.find((p) => p.id === id);
  if (!p || (p.visibility === "private" && p.user_id !== ctx.user?.id))
    notFound();
  const owner = p.user_id === ctx.user?.id;
  if (edit && !owner) notFound();
  const items = allItems
    .filter((t) => t.playlist_id === id)
    .sort((a, b) => a.position - b.position);
  if (edit)
    return (
      <div className="form-page">
        <header className="page-header">
          <h1>플레이리스트 편집</h1>
        </header>
        <PlaylistEditor playlist={p} disabled={!owner} />
      </div>
    );
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">YOUR COLLECTION</p>
        <h1>{p.name}</h1>
        <p>{p.description}</p>
        <p>
          {p.visibility === "private" ? (
            <Lock size={12} style={{ display: "inline" }} />
          ) : (
            <Globe size={12} style={{ display: "inline" }} />
          )}{" "}
          {p.visibility === "private"
            ? "나만 보는 플레이리스트"
            : "공개 플레이리스트"}{" "}
          · {items.length}곡
        </p>
      </header>
      <div className="actions">
        {p.visibility === "public" && (
          <ShareButton title={`${p.name} | 지음`} />
        )}{" "}
        {owner && (
          <>
            <Link className="btn btn-outline" href={`/playlists/${id}?edit=1`}>
              이름·설명·공개 설정 수정
            </Link>
            <ActionForm
              action={playlistMutation}
              confirm="플레이리스트를 삭제할까요?"
            >
              <Hidden name="op" value="delete" />
              <Hidden name="playlist_id" value={id} />
              <Submit variant="destructive">
                <Trash2 size={14} />
                삭제
              </Submit>
            </ActionForm>
          </>
        )}
      </div>
      <section style={{ margin: "25px 0" }}>
        {items.map((item, i) => {
          const track = data.tracks.find((t) => t.id === item.track_id);
          if (!track) return null;
          return (
            <div className="playlist-item" key={item.track_id}>
              <TrackRow
                track={track}
                artist={data.artists.find((a) => a.id === track.artist_id)}
                index={i}
              />
              {owner && (
                <div className="actions">
                  {[-1, 1].map((dir) => {
                    const ids = items.map((t) => t.track_id);
                    const j = i + dir;
                    if (j >= 0 && j < ids.length)
                      [ids[i], ids[j]] = [ids[j], ids[i]];
                    return (
                      <ActionForm action={playlistMutation} key={dir}>
                        <Hidden name="op" value="reorder" />
                        <Hidden name="playlist_id" value={id} />
                        <Hidden
                          name="ordered_ids"
                          value={JSON.stringify(ids)}
                        />
                        <Submit
                          disabled={j < 0 || j >= ids.length}
                          variant="ghost"
                        >
                          {dir === -1 ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )}
                          <span className="sr-only">
                            {dir === -1 ? "위로" : "아래로"}
                          </span>
                        </Submit>
                      </ActionForm>
                    );
                  })}
                  <ActionForm action={playlistMutation}>
                    <Hidden name="op" value="remove" />
                    <Hidden name="playlist_id" value={id} />
                    <Hidden name="track_id" value={item.track_id} />
                    <Submit variant="ghost">곡 삭제</Submit>
                  </ActionForm>
                </div>
              )}
            </div>
          );
        })}
        {!items.length && (
          <Empty
            title="첫 곡을 담아보세요"
            body="곡 상세 페이지에서도 플레이리스트에 추가할 수 있어요."
            href="/"
          />
        )}
      </section>
      {owner && (
        <ActionForm action={playlistMutation} className="panel stack">
          <Hidden name="op" value="add" />
          <Hidden name="playlist_id" value={id} />
          <label className="field">
            <span>플레이리스트에 음악 추가</span>
            <select className="input" name="track_id" required>
              <option value="">곡 선택</option>
              {data.tracks
                .filter((t) => !items.some((i) => i.track_id === t.id))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} —{" "}
                    {data.artists.find((a) => a.id === t.artist_id)?.name}
                  </option>
                ))}
            </select>
          </label>
          <Submit>
            <Plus size={15} />곡 추가
          </Submit>
        </ActionForm>
      )}
    </>
  );
}
