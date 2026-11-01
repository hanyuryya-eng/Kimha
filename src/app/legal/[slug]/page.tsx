import { notFound } from "next/navigation";
import { ActionForm, Submit } from "@/components/action-form";
import { Input, Textarea } from "@/components/ui/input";
import { reportContent } from "@/app/actions";
import { session } from "@/lib/data/repository";
const policies: Record<
  string,
  { title: string; sections: [string, string][] }
> = {
  privacy: {
    title: "개인정보 처리방침",
    sections: [
      [
        "수집 및 이용",
        "서비스는 이메일, 인증 정보, 공개 프로필과 사용자가 작성·저장한 음악 데이터를 계정 관리 및 기능 제공에 이용합니다. 비공개 기록은 작성자에게만 제공합니다.",
      ],
      [
        "보관 및 삭제",
        "계정 삭제 시 연결된 개인 데이터는 DB 외래키 정책에 따라 삭제됩니다. 운영상 보관 기간과 법정 보존 의무는 서비스 운영 주체의 법적 검토 후 확정해야 합니다.",
      ],
      [
        "처리 위탁 및 국외 이전",
        "인증·데이터 저장에 Supabase, 호스팅에 Vercel을 사용할 수 있습니다. 실제 공급자, 처리 지역, 이전 근거와 고지 문구는 배포 전에 확인해야 합니다.",
      ],
      [
        "정보주체 권리 및 문의",
        "열람·정정은 프로필 및 기록 편집에서 가능합니다. 계정 삭제·내보내기 요청과 담당자 연락처는 운영 개시 전 등록해야 합니다. 현재 이 데모에는 확정된 운영 연락처가 없습니다.",
      ],
    ],
  },
  terms: {
    title: "이용약관",
    sections: [
      [
        "서비스의 범위",
        "지음은 음악 정보와 개인 기록을 연결하는 아카이빙 서비스입니다. 음원 스트리밍, 티켓 판매, 현금성 포인트를 제공하지 않습니다.",
      ],
      [
        "작성자 권리와 책임",
        "본인이 작성하거나 적법한 권한을 가진 콘텐츠만 게시할 수 있습니다. 가사·번역·사진의 무단 복제, 권리 침해, 타인의 개인정보 노출은 금지합니다. 개인 의견과 검증된 사실을 구분해 주세요.",
      ],
      [
        "공개 설정과 콘텐츠 관리",
        "기록과 플레이리스트는 비공개가 기본입니다. 공개한 콘텐츠는 다른 사람이 공유할 수 있으므로 공개 전 내용을 확인해 주세요. 운영자는 신고 및 권리 침해 검토 후 콘텐츠를 숨기거나 삭제할 수 있습니다.",
      ],
      [
        "기여와 포인트",
        "승인된 지식 기여는 설정된 정책에 따라 포인트를 받을 수 있습니다. 포인트는 현금 가치가 없는 내부 인정 수단이며 중복 지급하지 않습니다.",
      ],
    ],
  },
  copyright: {
    title: "저작권 신고·삭제 요청",
    sections: [
      [
        "음악과 이미지 이용 원칙",
        "가사 전문·번역·발음은 이용권이 확인된 경우에만 제공됩니다. 음악은 외부의 확인된 곡 링크로 연결하며 직접 호스팅하지 않습니다. 데모 커버는 자체 제작 SVG로 실제 앨범 아트가 아닙니다.",
      ],
      [
        "권리 침해 신고 절차",
        "아래 양식에 대상 곡 또는 기록의 ID, 권리의 내용, 출처, 요청 사유를 남겨 주세요. 운영자는 신고를 확인하고 임시 비공개 또는 삭제를 검토할 수 있습니다. 신분증 등 민감 정보를 이 양식에 입력하지 마세요.",
      ],
      [
        "연락 경로",
        "현재는 개발용 초안이며 운영 주체의 연락처와 비회원 신고 채널이 아직 확정되지 않았습니다. 배포 전에 반드시 연락처와 처리 기한을 확정해야 합니다. 로그인한 사용자는 앱 내 신고를 접수할 수 있습니다.",
      ],
    ],
  },
};
export default async function Legal({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = policies[slug];
  if (!policy) notFound();
  const { user } = await session();
  return (
    <article className="policy-page">
      <header className="page-header">
        <p className="eyebrow">JI–EUM POLICIES</p>
        <h1>{policy.title}</h1>
      </header>
      <div className="notice">
        <strong>법적 검토 전 초안 · 2026년 10월 31일</strong>
        <br />
        운영 주체, 보관 기간, 담당자, 처리 지역과 관련 법령을 확인한 후 확정해야
        합니다.
      </div>
      {policy.sections.map(([title, body]) => (
        <section key={title}>
          <h2>{title}</h2>
          <p>{body}</p>
        </section>
      ))}
      {slug === "copyright" && (
        <section className="section-block" style={{ marginTop: 30 }}>
          <h2>콘텐츠 신고 접수</h2>
          <ActionForm action={reportContent} className="panel">
            <label className="field">
              <span>기록 ID (대상이 기록일 때)</span>
              <Input name="note_id" placeholder="페이지 주소의 UUID" />
            </label>
            <label className="field">
              <span>곡 ID (대상이 곡일 때)</span>
              <Input name="track_id" placeholder="페이지 주소의 UUID" />
            </label>
            <label className="field">
              <span>권리 및 삭제 요청 사유</span>
              <Textarea name="reason" required maxLength={2000} />
            </label>
            <Submit disabled={!user}>신고 접수</Submit>
            {!user && (
              <p className="tiny">
                현재 앱 내 접수에는 로그인과 DB 연결이 필요합니다.
              </p>
            )}
          </ActionForm>
        </section>
      )}
    </article>
  );
}
