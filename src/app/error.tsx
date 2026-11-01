"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <h1 style={{ fontSize: 24 }}>잠시 음악 서재를 열지 못했어요</h1>
      <p>
        DB 연결과 마이그레이션 상태를 확인해 주세요. 연결 오류를 데모나 저장
        성공으로 처리하지 않습니다.
      </p>
      <button className="btn btn-primary" onClick={reset}>
        다시 시도
      </button>
    </div>
  );
}
