import { Empty } from "@/components/music";
export default function NotFound() {
  return (
    <Empty
      title="이 페이지를 찾을 수 없어요"
      body="삭제되었거나, 공개되지 않은 이야기일 수 있습니다."
      href="/"
      label="디깅으로 돌아가기"
    />
  );
}
