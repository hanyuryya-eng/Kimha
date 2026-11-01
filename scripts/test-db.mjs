import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { localStatus } from "./supabase.mjs";
const s = localStatus();
if (!["localhost", "127.0.0.1"].includes(new URL(s.API_URL).hostname))
  throw new Error("통합 테스트는 로컬 Supabase에서만 실행합니다.");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const root = createClient(s.API_URL, s.SERVICE_ROLE_KEY, options),
  anon = createClient(s.API_URL, s.ANON_KEY, options);
const users = [];
let alice, bob, admin, a, b, track, second, concert, note, playlist, proposal;
const must = (r) => {
  assert.equal(r.error, null, r.error?.message);
  return r.data;
};
before(async () => {
  for (let i = 0; i < 3; i++) {
    const email = `test-${randomUUID()}@example.com`,
      password = randomUUID() + "JiEum!";
    const u = must(
      await root.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      }),
    ).user;
    users.push(u.id);
    const client = createClient(s.API_URL, s.ANON_KEY, options);
    must(await client.auth.signInWithPassword({ email, password }));
    if (i === 0) {
      alice = client;
      a = u.id;
    } else if (i === 1) {
      bob = client;
      b = u.id;
    } else {
      admin = client;
      must(
        await root.from("profiles").update({ role: "admin" }).eq("id", u.id),
      );
    }
  }
  const tracks = must(await anon.from("tracks").select("*").order("id"));
  assert.equal(tracks.length, 12);
  track = tracks[0].id;
  second = tracks[1].id;
  concert = must(await anon.from("concerts").select("*"))[0].id;
});
after(async () => {
  for (const user of users) await root.auth.admin.deleteUser(user);
});
test("공개 카탈로그와 데모 데이터 12곡을 읽는다", async () => {
  const rows = must(await anon.from("artists").select("*"));
  assert.equal(rows.length, 6);
  assert.ok(rows.every((r) => r.is_demo));
});
test("곡 중복은 정규화해 막고 라이브 버전은 구분한다", async () => {
  const original = must(
    await root.from("tracks").select("*").eq("id", track).single(),
  );
  const duplicate = {
    id: randomUUID(),
    artist_id: original.artist_id,
    title: original.title.replaceAll(" ", ""),
    version: "original",
  };
  assert.equal(
    (await root.from("tracks").insert(duplicate)).error?.code,
    "23505",
  );
  const live = must(
    await root
      .from("tracks")
      .insert({ ...duplicate, id: randomUUID(), version: "live-test" })
      .select()
      .single(),
  );
  must(await root.from("tracks").delete().eq("id", live.id));
});
test("프로필 role은 사용자 metadata나 직접 UPDATE로 승격할 수 없다", async () => {
  assert.ok(
    (await alice.from("profiles").update({ role: "admin" }).eq("id", a)).error,
  );
  assert.equal(
    must(await alice.from("profiles").select("role").eq("id", a).single()).role,
    "member",
  );
});
test("비공개 기본 기록은 본인만 읽고 타인은 수정·삭제할 수 없다", async () => {
  note = must(
    await alice
      .from("user_notes")
      .insert({
        user_id: a,
        track_id: track,
        body: "private secret for test",
        kind: "impression",
      })
      .select()
      .single(),
  );
  assert.equal(note.visibility, "private");
  assert.equal(
    must(await bob.from("user_notes").select("*").eq("id", note.id)).length,
    0,
  );
  assert.equal(
    must(await anon.from("user_notes").select("*").eq("id", note.id)).length,
    0,
  );
  assert.equal(
    must(await admin.from("user_notes").select("*").eq("id", note.id)).length,
    0,
  );
  assert.equal(
    must(
      await bob
        .from("user_notes")
        .update({ body: "hijack" })
        .eq("id", note.id)
        .select(),
    ).length,
    0,
  );
  assert.equal(
    must(await bob.from("user_notes").delete().eq("id", note.id).select())
      .length,
    0,
  );
  assert.equal(
    must(
      await alice.from("user_notes").select("body").eq("id", note.id).single(),
    ).body,
    note.body,
  );
});
test("타인 명의의 기록을 만들 수 없다", async () =>
  assert.ok(
    (
      await bob.from("user_notes").insert({
        user_id: a,
        track_id: track,
        body: "forged",
        kind: "impression",
      })
    ).error,
  ));
test("비공개 글에는 타인이 반응할 수 없고 공개 후 두 종류의 반응을 남긴다", async () => {
  assert.ok(
    (
      await bob
        .from("post_reactions")
        .insert({ user_id: b, note_id: note.id, kind: "empathy" })
    ).error,
  );
  must(
    await alice
      .from("user_notes")
      .update({ visibility: "public" })
      .eq("id", note.id),
  );
  assert.equal(
    must(await anon.from("user_notes").select("*").eq("id", note.id)).length,
    1,
  );
  must(
    await bob.from("post_reactions").insert([
      { user_id: b, note_id: note.id, kind: "empathy" },
      { user_id: b, note_id: note.id, kind: "helpful" },
    ]),
  );
  assert.equal(
    must(await anon.from("post_reactions").select("*").eq("note_id", note.id))
      .length,
    2,
  );
});
test("관리자는 공개 글을 숨길 수 있지만 숨긴 비공개 글을 읽지는 못한다", async () => {
  must(
    await admin.rpc("moderate_content", {
      target_table: "user_notes",
      target_id: note.id,
      operation: "hide",
    }),
  );
  assert.equal(
    must(await anon.from("user_notes").select("*").eq("id", note.id)).length,
    0,
  );
  assert.equal(
    must(await admin.from("user_notes").select("*").eq("id", note.id)).length,
    0,
  );
  assert.equal(
    must(await alice.from("user_notes").select("*").eq("id", note.id)).length,
    1,
  );
  must(
    await alice
      .from("user_notes")
      .update({ visibility: "public" })
      .eq("id", note.id),
  );
});
test("곡 저장은 본인만 읽으며 중복 저장을 막는다", async () => {
  must(
    await alice
      .from("user_saved_tracks")
      .insert({ user_id: a, track_id: track }),
  );
  assert.ok(
    (
      await alice
        .from("user_saved_tracks")
        .insert({ user_id: a, track_id: track })
    ).error,
  );
  assert.equal(
    must(await bob.from("user_saved_tracks").select("*").eq("user_id", a))
      .length,
    0,
  );
});
test("플레이리스트 CRUD·비공개 하위 항목·순서 변경 권한을 확인한다", async () => {
  playlist = must(
    await alice
      .from("playlists")
      .insert({ user_id: a, name: "밤의 드라이브" })
      .select()
      .single(),
  );
  assert.equal(playlist.visibility, "private");
  must(
    await alice.from("playlist_tracks").insert([
      { playlist_id: playlist.id, track_id: track, position: 0 },
      { playlist_id: playlist.id, track_id: second, position: 1 },
    ]),
  );
  assert.equal(
    must(
      await bob
        .from("playlist_tracks")
        .select("*")
        .eq("playlist_id", playlist.id),
    ).length,
    0,
  );
  assert.ok(
    (
      await bob.rpc("reorder_playlist", {
        target: playlist.id,
        ordered_ids: [second, track],
      })
    ).error,
  );
  must(
    await alice.rpc("reorder_playlist", {
      target: playlist.id,
      ordered_ids: [second, track],
    }),
  );
  assert.equal(
    must(
      await alice
        .from("playlist_tracks")
        .select("*")
        .eq("playlist_id", playlist.id)
        .order("position"),
    )[0].track_id,
    second,
  );
  assert.ok(
    (
      await alice.rpc("reorder_playlist", {
        target: playlist.id,
        ordered_ids: [track, track],
      })
    ).error,
  );
  must(
    await alice
      .from("playlists")
      .update({ name: "수정한 목록", visibility: "public" })
      .eq("id", playlist.id),
  );
  assert.equal(
    must(
      await anon
        .from("playlist_tracks")
        .select("*")
        .eq("playlist_id", playlist.id),
    ).length,
    2,
  );
  must(
    await alice
      .from("playlist_tracks")
      .delete()
      .eq("playlist_id", playlist.id)
      .eq("track_id", second),
  );
});
test("팔로우와 언팔로우·자기 팔로우 금지를 검증한다", async () => {
  must(await alice.from("follows").insert({ follower_id: a, following_id: b }));
  assert.equal(
    must(await anon.from("follows").select("*").eq("follower_id", a)).length,
    1,
  );
  assert.ok(
    (await alice.from("follows").insert({ follower_id: a, following_id: a }))
      .error,
  );
  must(
    await alice
      .from("follows")
      .delete()
      .eq("follower_id", a)
      .eq("following_id", b),
  );
});
test("일반 사용자는 카탈로그와 포인트를 조작할 수 없다", async () => {
  assert.ok((await alice.from("artists").insert({ name: "forged" })).error);
  assert.ok(
    (
      await alice
        .from("point_ledger")
        .insert({ user_id: a, amount: 100, reason: "forged" })
    ).error,
  );
  assert.ok(
    (
      await alice.rpc("adjust_points", {
        target_user: a,
        delta: 100,
        explanation: "forged",
      })
    ).error,
  );
});
test("기여는 pending이며 일반 사용자는 승인할 수 없고 수정 이력이 남는다", async () => {
  proposal = must(
    await alice
      .from("contributions")
      .insert({
        user_id: a,
        track_id: track,
        kind: "story",
        title: "통합 테스트 제안",
        body: "독자적인 설명",
        source_url: "https://example.com/verified-source",
      })
      .select()
      .single(),
  );
  assert.equal(proposal.status, "pending");
  assert.ok(
    (
      await alice
        .from("contributions")
        .update({ status: "approved" })
        .eq("id", proposal.id)
    ).error,
  );
  assert.ok(
    (
      await alice.rpc("review_contribution", {
        target: proposal.id,
        decision: "approved",
      })
    ).error,
  );
  must(
    await alice
      .from("contributions")
      .update({ body: "수정한 설명" })
      .eq("id", proposal.id),
  );
  assert.equal(
    must(
      await alice
        .from("contribution_revisions")
        .select("*")
        .eq("contribution_id", proposal.id),
    ).length,
    2,
  );
  assert.equal(
    must(
      await bob
        .from("contribution_revisions")
        .select("*")
        .eq("contribution_id", proposal.id),
    ).length,
    0,
  );
});
test("관리자 승인과 포인트는 원자적이며 중복 지급하지 않는다", async () => {
  must(
    await admin.rpc("review_contribution", {
      target: proposal.id,
      decision: "approved",
      feedback: "출처 확인",
    }),
  );
  const stories = must(
    await anon.from("music_stories").select("*").eq("author_id", a),
  );
  assert.equal(stories.length, 1);
  assert.equal(stories[0].body, "수정한 설명");
  const ledger = must(
    await alice
      .from("point_ledger")
      .select("*")
      .eq("contribution_id", proposal.id),
  );
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].amount, 10);
  assert.ok(
    (
      await admin.rpc("review_contribution", {
        target: proposal.id,
        decision: "approved",
      })
    ).error,
  );
  assert.equal(
    must(
      await alice
        .from("point_ledger")
        .select("*")
        .eq("contribution_id", proposal.id),
    ).length,
    1,
  );
  await root.from("music_stories").delete().eq("id", stories[0].id);
});
test("관리자 포인트 조정은 별도 내역으로 남는다", async () => {
  must(
    await admin.rpc("adjust_points", {
      target_user: a,
      delta: -2,
      explanation: "정책 조정 테스트",
    }),
  );
  assert.equal(
    must(await alice.from("point_ledger").select("*").eq("user_id", a)).reduce(
      (s, p) => s + p.amount,
      0,
    ),
    8,
  );
  assert.equal(
    must(await bob.from("point_ledger").select("*").eq("user_id", a)).length,
    0,
  );
});
test("공연 준비 상태를 저장·갱신하며 타인에게 노출하지 않는다", async () => {
  must(
    await alice.from("user_concert_progress").upsert({
      user_id: a,
      concert_id: concert,
      track_id: track,
      state: "familiar",
    }),
  );
  must(
    await alice.from("user_concert_progress").upsert({
      user_id: a,
      concert_id: concert,
      track_id: track,
      state: "singalong",
    }),
  );
  assert.equal(
    must(
      await alice
        .from("user_concert_progress")
        .select("*")
        .eq("concert_id", concert),
    )[0].state,
    "singalong",
  );
  assert.equal(
    must(await bob.from("user_concert_progress").select("*").eq("user_id", a))
      .length,
    0,
  );
});
test("미확보 가사·번역을 DB에서도 저장하지 않는다", async () => {
  assert.ok(
    (
      await root.from("lyric_rights").insert({
        track_id: track,
        status: "unverified",
        lyrics: "not licensed test text",
      })
    ).error,
  );
  assert.ok(
    (
      await root.from("lyric_rights").insert({
        track_id: track,
        status: "verified",
        license_reference: "test",
        translation: "unauthorized test text",
      })
    ).error,
  );
});
test("신고는 본인·관리자만 읽고 처리한다", async () => {
  const report = must(
    await bob
      .from("content_reports")
      .insert({ user_id: b, note_id: note.id, reason: "통합 테스트 신고" })
      .select()
      .single(),
  );
  assert.equal(
    must(await alice.from("content_reports").select("*").eq("id", report.id))
      .length,
    0,
  );
  must(
    await admin
      .from("content_reports")
      .update({ status: "resolved" })
      .eq("id", report.id),
  );
  assert.equal(
    must(
      await bob
        .from("content_reports")
        .select("status")
        .eq("id", report.id)
        .single(),
    ).status,
    "resolved",
  );
});
test("기록·목록 삭제 후 관계 데이터가 남지 않는다", async () => {
  must(await alice.from("user_notes").delete().eq("id", note.id));
  assert.equal(
    must(await anon.from("post_reactions").select("*").eq("note_id", note.id))
      .length,
    0,
  );
  must(await alice.from("playlists").delete().eq("id", playlist.id));
  assert.equal(
    must(
      await alice
        .from("playlist_tracks")
        .select("*")
        .eq("playlist_id", playlist.id),
    ).length,
    0,
  );
});
