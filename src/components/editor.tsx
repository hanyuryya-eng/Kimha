import type { Track, Artist, Note, Playlist } from "@/lib/types";
import { ActionForm, Hidden, Submit } from "./action-form";
import { Input, Textarea } from "./ui/input";
import { saveNote, savePlaylist } from "@/app/actions";
import { noteKinds } from "@/lib/domain";
export function PrivacyChoice({ value = "private" }: { value?: string }) {
  return (
    <fieldset className="field">
      <legend style={{ fontSize: 12, marginBottom: 9 }}>공개 범위</legend>
      <div className="visibility-options">
        <label>
          <input
            type="radio"
            name="visibility"
            value="private"
            defaultChecked={value !== "public"}
          />
          나만 보기 · 비공개
        </label>
        <label>
          <input
            type="radio"
            name="visibility"
            value="public"
            defaultChecked={value === "public"}
          />
          모두에게 공개
        </label>
      </div>
      <small>공개를 선택하면 곡 페이지와 프로필에 표시됩니다.</small>
    </fieldset>
  );
}
export function NoteEditor({
  tracks,
  artists,
  note,
  trackId,
  disabled,
}: {
  tracks: Track[];
  artists: Artist[];
  note?: Note;
  trackId?: string;
  disabled: boolean;
}) {
  return (
    <ActionForm action={saveNote} className="panel">
      {note && <Hidden name="id" value={note.id} />}
      <label className="field">
        <span>1. 어떤 음악인가요?</span>
        <select
          name="track_id"
          className="input"
          required
          defaultValue={note?.track_id || trackId || ""}
        >
          <option value="" disabled>
            기록할 곡을 선택해 주세요
          </option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} — {artists.find((a) => a.id === t.artist_id)?.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>2. 음악에 남기는 마음</span>
        <Textarea
          name="body"
          required
          maxLength={3000}
          defaultValue={note?.body}
          placeholder="이 노래를 들으면서 어떤 생각이 떠올랐나요?"
          rows={7}
        />
        <small>
          한 줄도 좋아요. 가사 전문 대신 당신만의 이야기를 들려주세요.
        </small>
      </label>
      <label className="field">
        <span>3. 기록 유형</span>
        <select
          name="kind"
          className="input"
          defaultValue={note?.kind || "impression"}
        >
          {Object.entries(noteKinds).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <PrivacyChoice value={note?.visibility} />
      <Submit disabled={disabled}>
        {note ? "기록 수정하기" : "기록 저장하기"}
      </Submit>
    </ActionForm>
  );
}
export function PlaylistEditor({
  playlist,
  disabled,
}: {
  playlist?: Playlist;
  disabled: boolean;
}) {
  return (
    <ActionForm action={savePlaylist} className="panel">
      {playlist && <Hidden name="id" value={playlist.id} />}
      <label className="field">
        <span>플레이리스트 이름</span>
        <Input
          name="name"
          required
          maxLength={80}
          defaultValue={playlist?.name}
          placeholder="예: 밤의 드라이브"
        />
      </label>
      <label className="field">
        <span>소개</span>
        <Textarea
          name="description"
          maxLength={500}
          defaultValue={playlist?.description}
          placeholder="어떤 순간에 꺼내 듣고 싶은가요?"
        />
      </label>
      <PrivacyChoice value={playlist?.visibility} />
      <Submit disabled={disabled}>
        {playlist ? "변경 사항 저장" : "플레이리스트 만들기"}
      </Submit>
    </ActionForm>
  );
}
