import { Empty } from "@/components/music";
export default function Offline() {
  return (
    <Empty
      title="잠시 연결이 끊겼어요"
      body="개인 기록을 보호하기 위해 페이지를 기기에 캐시하지 않습니다. 인터넷 연결 후 다시 열어 주세요."
      href="/"
      label="다시 연결하기"
    />
  );
}
