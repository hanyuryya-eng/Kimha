# 지음 개발 가이드

- 각 클라우드 작업은 이미 격리되어 있다. 기존 /workspace/Kimha 체크아웃을 사용하며 명시적 요청 없이 worktree를 만들지 않는다.
- Next.js App Router + TypeScript + Tailwind v4. npm ci 후 npm run dev.
- UI: src/components, 규칙/검증: src/lib/domain.ts, 데이터 읽기: src/lib/data, 변경: src/app/actions.ts.
- Supabase 사용자 쿠키로 DB 요청을 보내 RLS를 적용한다. 웹 앱에 service_role을 사용하지 않는다.
- 인증 미설정 시 데모는 읽기 전용. 변경 요청은 서버에서도 차단한다.
- 원문 가사/번역/발음은 검증된 권리만 표시한다. demo 데이터는 가상이고 커버는 자체 SVG다.
- 비공개 콘텐츠에 OG/공유/서비스워커 캐시를 적용하지 않는다. React 기본 escaping을 유지한다.
- DB 변경은 새 migration, npm run test:db로 RLS/트랜잭션 검증. destructive db reset은 로컬에서만 사용한다.
- 검증: npm run test, npm run typecheck, npm run lint, npm run build, npm run test:e2e.
- 실제 Supabase 흐름과 데모 흐름을 구분해서 결과를 보고한다. 외부 배포/계정 발급은 검증 전 성공으로 주장하지 않는다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
