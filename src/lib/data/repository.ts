import "server-only";
import { cache } from "react";
import { supabase, isConfigured } from "@/lib/supabase/server";
import demo from "./demo.json";
import type {
  Track,
  Album,
  Artist,
  Profile,
  Note,
  Story,
  Playlist,
  PlaylistTrack,
  Concert,
  ConcertTrack,
  MusicLink,
  Rights,
  Contribution,
  Ledger,
} from "@/lib/types";
import { normalizeSearch, safeHttps } from "@/lib/domain";
export const session = cache(async () => {
  const db = await supabase();
  if (!db) return { user: null, profile: null, db: null };
  const {
    data: { user },
  } = await db.auth.getUser();
  let profile: Profile | null = null;
  if (user) {
    const r = await db.from("profiles").select("*").eq("id", user.id).single();
    if (r.error)
      throw new Error(
        "프로필을 불러오지 못했습니다. DB 마이그레이션을 확인하세요.",
      );
    profile = r.data as Profile;
  }
  return { user, profile, db };
});
async function read<T>(table: string, fallback: T[]): Promise<T[]> {
  const db = await supabase();
  if (!db) return fallback;
  let query = db.from(table).select("*").limit(1000);
  if (
    [
      "user_notes",
      "music_stories",
      "contributions",
      "point_ledger",
      "playlists",
    ].includes(table)
  )
    query = query.order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) {
    console.error("DB read failed:", table, error.code);
    throw new Error(
      "데이터를 불러오지 못했습니다. 연결과 DB 마이그레이션을 확인하세요.",
    );
  }
  return data as T[];
}
export const catalog = cache(async () => {
  const [tracks, artists, stories, concerts, albums] = await Promise.all([
    read<Track>("tracks", demo.tracks),
    read<Artist>("artists", demo.artists),
    read<Story>("music_stories", demo.stories),
    read<Concert>("concerts", demo.concerts),
    read<Album>("albums", []),
  ]);
  const enriched = tracks.map((t) => {
    const album = albums.find((a) => a.id === t.album_id);
    return {
      ...t,
      album_title: album?.title,
      artwork_url:
        album &&
        album.artwork_status === "verified" &&
        album.artwork_license &&
        (!album.artwork_expires_at ||
          new Date(album.artwork_expires_at).getTime() > Date.now())
          ? safeHttps(album.artwork_url)
          : null,
    };
  });
  return { tracks: enriched, artists, stories, concerts };
});
export const notes = cache(() => read<Note>("user_notes", demo.notes));
export const profiles = cache(() => read<Profile>("profiles", demo.profiles));
export const playlists = cache(() =>
  read<Playlist>("playlists", demo.playlists),
);
export const playlistTracks = cache(() =>
  read<PlaylistTrack>(
    "playlist_tracks",
    demo.tracks.slice(0, 4).map((t, i) => ({
      playlist_id: demo.playlists[0].id,
      track_id: t.id,
      position: i,
    })),
  ),
);
export const concertTracks = cache(() =>
  read<ConcertTrack>(
    "concert_tracks",
    demo.tracks.slice(0, 6).map((t) => ({
      concert_id: demo.concerts[0].id,
      track_id: t.id,
      list_type: "fan_pick",
    })),
  ),
);
export const musicLinks = cache(() =>
  read<MusicLink>("external_music_links", []),
);
export const rights = cache(() => read<Rights>("lyric_rights", []));
export const contributions = cache(() =>
  read<Contribution>("contributions", []),
);
export const ledger = cache(() => read<Ledger>("point_ledger", []));
export async function personalRows<T>(table: string): Promise<T[]> {
  const { user, db } = await session();
  if (!user || !db) return [];
  const { data, error } = await db
    .from(table)
    .select("*")
    .eq("user_id", user.id);
  if (error) throw new Error("내 데이터를 불러오지 못했습니다.");
  return data as T[];
}
export async function findMusic(query: string, tab = "tracks") {
  const data = await catalog(),
    q = normalizeSearch(query);
  const artist = (id: string) => data.artists.find((a) => a.id === id);
  return {
    tracks: data.tracks.filter((t) =>
      [
        t.title,
        ...t.aliases,
        artist(t.artist_id)?.name ?? "",
        ...(artist(t.artist_id)?.aliases ?? []),
      ].some((v) => normalizeSearch(v).includes(q)),
    ),
    artists: data.artists.filter((a) =>
      [a.name, ...a.aliases].some((v) => normalizeSearch(v).includes(q)),
    ),
    stories: data.stories.filter((s) =>
      normalizeSearch(s.title + s.body).includes(q),
    ),
    tab,
  };
}
export const demoMode = () => !isConfigured();

export const concertArtists = cache(() =>
  read<{ concert_id: string; artist_id: string }>(
    "concert_artists",
    demo.artists.map((a) => ({
      concert_id: demo.concerts[0].id,
      artist_id: a.id,
    })),
  ),
);
