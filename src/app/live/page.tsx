import Link from "next/link";
import { Radio, ArrowUpRight, MapPin, CalendarDays } from "lucide-react";
import { catalog } from "@/lib/data/repository";
import { dateLabel } from "@/lib/utils";
export const metadata = { title: "라이브 디깅" };
export default async function Live() {
  const { concerts } = await catalog();
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">LIVE DIGGING</p>
        <h1>
          무대에서 만날 음악,
          <br />
          조금 더 가까이.
        </h1>
        <p>공연 전 한 곡씩 알아가는 시간. 함께 부를 순간을 준비해 보세요.</p>
      </header>
      {concerts.map((c) => (
        <Link
          href={`/live/${c.id}`}
          className="concert-hero"
          key={c.id}
          style={{ display: "block" }}
        >
          <div className="actions">
            <Radio size={20} />
            <span className="eyebrow" style={{ margin: 0, color: "#e5bd83" }}>
              {c.is_demo ? "DEMO FESTIVAL" : "UPCOMING LIVE"}
            </span>
            <ArrowUpRight size={21} style={{ marginLeft: "auto" }} />
          </div>
          <h1>{c.title}</h1>
          <div className="concert-meta">
            <span>
              <CalendarDays size={14} />
              {dateLabel(c.starts_at)}
            </span>
            <span>
              <MapPin size={14} />
              {c.venue}
            </span>
          </div>
          <p>{c.description}</p>
        </Link>
      ))}
      <div className="notice">
        공연·출연진은 운영자가 등록합니다. 확정 셋리스트, 팬 추천, 예상 곡을
        구분하며 자동 수집이나 티켓 판매는 하지 않습니다.
      </div>
    </>
  );
}
