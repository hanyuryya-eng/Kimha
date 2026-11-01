import Link from "next/link";
import { PlaylistEditor } from "@/components/editor";
import { session, demoMode } from "@/lib/data/repository";
export const metadata = { title: "플레이리스트 만들기" };
export default async function NewPlaylist() {
  const { user } = await session();
  return (
    <div className="form-page">
      <header className="page-header">
        <p className="eyebrow">A COLLECTION OF MOMENTS</p>
        <h1>어떤 순간을 모아볼까요?</h1>
        <p>밤의 드라이브부터 비 오는 날까지, 음악을 묶어 간직하세요.</p>
      </header>
      {!user && (
        <div className="notice">
          {demoMode() ? (
            "DB 연결 전에는 저장되지 않는 읽기 전용 데모입니다."
          ) : (
            <Link href="/login?next=/playlists/new">로그인이 필요합니다 →</Link>
          )}
        </div>
      )}
      <PlaylistEditor disabled={!user} />
    </div>
  );
}
