"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabase } from "@/lib/supabase/server";
import {
  noteSchema,
  playlistSchema,
  contributionSchema,
  localPath,
  safeHttps,
  safeMusicUrl,
} from "@/lib/domain";
export type Result = { error?: string; success?: string };
const id = z.uuid();
const field = (form: FormData, name: string) => String(form.get(name) ?? "");
async function member() {
  const db = await supabase();
  if (!db)
    throw new Error(
      "읽기 전용 데모입니다. Supabase 연결 후 저장할 수 있습니다.",
    );
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  return { db, user };
}
async function admin() {
  const ctx = await member();
  const { data } = await ctx.db
    .from("profiles")
    .select("role")
    .eq("id", ctx.user.id)
    .single();
  if (data?.role !== "admin") throw new Error("관리자 권한이 필요합니다.");
  return ctx;
}
function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
function errorResult(e: unknown): Result {
  if (e instanceof z.ZodError)
    return { error: e.issues[0]?.message ?? "입력값을 확인해 주세요." };
  return {
    error: e instanceof Error ? e.message : "요청을 처리하지 못했습니다.",
  };
}
export async function authenticate(_: Result, form: FormData): Promise<Result> {
  let destination = "/library";
  try {
    const db = await supabase();
    if (!db)
      throw new Error(
        "Supabase 연결이 필요합니다. 데모에서는 로그인할 수 없습니다.",
      );
    const email = z.email().parse(field(form, "email")),
      password = z
        .string()
        .min(8, "비밀번호는 8자 이상이어야 합니다.")
        .max(128)
        .parse(field(form, "password"));
    const signup = field(form, "mode") === "signup";
    if (signup) {
      const nickname = z
        .string()
        .trim()
        .min(1)
        .max(40)
        .parse(field(form, "nickname"));
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { nickname },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
        },
      });
      check(error);
      if (!data.session)
        return {
          success: "가입 확인 메일을 보냈습니다. 메일의 링크를 열어 주세요.",
        };
    } else {
      const { error } = await db.auth.signInWithPassword({ email, password });
      check(error);
    }
    destination = localPath(form.get("next"));
  } catch (e) {
    return errorResult(e);
  }
  revalidatePath("/", "layout");
  redirect(destination);
}
export async function signOut() {
  const db = await supabase();
  if (db) await db.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
export async function saveNote(_: Result, form: FormData): Promise<Result> {
  let target = "";
  try {
    const { db, user } = await member();
    const values = noteSchema.parse(Object.fromEntries(form));
    const noteId = field(form, "id");
    if (noteId) {
      id.parse(noteId);
      const { data, error } = await db
        .from("user_notes")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", noteId)
        .eq("user_id", user.id)
        .select("id")
        .single();
      check(error);
      target = data!.id;
    } else {
      const { data, error } = await db
        .from("user_notes")
        .insert({ ...values, user_id: user.id })
        .select("id")
        .single();
      check(error);
      target = data!.id;
    }
  } catch (e) {
    return errorResult(e);
  }
  revalidatePath("/", "layout");
  redirect(`/notes/${target}`);
}
export async function deleteNote(_: Result, form: FormData): Promise<Result> {
  try {
    const { db, user } = await member();
    const { error } = await db
      .from("user_notes")
      .delete()
      .eq("id", id.parse(field(form, "id")))
      .eq("user_id", user.id);
    check(error);
  } catch (e) {
    return errorResult(e);
  }
  revalidatePath("/", "layout");
  redirect("/library?tab=notes");
}
export async function toggleSave(_: Result, form: FormData): Promise<Result> {
  try {
    const { db, user } = await member();
    const track_id = id.parse(field(form, "track_id"));
    const { data, error: readError } = await db
      .from("user_saved_tracks")
      .select("track_id")
      .eq("user_id", user.id)
      .eq("track_id", track_id)
      .maybeSingle();
    check(readError);
    const { error } = data
      ? await db
          .from("user_saved_tracks")
          .delete()
          .eq("user_id", user.id)
          .eq("track_id", track_id)
      : await db
          .from("user_saved_tracks")
          .insert({ user_id: user.id, track_id });
    check(error);
    revalidatePath("/", "layout");
    return {
      success: data ? "서재에서 삭제했습니다." : "내 서재에 저장했습니다.",
    };
  } catch (e) {
    return errorResult(e);
  }
}
export async function savePlaylist(_: Result, form: FormData): Promise<Result> {
  let target = "";
  try {
    const { db, user } = await member();
    const values = playlistSchema.parse(Object.fromEntries(form));
    const playlistId = field(form, "id");
    const result = playlistId
      ? await db
          .from("playlists")
          .update(values)
          .eq("id", id.parse(playlistId))
          .eq("user_id", user.id)
          .select("id")
          .single()
      : await db
          .from("playlists")
          .insert({ ...values, user_id: user.id })
          .select("id")
          .single();
    check(result.error);
    target = result.data!.id;
  } catch (e) {
    return errorResult(e);
  }
  revalidatePath("/", "layout");
  redirect(`/playlists/${target}`);
}
export async function playlistMutation(
  _: Result,
  form: FormData,
): Promise<Result> {
  let deleted = false;
  try {
    const { db, user } = await member();
    const playlistId = id.parse(field(form, "playlist_id"));
    const { data, error: ownerError } = await db
      .from("playlists")
      .select("id")
      .eq("id", playlistId)
      .eq("user_id", user.id)
      .single();
    check(ownerError);
    if (!data) throw new Error("플레이리스트 권한이 없습니다.");
    const op = field(form, "op");
    if (op === "delete") {
      check((await db.from("playlists").delete().eq("id", playlistId)).error);
      deleted = true;
    } else if (op === "reorder") {
      const ids = z
        .array(z.uuid())
        .parse(JSON.parse(field(form, "ordered_ids")));
      check(
        (
          await db.rpc("reorder_playlist", {
            target: playlistId,
            ordered_ids: ids,
          })
        ).error,
      );
    } else {
      const track_id = id.parse(field(form, "track_id"));
      if (op === "remove")
        check(
          (
            await db
              .from("playlist_tracks")
              .delete()
              .eq("playlist_id", playlistId)
              .eq("track_id", track_id)
          ).error,
        );
      else if (op === "add") {
        const { data: items, error } = await db
          .from("playlist_tracks")
          .select("position")
          .eq("playlist_id", playlistId)
          .order("position", { ascending: false })
          .limit(1);
        check(error);
        check(
          (
            await db.from("playlist_tracks").insert({
              playlist_id: playlistId,
              track_id,
              position: (items?.[0]?.position ?? -1) + 1,
            })
          ).error,
        );
      } else throw new Error("잘못된 요청입니다.");
    }
    revalidatePath("/", "layout");
  } catch (e) {
    return errorResult(e);
  }
  if (deleted) redirect("/library?tab=playlists");
  return { success: "플레이리스트를 변경했습니다." };
}
export async function submitContribution(
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    const { db, user } = await member();
    const v = contributionSchema.parse(Object.fromEntries(form));
    check(
      (
        await db.from("contributions").insert({
          ...v,
          track_id: v.track_id || null,
          source_url: v.source_url || null,
          user_id: user.id,
        })
      ).error,
    );
    revalidatePath("/", "layout");
    return { success: "검토 대기 중입니다. 승인 후 공식 해설에 반영됩니다." };
  } catch (e) {
    return errorResult(e);
  }
}
export async function socialAction(_: Result, form: FormData): Promise<Result> {
  try {
    const { db, user } = await member();
    const op = field(form, "op"),
      target = id.parse(field(form, "target"));
    const kind = field(form, "kind");
    let table = "",
      row: Record<string, string> = {};
    if (op === "follow") {
      table = "follows";
      row = { follower_id: user.id, following_id: target };
    } else if (op === "reaction") {
      table = "post_reactions";
      row = {
        user_id: user.id,
        note_id: target,
        kind: z.enum(["empathy", "helpful"]).parse(kind),
      };
    } else if (op === "artist") {
      table = "user_saved_artists";
      row = { user_id: user.id, artist_id: target };
    } else if (op === "story") {
      table = "user_saved_stories";
      row = { user_id: user.id, story_id: target };
    } else if (op === "concert") {
      table = "user_saved_concerts";
      row = { user_id: user.id, concert_id: target };
    } else throw new Error("잘못된 요청");
    let query = db.from(table).select("*");
    for (const [k, v] of Object.entries(row)) query = query.eq(k, v);
    const { data, error } = await query.maybeSingle();
    check(error);
    if (data) {
      let del = db.from(table).delete();
      for (const [k, v] of Object.entries(row)) del = del.eq(k, v);
      check((await del).error);
    } else check((await db.from(table).insert(row)).error);
    revalidatePath("/", "layout");
    return { success: data ? "취소했습니다." : "저장했습니다." };
  } catch (e) {
    return errorResult(e);
  }
}
export async function saveProgress(_: Result, form: FormData): Promise<Result> {
  try {
    const { db, user } = await member();
    const row = {
      user_id: user.id,
      concert_id: id.parse(field(form, "concert_id")),
      track_id: id.parse(field(form, "track_id")),
      state: z
        .enum(["new", "familiar", "singalong"])
        .parse(field(form, "state")),
    };
    check((await db.from("user_concert_progress").upsert(row)).error);
    revalidatePath("/live", "layout");
    return { success: "디깅 상태를 저장했습니다." };
  } catch (e) {
    return errorResult(e);
  }
}
export async function reportContent(
  _: Result,
  form: FormData,
): Promise<Result> {
  try {
    const { db, user } = await member();
    const reason = z
      .string()
      .trim()
      .min(1)
      .max(2000)
      .parse(field(form, "reason"));
    const note = field(form, "note_id"),
      track = field(form, "track_id");
    if (!note && !track) throw new Error("신고 대상을 선택하세요.");
    check(
      (
        await db.from("content_reports").insert({
          user_id: user.id,
          reason,
          note_id: note ? id.parse(note) : null,
          track_id: track ? id.parse(track) : null,
        })
      ).error,
    );
    return { success: "신고를 접수했습니다." };
  } catch (e) {
    return errorResult(e);
  }
}
export async function saveProfile(_: Result, form: FormData): Promise<Result> {
  try {
    const { db, user } = await member();
    const values = {
      nickname: z.string().trim().min(1).max(40).parse(field(form, "nickname")),
      username: z
        .string()
        .regex(/^[a-z0-9_]{3,40}$/)
        .parse(field(form, "username")),
      bio: z.string().max(500).parse(field(form, "bio")),
      favorite_artists: field(form, "favorite_artists")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 20),
      genres: field(form, "genres")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 10),
    };
    check((await db.from("profiles").update(values).eq("id", user.id)).error);
    revalidatePath("/", "layout");
    return { success: "프로필을 저장했습니다." };
  } catch (e) {
    return errorResult(e);
  }
}
export async function adminAction(_: Result, form: FormData): Promise<Result> {
  try {
    const { db } = await admin();
    const op = field(form, "op");
    if (op === "review")
      check(
        (
          await db.rpc("review_contribution", {
            target: id.parse(field(form, "id")),
            decision: z
              .enum(["approved", "rejected"])
              .parse(field(form, "decision")),
            feedback: field(form, "feedback"),
          })
        ).error,
      );
    else if (op === "points")
      check(
        (
          await db.rpc("adjust_points", {
            target_user: id.parse(field(form, "user_id")),
            delta: z.coerce
              .number()
              .int()
              .min(-1000)
              .max(1000)
              .parse(field(form, "amount")),
            explanation: z
              .string()
              .min(1)
              .max(500)
              .parse(field(form, "reason")),
          })
        ).error,
      );
    else if (op === "rule")
      check(
        (
          await db
            .from("point_rules")
            .update({
              points: z.coerce
                .number()
                .int()
                .min(0)
                .max(1000)
                .parse(field(form, "points")),
            })
            .eq("kind", field(form, "kind"))
        ).error,
      );
    else if (op === "moderate") {
      const table = z
          .enum(["tracks", "music_stories", "user_notes"])
          .parse(field(form, "table")),
        target = id.parse(field(form, "id"));
      const operation = z
        .enum(["hide", "delete"])
        .parse(field(form, "operation"));
      check(
        (
          await db.rpc("moderate_content", {
            target_table: table,
            target_id: target,
            operation,
          })
        ).error,
      );
    } else if (op === "report")
      check(
        (
          await db
            .from("content_reports")
            .update({ status: "resolved" })
            .eq("id", id.parse(field(form, "id")))
        ).error,
      );
    else if (op === "artist") {
      const values = {
        name: z.string().trim().min(1).max(120).parse(field(form, "name")),
        aliases: field(form, "aliases").split(",").filter(Boolean),
        bio: z.string().max(3000).parse(field(form, "bio")),
        is_demo: false,
      };
      const target = field(form, "id");
      check(
        (target
          ? await db.from("artists").update(values).eq("id", id.parse(target))
          : await db.from("artists").insert(values)
        ).error,
      );
    } else if (op === "track") {
      const source = safeHttps(field(form, "source_url"));
      if (!source) throw new Error("검증 가능한 HTTPS 출처가 필요합니다.");
      const values = {
        title: z.string().trim().min(1).max(150).parse(field(form, "title")),
        artist_id: id.parse(field(form, "artist_id")),
        version: z.string().trim().min(1).max(80).parse(field(form, "version")),
        genre: z.string().max(80).parse(field(form, "genre")),
        description: z.string().max(5000).parse(field(form, "description")),
        released_year: z.coerce
          .number()
          .int()
          .min(1900)
          .max(2200)
          .parse(field(form, "released_year")),
        source_url: source,
        aliases: field(form, "aliases").split(",").filter(Boolean),
        is_demo: false,
      };
      const target = field(form, "id");
      check(
        (target
          ? await db.from("tracks").update(values).eq("id", id.parse(target))
          : await db.from("tracks").insert(values)
        ).error,
      );
    } else if (op === "link") {
      const service = z
          .enum(["spotify", "apple", "youtube", "bandcamp", "melon"])
          .parse(field(form, "service")),
        url = safeMusicUrl(service, field(form, "url"));
      if (!url)
        throw new Error("해당 음악 서비스의 HTTPS 곡 링크를 확인하세요.");
      check(
        (
          await db
            .from("external_music_links")
            .upsert(
              { track_id: id.parse(field(form, "track_id")), service, url },
              { onConflict: "track_id,service" },
            )
        ).error,
      );
    } else if (op === "story") {
      const source = safeHttps(field(form, "source_url"));
      if (!source) throw new Error("출처 URL이 필요합니다.");
      check(
        (
          await db.from("music_stories").insert({
            track_id: id.parse(field(form, "track_id")),
            title: z.string().min(1).max(150).parse(field(form, "title")),
            body: z.string().min(1).max(5000).parse(field(form, "body")),
            source_url: source,
          })
        ).error,
      );
    } else if (op === "concert") {
      check(
        (
          await db.from("concerts").insert({
            title: z.string().min(1).max(150).parse(field(form, "title")),
            venue: z.string().min(1).max(200).parse(field(form, "venue")),
            starts_at: z.iso
              .datetime({ offset: true })
              .parse(field(form, "starts_at")),
            description: z.string().max(3000).parse(field(form, "description")),
          })
        ).error,
      );
    } else if (op === "lineup")
      check(
        (
          await db.from("concert_artists").upsert({
            concert_id: id.parse(field(form, "concert_id")),
            artist_id: id.parse(field(form, "artist_id")),
          })
        ).error,
      );
    else if (op === "concert_track")
      check(
        (
          await db.from("concert_tracks").upsert({
            concert_id: id.parse(field(form, "concert_id")),
            track_id: id.parse(field(form, "track_id")),
            list_type: z
              .enum(["confirmed", "fan_pick", "expected"])
              .parse(field(form, "list_type")),
          })
        ).error,
      );
    else throw new Error("지원하지 않는 작업입니다.");
    revalidatePath("/", "layout");
    return { success: "변경 사항을 반영했습니다." };
  } catch (e) {
    return errorResult(e);
  }
}
