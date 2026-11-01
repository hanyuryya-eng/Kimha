import { notFound } from "next/navigation";
import { catalog } from "@/lib/data/repository";
import { TrackCard } from "@/components/music";
export default async function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { artists, tracks } = await catalog();
  const a = artists.find((a) => a.id === id);
  if (!a) notFound();
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">ARTIST ARCHIVE {a.is_demo ? "· DEMO" : ""}</p>
        <h1>{a.name}</h1>
        <p>{a.aliases.join(" · ")}</p>
        <p>{a.bio}</p>
      </header>
      <div className="track-grid">
        {tracks
          .filter((t) => t.artist_id === id)
          .map((t) => (
            <TrackCard key={t.id} track={t} artist={a} />
          ))}
      </div>
    </>
  );
}
