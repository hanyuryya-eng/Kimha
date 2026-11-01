import Link from "next/link";
import { catalog, session, demoMode } from "@/lib/data/repository";
import { ActionForm, Submit } from "@/components/action-form";
import { Input, Textarea } from "@/components/ui/input";
import { submitContribution } from "@/app/actions";
export const metadata = { title: "함께 만드는 음악 서재" };
export default async function Contribute({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; type?: string; title?: string }>;
}) {
  const p = await searchParams;
  const [data, ctx] = await Promise.all([catalog(), session()]);
  return (
    <div className="form-page">
      <header className="page-header">
        <p className="eyebrow">KNOWLEDGE GROWS TOGETHER</p>
        <h1>당신이 아는 음악의 이야기</h1>
        <p>작은 지식이 모여 더 깊이 듣는 음악 서재가 됩니다.</p>
      </header>
      <div className="notice">
        <strong>출처가 있는 독자적인 글을 제안해 주세요.</strong>
        <br />
        가사 전문·번역·발음의 무단 복제는 승인하거나 보상하지 않습니다. 사실
        정보는 운영자 검토 후 공식 해설에 반영됩니다. 정보 수정 제안은 원본을
        덮어쓰지 않고 승인된 정정 해설로 이력을 남깁니다.
      </div>
      {!ctx.user && (
        <p className="notice">
          {demoMode() ? (
            "DB 연결 후 제안을 제출할 수 있습니다."
          ) : (
            <Link href="/login?next=/contribute">
              로그인 후 제안할 수 있습니다 →
            </Link>
          )}
        </p>
      )}
      <ActionForm action={submitContribution} className="panel">
        <label className="field">
          <span>관련 음악</span>
          <select
            name="track_id"
            className="input"
            defaultValue={p.track || ""}
          >
            <option value="">새 음악 등록 요청 / 곡 미지정</option>
            {data.tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>제안 유형</span>
          <select
            name="kind"
            className="input"
            defaultValue={p.type || "story"}
          >
            {[
              ["metadata", "곡 정보 수정"],
              ["artist", "아티스트 정보"],
              ["background", "곡 제작 배경"],
              ["story", "출처 있는 음악 이야기"],
              ["interpretation", "독자적 해석"],
              ["error", "정보 오류 신고"],
              ["track_request", "새 음악 등록 요청"],
            ].map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>제목</span>
          <Input name="title" defaultValue={p.title} required maxLength={150} />
        </label>
        <label className="field">
          <span>이야기 또는 정정 내용</span>
          <Textarea
            name="body"
            required
            maxLength={5000}
            placeholder="출처를 바탕으로 당신만의 문장으로 설명해 주세요."
          />
        </label>
        <label className="field">
          <span>출처 URL (HTTPS)</span>
          <Input type="url" name="source_url" placeholder="https://" />
          <small>
            승인에는 확인 가능한 출처와 등록된 곡이 필요합니다. 등록 요청은
            운영자가 검증 후 별도로 등록합니다.
          </small>
        </label>
        <Submit disabled={!ctx.user}>검토 요청 보내기</Submit>
      </ActionForm>
    </div>
  );
}
