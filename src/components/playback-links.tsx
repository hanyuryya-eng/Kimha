"use client";
import { useEffect, useState, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import type { MusicLink } from "@/lib/types";
import { safeMusicUrl } from "@/lib/domain";
export function PlaybackLinks({ links }: { links: MusicLink[] }) {
  const valid = useMemo(
    () => links.filter((l) => safeMusicUrl(l.service, l.url)),
    [links],
  );
  const [service, setService] = useState(valid[0]?.service || "");
  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = localStorage.getItem("ji-eum-music-service");
      if (stored && valid.some((l) => l.service === stored)) setService(stored);
    }, 0);
    return () => clearTimeout(timer);
  }, [valid]);
  const selected = valid.find((l) => l.service === service) || valid[0];
  if (!selected) return null;
  return (
    <div className="stack">
      <label className="field">
        <span>선호하는 음악 서비스</span>
        <select
          name="music_service"
          className="input"
          value={service}
          onChange={(event) => {
            setService(event.target.value);
            localStorage.setItem("ji-eum-music-service", event.target.value);
          }}
        >
          {valid.map((l) => (
            <option key={l.service} value={l.service}>
              {l.service}
            </option>
          ))}
        </select>
      </label>
      <a
        className="btn btn-outline"
        href={safeMusicUrl(selected.service, selected.url)!}
        target="_blank"
        rel="noopener noreferrer"
      >
        {selected.service}에서 듣기 <ExternalLink size={14} />
      </a>
    </div>
  );
}
