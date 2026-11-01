import Link from "next/link";
import {
  ArrowUpRight,
  Disc3,
  Bookmark,
  ArrowRight,
  Lock,
  PenLine,
} from "lucide-react";
import type { Track, Artist, Note, Profile } from "@/lib/types";
import { dateLabel } from "@/lib/utils";
import { noteKinds } from "@/lib/domain";
export function Cover({
  track,
  className = "",
}: {
  track: Track;
  className?: string;
}) {
  return (
    <img
      className={`cover ${track.artwork_url ? "licensed-art" : ""} ${className}`}
      src={track.artwork_url || `/covers/${track.cover_index}.svg`}
      alt={`${track.title} · ${track.artwork_url ? "앨범 아트" : "자체 제작 플레이스홀더"}`}
      width={400}
      height={400}
    />
  );
}
export function TrackCard({
  track,
  artist,
}: {
  track: Track;
  artist?: Artist;
}) {
  return (
    <Link href={`/tracks/${track.id}`} className="track-card">
      <div className="art-wrap">
        <Cover track={track} />
        <span className="art-arrow">
          <ArrowUpRight size={22} />
        </span>
        {track.is_demo && <span className="art-demo">DEMO</span>}
      </div>
      <h3>{track.title}</h3>
      <p>{artist?.name}</p>
      <span className="tiny">
        {track.genre} · {track.released_year}
      </span>
    </Link>
  );
}
export function TrackRow({
  track,
  artist,
  index,
}: {
  track: Track;
  artist?: Artist;
  index?: number;
}) {
  return (
    <Link href={`/tracks/${track.id}`} className="track-row">
      {index !== undefined && (
        <span className="row-index">{String(index + 1).padStart(2, "0")}</span>
      )}
      <Cover track={track} />
      <span className="grow">
        <strong>{track.title}</strong>
        <span>
          {artist?.name} · {track.genre}
          {track.is_demo ? " · 데모" : ""}
        </span>
      </span>
      <ArrowUpRight size={18} className="muted" />
    </Link>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  href,
  label = "모두 보기",
}: {
  eyebrow: string;
  title: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="section-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-link">
          {label}
          <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function NoteCard({
  note,
  track,
  author,
}: {
  note: Note;
  track?: Track;
  author?: Profile;
}) {
  return (
    <article className="note-card">
      <div className="note-author">
        <Link href={author ? `/profiles/${author.username}` : "#"}>
          <span className="avatar" aria-hidden="true">
            {author?.nickname.slice(0, 1) || "음"}
          </span>
          {author?.nickname || "리스너"}
        </Link>
        <span className="tag">
          {noteKinds[note.kind as keyof typeof noteKinds]}
        </span>
      </div>
      <Link href={`/notes/${note.id}`} className="note-body">
        <p>{note.body}</p>
      </Link>
      {track && (
        <Link href={`/tracks/${track.id}`} className="note-track">
          <Cover track={track} />
          <span>
            <strong>{track.title}</strong>
            <span>
              {note.is_demo
                ? "데모 기록"
                : track.is_demo
                  ? "데모 음악에 남긴 기록"
                  : "음악 기록"}
            </span>
          </span>
          <Disc3 size={18} />
        </Link>
      )}
      <footer>
        <span>{dateLabel(note.created_at)}</span>
        {note.visibility === "private" ? (
          <span>
            <Lock size={12} />
            비공개
          </span>
        ) : (
          <span>
            <ArrowUpRight size={13} />
            기록 읽기
          </span>
        )}
      </footer>
    </article>
  );
}
export function Empty({
  title,
  body,
  href,
  label = "음악 둘러보기",
}: {
  title: string;
  body: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <Bookmark size={30} />
      <h2>{title}</h2>
      <p>{body}</p>
      {href && (
        <Link className="btn btn-outline" href={href}>
          {label}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function WriteLink({ trackId }: { trackId?: string }) {
  return (
    <Link
      className="btn btn-primary"
      href={`/write${trackId ? `?track=${trackId}` : ""}`}
    >
      <PenLine size={16} />이 음악 기록하기
    </Link>
  );
}
