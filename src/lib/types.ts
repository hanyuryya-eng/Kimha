export interface Artist {
  id: string;
  name: string;
  aliases: string[];
  bio: string;
  is_demo: boolean;
}
export interface Track {
  id: string;
  artist_id: string;
  album_id: string | null;
  album_title?: string;
  artwork_url?: string | null;
  title: string;
  aliases: string[];
  version: string;
  released_year: number | null;
  genre: string;
  description: string;
  cover_index: number;
  source_url: string | null;
  is_demo: boolean;
  visibility: string;
}
export interface Profile {
  id: string;
  username: string;
  nickname: string;
  bio: string;
  genres: string[];
  favorite_artists?: string[];
  role: string;
}
export interface Note {
  id: string;
  user_id: string;
  track_id: string;
  body: string;
  kind: string;
  visibility: string;
  created_at: string;
  updated_at: string;
  is_demo?: boolean;
}
export interface Story {
  id: string;
  track_id: string;
  title: string;
  body: string;
  source_url: string | null;
  author_id: string | null;
  is_demo: boolean;
  visibility: string;
  created_at: string;
}
export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description: string;
  visibility: string;
  created_at: string;
}
export interface PlaylistTrack {
  playlist_id: string;
  track_id: string;
  position: number;
}
export interface Concert {
  id: string;
  title: string;
  venue: string;
  starts_at: string;
  description: string;
  is_demo: boolean;
}
export interface ConcertTrack {
  concert_id: string;
  track_id: string;
  list_type: string;
}
export interface MusicLink {
  track_id: string;
  service: string;
  url: string;
}
export interface Rights {
  track_id: string;
  status: string;
  license_reference: string | null;
  expires_at: string | null;
  provider_url: string | null;
  lyrics: string | null;
  translation: string | null;
  pronunciation: string | null;
  translation_allowed: boolean;
  pronunciation_allowed: boolean;
}
export interface Contribution {
  id: string;
  user_id: string;
  track_id: string | null;
  title: string;
  body: string;
  kind: string;
  source_url: string | null;
  status: string;
  review_note: string | null;
  created_at: string;
}
export interface Ledger {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  created_at: string;
}

export interface Album {
  id: string;
  title: string;
  artwork_url: string | null;
  artwork_source_url: string | null;
  artwork_license: string | null;
  artwork_status: string;
  artwork_expires_at: string | null;
}
