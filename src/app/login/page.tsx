import Link from "next/link";
import { AudioLines } from "lucide-react";
import { ActionForm, Hidden, Submit } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { authenticate } from "@/app/actions";
import { demoMode } from "@/lib/data/repository";
import { localPath } from "@/lib/domain";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string }>;
}) {
  const p = await searchParams;
  const signup = p.mode === "signup",
    demo = demoMode();
  return (
    <div className="form-page narrow">
      <div className="page-header">
        <AudioLines
          size={35}
          style={{ color: "var(--accent)", marginBottom: 20 }}
        />
        <p className="eyebrow">WELCOME TO YOUR ARCHIVE</p>
        <h1>{signup ? "당신의 서재를 열어보세요" : "다시 만나 반가워요"}</h1>
        <p>좋아하는 음악과, 오래 간직할 이야기.</p>
      </div>
      {demo && (
        <div className="notice">
          <strong>읽기 전용 데모</strong>
          <br />
          아직 Supabase에 연결되지 않았습니다. 계정 생성·로그인은 DB 설정 후
          사용할 수 있습니다.
        </div>
      )}
      <ActionForm action={authenticate} className="panel">
        <Hidden name="mode" value={signup ? "signup" : "login"} />
        <Hidden name="next" value={localPath(p.next)} />
        {signup && (
          <label className="field">
            <span>닉네임</span>
            <Input
              name="nickname"
              required
              maxLength={40}
              autoComplete="nickname"
              placeholder="음악 속의 나를 소개해 주세요"
            />
          </label>
        )}
        <label className="field">
          <span>이메일</span>
          <Input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label className="field">
          <span>비밀번호</span>
          <Input
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete={signup ? "new-password" : "current-password"}
            placeholder="8자 이상 입력해 주세요"
          />
        </label>
        <Submit disabled={demo}>{signup ? "회원가입" : "로그인"}</Submit>
        {signup && (
          <p className="tiny" style={{ marginTop: 18 }}>
            가입 시 <Link href="/legal/terms">이용약관</Link>과{" "}
            <Link href="/legal/privacy">개인정보 처리방침</Link>을 확인해
            주세요. 현재 정책은 법적 검토 전 초안입니다.
          </p>
        )}
      </ActionForm>
      <p className="tiny" style={{ marginTop: 20, textAlign: "center" }}>
        {signup ? "이미 계정이 있나요?" : "지음이 처음인가요?"}{" "}
        <Link
          style={{ color: "var(--accent)" }}
          href={`/login?mode=${signup ? "login" : "signup"}&next=${encodeURIComponent(localPath(p.next))}`}
        >
          {signup ? "로그인" : "회원가입"}
        </Link>
      </p>
    </div>
  );
}
