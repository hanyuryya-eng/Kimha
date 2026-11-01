import { Disc3 } from "lucide-react";
export default function Loading() {
  return (
    <div className="loading" role="status">
      <Disc3 className="spin" />
      서재를 열고 있어요…
    </div>
  );
}
