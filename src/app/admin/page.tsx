import { notFound } from "next/navigation";
import {
  session,
  catalog,
  contributions,
  ledger,
  profiles,
  notes,
} from "@/lib/data/repository";
import { ActionForm, Hidden, Submit } from "@/components/action-form";
import { Input, Textarea } from "@/components/ui/input";
import { adminAction } from "@/app/actions";
import { safeHttps } from "@/lib/domain";
function Field({
  name,
  label,
  area = false,
  required = true,
  value = "",
  type = "text",
}: {
  name: string;
  label: string;
  area?: boolean;
  required?: boolean;
  value?: string;
  type?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {area ? (
        <Textarea
          name={name}
          required={required}
          defaultValue={value}
          maxLength={5000}
        />
      ) : (
        <Input
          name={name}
          required={required}
          defaultValue={value}
          type={type}
        />
      )}
    </label>
  );
}
export default async function Admin() {
  const ctx = await session();
  if (!ctx.user || ctx.profile?.role !== "admin" || !ctx.db) notFound();
  const [data, proposals, points, people, posts, reports, rules] =
    await Promise.all([
      catalog(),
      contributions(),
      ledger(),
      profiles(),
      notes(),
      ctx.db.from("content_reports").select("*"),
      ctx.db.from("point_rules").select("*"),
    ]);
  const artists = (
    <label className="field">
      <span>아티스트</span>
      <select className="input" name="artist_id">
        {data.artists.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </label>
  );
  const tracks = (
    <label className="field">
      <span>곡</span>
      <select className="input" name="track_id">
        {data.tracks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
    </label>
  );
  const concerts = (
    <label className="field">
      <span>공연</span>
      <select className="input" name="concert_id">
        {data.concerts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">JI–EUM EDITOR’S ROOM</p>
        <h1>함께 가꾸는 음악 서재</h1>
        <p>
          서버 사용자와 DB 관리자 권한을 확인했습니다. 출처와 이용권을 검토한
          정보만 등록하세요.
        </p>
      </header>
      <div className="admin-grid">
        <section className="panel">
          <h2>기여 검토</h2>
          {proposals
            .filter((c) => c.status === "pending")
            .map((c) => (
              <article className="admin-item" key={c.id}>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
                {safeHttps(c.source_url) && (
                  <a
                    href={safeHttps(c.source_url)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link"
                  >
                    출처 확인 ↗
                  </a>
                )}
                <p className="tiny">
                  {c.kind} · {people.find((p) => p.id === c.user_id)?.nickname}
                </p>
                <ActionForm action={adminAction} className="stack">
                  <Hidden name="op" value="review" />
                  <Hidden name="id" value={c.id} />
                  <label className="field">
                    <span>검토 의견</span>
                    <Input name="feedback" maxLength={1000} />
                  </label>
                  <label className="field">
                    <span>결정</span>
                    <select className="input" name="decision">
                      <option value="approved">
                        승인 · 공식 해설 반영 + 설정된 포인트
                      </option>
                      <option value="rejected">거절</option>
                    </select>
                  </label>
                  <Submit>검토 완료</Submit>
                </ActionForm>
              </article>
            ))}
          {!proposals.some((c) => c.status === "pending") && (
            <p className="prose">검토 대기 중인 제안이 없습니다.</p>
          )}
        </section>
        <section className="panel">
          <h2>신고된 콘텐츠</h2>
          {reports.data?.map((r) => (
            <div className="admin-item" key={r.id}>
              <p>{r.reason}</p>
              <p className="tiny">{r.status}</p>
              {r.note_id && (
                <a className="text-link" href={`/notes/${r.note_id}`}>
                  기록 보기 →
                </a>
              )}
              {r.track_id && (
                <a className="text-link" href={`/tracks/${r.track_id}`}>
                  곡 보기 →
                </a>
              )}
              <ActionForm action={adminAction}>
                <Hidden name="op" value="report" />
                <Hidden name="id" value={r.id} />
                <Submit variant="outline">처리 완료로 표시</Submit>
              </ActionForm>
            </div>
          ))}
        </section>
        <details className="panel">
          <summary>아티스트 등록·수정</summary>
          <ActionForm action={adminAction}>
            <Hidden name="op" value="artist" />
            <label className="field">
              <span>편집 대상 (신규는 빈 값)</span>
              <select name="id" className="input">
                <option value="">새 아티스트</option>
                {data.artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <Field name="name" label="아티스트명" />
            <Field name="aliases" label="별칭 (쉼표 구분)" required={false} />
            <Field name="bio" label="소개" area required={false} />
            <Submit>아티스트 저장</Submit>
          </ActionForm>
        </details>
        <details className="panel">
          <summary>곡 등록·수정</summary>
          <ActionForm action={adminAction}>
            <Hidden name="op" value="track" />
            <label className="field">
              <span>편집 대상</span>
              <select name="id" className="input">
                <option value="">새 곡</option>
                {data.tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            {artists}
            <Field name="title" label="곡명" />
            <Field
              name="version"
              label="버전 (라이브·커버·리마스터 구분)"
              value="original"
            />
            <Field
              name="aliases"
              label="한/영 별칭 (쉼표 구분)"
              required={false}
            />
            <Field
              name="released_year"
              label="발매 연도"
              type="number"
              value="2026"
            />
            <Field name="genre" label="장르" />
            <Field name="description" label="곡 소개" area />
            <Field
              name="source_url"
              label="검증 가능한 메타데이터 출처"
              type="url"
            />
            <Submit>곡 저장</Submit>
          </ActionForm>
        </details>
        <details className="panel">
          <summary>음악 이야기 등록</summary>
          <ActionForm action={adminAction}>
            <Hidden name="op" value="story" />
            {tracks}
            <Field name="title" label="제목" />
            <Field name="body" label="독자적으로 작성한 해설" area />
            <Field name="source_url" label="출처 (HTTPS)" type="url" />
            <Submit>공식 이야기 등록</Submit>
          </ActionForm>
        </details>
        <details className="panel">
          <summary>외부 음악 링크 등록</summary>
          <ActionForm action={adminAction}>
            <Hidden name="op" value="link" />
            {tracks}
            <label className="field">
              <span>음악 서비스</span>
              <select name="service" className="input">
                {["spotify", "apple", "youtube", "bandcamp", "melon"].map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
            </label>
            <Field
              name="url"
              label="확인된 곡 URL (검색 URL 아님)"
              type="url"
            />
            <Submit>링크 저장</Submit>
          </ActionForm>
        </details>
        <details className="panel">
          <summary>공연 등록·출연진 관리</summary>
          <ActionForm action={adminAction}>
            <Hidden name="op" value="concert" />
            <Field name="title" label="공연명" />
            <Field name="venue" label="장소" />
            <Field
              name="starts_at"
              label="시작 시각 (예: 2027-05-22T15:00:00+09:00)"
            />
            <Field name="description" label="안내" area />
            <Submit>공연 등록</Submit>
          </ActionForm>
          <hr style={{ margin: "25px 0", borderColor: "var(--border)" }} />
          <ActionForm action={adminAction}>
            <Hidden name="op" value="lineup" />
            {concerts}
            {artists}
            <Submit variant="outline">출연진 추가</Submit>
          </ActionForm>
          <hr style={{ margin: "25px 0", borderColor: "var(--border)" }} />
          <ActionForm action={adminAction}>
            <Hidden name="op" value="concert_track" />
            {concerts}
            {tracks}
            <label className="field">
              <span>곡 목록의 성격</span>
              <select name="list_type" className="input">
                <option value="fan_pick">팬 추천</option>
                <option value="expected">예상 곡</option>
                <option value="confirmed">출처로 확인된 확정 곡</option>
              </select>
            </label>
            <Submit variant="outline">공연 디깅 곡 추가</Submit>
          </ActionForm>
        </details>
        <details className="panel">
          <summary>포인트 정책·내역·조정</summary>
          {rules.data?.map((r) => (
            <ActionForm
              key={r.kind}
              action={adminAction}
              className="inline-form"
            >
              <Hidden name="op" value="rule" />
              <Hidden name="kind" value={r.kind} />
              <label className="tiny">
                {r.kind}
                <Input
                  name="points"
                  type="number"
                  min={0}
                  max={1000}
                  defaultValue={r.points}
                />
              </label>
              <Submit variant="outline">정책 저장</Submit>
            </ActionForm>
          ))}
          <h3 style={{ margin: "25px 0 15px" }}>수동 조정</h3>
          <ActionForm action={adminAction}>
            <Hidden name="op" value="points" />
            <label className="field">
              <span>사용자</span>
              <select name="user_id" className="input">
                {people.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.nickname}
                  </option>
                ))}
              </select>
            </label>
            <Field
              name="amount"
              label="조정 포인트 (-1000~1000)"
              type="number"
            />
            <Field name="reason" label="사유" />
            <Submit>포인트 조정</Submit>
          </ActionForm>
          {points.map((p) => (
            <p key={p.id} className="prose">
              {people.find((u) => u.id === p.user_id)?.nickname} · {p.amount} P
              · {p.reason}
            </p>
          ))}
        </details>
        <section className="panel" style={{ gridColumn: "1 / -1" }}>
          <h2>콘텐츠 비공개·삭제</h2>
          {[
            ...data.tracks.map((t) => ({
              id: t.id,
              title: t.title,
              table: "tracks",
            })),
            ...data.stories.map((s) => ({
              id: s.id,
              title: s.title,
              table: "music_stories",
            })),
            ...posts.map((n) => ({
              id: n.id,
              title: n.body.slice(0, 55),
              table: "user_notes",
            })),
          ].map((x) => (
            <div className="admin-item" key={x.id}>
              <p>
                {x.title} <span className="tag">{x.table}</span>
              </p>
              <ActionForm
                action={adminAction}
                className="inline-form"
                confirm="선택한 콘텐츠에 이 조치를 적용할까요?"
              >
                <Hidden name="op" value="moderate" />
                <Hidden name="id" value={x.id} />
                <Hidden name="table" value={x.table} />
                <select
                  name="operation"
                  className="input"
                  aria-label="관리 조치"
                >
                  <option value="hide">비공개</option>
                  <option value="delete">삭제 (복구 불가)</option>
                </select>
                <Submit variant="destructive">적용</Submit>
              </ActionForm>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
