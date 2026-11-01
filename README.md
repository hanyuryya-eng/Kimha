# 지음 JI–EUM

**음악을 좀 더 가까이.** 음악 디깅·개인 아카이빙·공개 기록 SNS의 실행 가능한 MVP입니다.

Next.js 16.4.3(App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui 구성의 Button/Input, Lucide, Supabase PostgreSQL/Auth/RLS를 사용합니다. 앱에서 음원을 호스팅하거나 가사를 수집하지 않습니다.

## 빠른 실행: 읽기 전용 데모

Node.js 22.13 이상(이 환경은 24.19), npm, Git이 필요합니다.

```sh
cd /workspace/Kimha
npm ci
npm run dev
```

Supabase 환경변수가 없으면 **읽기 전용 데모**로 표시합니다. 12개의 가상 곡, 6명의 가상 아티스트, 독자적 데모 해설, 공개 기록, 플레이리스트, 가상 공연이 포함됩니다. 모든 커버는 자체 제작 SVG이며 실제 앨범 이미지가 아닙니다. 데모는 로그인·DB 저장을 흉내 내지 않습니다. 곡에 확인된 외부 링크가 없으면 재생 버튼도 만들지 않습니다.

## 실제 저장을 사용하는 로컬 Supabase

Docker Engine과 curl/tar가 필요합니다. 이 환경에서는 PostgreSQL 15를 사용합니다. 로컬 전용 API/DB 포트는 54321/54322입니다. Supabase CLI 2.75.0을 공식 GitHub 배포본과 SHA256 체크섬으로 검증해 `supabase/.temp/cli`에 설치하는 helper를 포함합니다. 계정 로그인·액세스 토큰 없이 로컬 Auth/PostgreSQL/PostgREST를 실행합니다.

```sh
npm run db:start
npm run db:env
npm run dev
```

- `db:start`는 PostgreSQL/Auth/REST/게이트웨이/개발용 메일함만 시작합니다. 최초 실행은 큰 이미지 다운로드로 수 분 소요될 수 있습니다.
- 공식 Docker Hub 이미지를 사용합니다. 기존 프록시·TLS 인증서 설정을 유지합니다. Docker `vfs`에서는 원본의 누적 레이어 복사가 디스크를 초과하므로, `scripts/prepare-docker.mjs`가 공식 crane 배포본의 SHA256과 고정한 이미지 digest를 검증하고 원본 파일시스템·실행 메타데이터를 한 레이어의 로컬 파생 이미지로 보존합니다. 저장 드라이버는 바꾸지 않으며 출처 digest는 이미지 label과 ignored provenance 파일에 남깁니다. 일반적인 overlay 드라이버에는 적용하지 않습니다. 이 경로에는 Python 3도 필요합니다. 원본에서 삭제된 Nix 하드링크는 같은 고정 이미지의 SHA256 검증된 원본 레이어에서 정확한 파일 내용을 복원합니다.
- 마이그레이션과 `supabase/seed.sql`은 최초 DB 생성 시 적용됩니다.
- `db:env`는 실행 중인 로컬 Supabase의 **실제 공개 키**와 URL로 `.env.local`을 생성합니다. 기존 파일은 `--replace`를 명시하기 전까지 덮어쓰지 않습니다. 서비스 역할 키는 웹 앱 환경 파일에 저장하지 않습니다.
- 로컬 이메일 가입은 `supabase/config.toml`의 개발용 설정으로 확인 절차가 꺼져 있습니다. 실제 배포에는 이메일 확인과 운영용 SMTP를 설정하세요.
- 프론트엔드를 먼저 실행 중이었다면 `.env.local` 생성 후 서버를 재시작하세요. 프로덕션 서버는 환경변수를 넣은 상태에서 다시 빌드해야 합니다.
- 서비스를 재시작하려면 `npm run db:start`, 중지하려면 `npm run db:stop`을 사용합니다. 실행 프로세스는 새 클라우드 작업에 자동 복원되지 않습니다.
- **`npm run db:reset`은 로컬 DB를 초기화하고 데이터를 삭제합니다.** 개발 데이터가 필요한 경우 백업 후 명시적으로 실행하세요. 원격 DB에는 사용하지 않습니다.

실제 연결 모드의 초기 데이터는 카탈로그뿐입니다. 공개 사용자 기록은 직접 가입·작성하면 생깁니다. 데모의 가상 사용자·개인 기록은 실제 사용자 인증 데이터와 혼합하지 않습니다.

## Supabase 프로젝트 생성 및 Vercel 배포

외부 프로젝트 생성에는 사용자의 Supabase 계정 인증이 필요합니다. 현재 외부 프로젝트를 발급하거나 배포하지는 않았습니다.

1. Supabase 대시보드에서 새 프로젝트를 생성하고 프로젝트가 준비될 때까지 기다립니다. DB 비밀번호는 안전한 저장소에서 관리하세요.
2. SQL Editor에서 `supabase/migrations/`의 SQL 파일을 파일명 순서대로 모두 적용합니다. 또는 공식 CLI로 프로젝트를 연결한 후 `db push`를 사용합니다. 로컬용 helper에서 원격 reset을 실행하지 마세요.
3. 가상 카탈로그를 원할 때에만 `supabase/seed.sql`을 적용합니다. 실제 서비스의 곡·외부 링크·출처는 관리자에서 별도로 검증해 등록하세요.
4. 프로젝트 API 설정에서 URL과 publishable key(또는 legacy anon key)를 `.env.local`이나 Vercel 환경변수에 넣습니다. `.env.example`을 참고하세요. **service_role / secret key는 프론트엔드·웹 서버에 넣지 않습니다.**
5. `NEXT_PUBLIC_SITE_URL`을 실제 배포 HTTPS 주소로 설정합니다. Supabase Auth URL 설정에서 Site URL과 `<배포 주소>/auth/callback`을 허용하고 이메일 제공자/SMTP를 설정합니다.
6. Vercel에서 이 저장소를 가져옵니다. Framework: Next.js, install: `npm ci`, build: `npm run build`. 동일한 공개 환경변수를 등록하고 배포합니다.
7. 실제 이메일 확인 링크·공개 URL·Web Share 동작을 배포 환경에서 재검증합니다. Web Share/클립보드는 HTTPS 또는 로컬 보안 컨텍스트에서 지원됩니다.

현재 클라우드 네트워크는 도메인 제한이 있습니다. 원격 Supabase를 사용할 경우 해당 `<project-ref>.supabase.co`를 환경 설정의 허용 도메인에 **추가**해야 합니다. 여기서 테스트한 로컬 DB에는 외부 서비스 자격증명이 필요하지 않습니다.

## 관리자 설정

일반 가입자는 항상 `member`입니다. 메타데이터의 role이나 클라이언트 요청으로 관리자 권한을 얻을 수 없습니다. 신뢰할 수 있는 DB 콘솔에서 대상 사용자를 확인한 다음 한 번만 승격합니다.

```sql
-- 실제 관리자의 auth.users ID로 치환. 웹 앱에서 실행할 수 없습니다.
update public.profiles set role = 'admin' where id = '<관리자 사용자 UUID>';
```

이후 로그인하면 `/admin`에서 아티스트/곡 등록·수정, 검증된 외부 곡 URL, 출처 있는 해설, 공연·출연진·공연 곡 등록, 기여 검토, 신고 처리, 콘텐츠 숨김·삭제, 포인트 정책·조정을 사용할 수 있습니다. 일반 사용자와 비회원의 `/admin`은 404이며 서버 액션과 DB 함수도 권한을 재검증합니다. 관리자에게도 다른 사용자의 비공개 기록을 읽는 SELECT 권한을 부여하지 않습니다.

## 구현된 사용자 흐름

- 제목·영문 별칭·아티스트 검색: NFKC/대소문자/공백·기호 정규화 및 부분 일치. 음악 해설·공개 기록 검색. 결과 없음 → 등록 요청.
- 곡 상세: 소개·권리 확인된 가사 영역·승인된 공식 해설·개인 공개 기록을 구분. 승인된 서비스 호스트의 외부 HTTPS 링크만 제공.
- 회원가입/로그인/로그아웃: Supabase Auth, 쿠키 세션, proxy 세션 갱신, 이메일 확인 callback.
- 서재: 곡 저장/삭제, 아티스트·해설·공연 저장, 내 기록과 플레이리스트, 기여·포인트 내역.
- 기록 CRUD: 한 줄 허용, 비공개 기본값, 명시적 공개, 공개 고유 URL/OG, Web Share 및 링크 복사.
- 플레이리스트 CRUD: 이름·설명·공개 범위, 곡 추가·삭제·위아래 순서 변경. DB 함수가 소유권과 전체 곡 목록을 검증.
- 공개 프로필: 닉네임·소개·관심 장르·공개할 좋아하는 아티스트·공개 글·공개 목록·팔로워/팔로잉·승인 이력. 비공개 콘텐츠 제외.
- 팔로우/언팔로우, ‘공감해요’/‘도움이 됐어요’ 별도 반응.
- 기여: pending/approved/rejected, 수정 이력, 승인 후 공식 **해설** 반영, 원자적·중복 방지 포인트 지급. 메타데이터 정정은 승인된 정정 해설로 기록하며 카탈로그 필드 변경은 관리자가 검토 후 수행.
- 공연: 운영자 등록, 확정/팬 추천/예상 곡 구분, 처음/익숙/함께 부름 상태 저장.
- 다크/라이트·반응형 레이아웃, 모바일 하단 내비게이션, 키보드 포커스, PWA manifest/자체 아이콘/정적 커버 서비스워커 캐시.

## 보안 및 권리

모든 public 테이블에 RLS가 활성화됩니다. 공개 카탈로그와 소유자 데이터의 정책을 분리했습니다. `profiles.role`은 일반 사용자의 UPDATE 허용 열에서 제외합니다. 관리 함수는 고정 search_path를 사용하고 승인과 포인트 지급을 같은 트랜잭션에서 처리합니다. 가입 트리거는 사용자가 보내는 역할 값을 무시합니다.

React escaping과 Zod 서버 검증을 사용하며 사용자 HTML을 렌더링하지 않습니다. HTTPS URL과 음악 서비스 도메인을 검사하고 외부 링크에 `noopener noreferrer`를 적용합니다. 서비스워커는 앱 자체 SVG만 캐시하고 **페이지/API/개인 기록/인증 응답을 캐시하지 않습니다**. 비공개 공유 메타데이터에는 내용이 들어가지 않습니다.

가사·번역·발음 권리 상태와 라이선스 참조, 만료·번역 허용·발음 허용 필드가 있습니다. 미확보 콘텐츠 저장은 DB 제약으로 차단합니다. UI에서도 유효한 권리를 재검증합니다. seed에는 가사·번역·음원·실제 아티스트 사진이 없습니다.

법적 페이지는 **검토 전 초안**입니다. 실제 공개 운영 전 운영자 연락처, 비회원 권리 신고 채널, 개인정보 보관·위탁·이전 정책과 가사/사진 이용권을 확정해야 합니다. 정책 페이지에 없는 연락처를 만들어 넣지 않았습니다.

## 구조

```text
src/app/                 페이지, 인증 callback, 서버 액션
src/components/          공통 음악 UI, 폼, 반응형 메뉴, shadcn 기반 UI
src/lib/domain.ts        입력 검증, 검색 정규화, URL/권리 판단
src/lib/data/            Supabase 읽기 계층과 명시적 데모 데이터
src/lib/supabase/        서버 쿠키 클라이언트
supabase/migrations/     테이블·RLS·관리 트랜잭션·중복 방지
supabase/seed.sql        가상의 음악/공연/독자적 해설
scripts/                검증된 로컬 CLI·환경 연결·DB 통합 검증
tests/                  단위·Playwright 사용자 흐름
```

현재 MVP 읽기 계층은 테이블당 최대 1,000행의 작은 카탈로그를 대상으로 합니다. 대규모 공개 운영 시 서버 검색·페이지네이션을 확장해야 합니다. 팔로잉 피드·직접 음원 재생·AI 추천·가사 번역·결제는 구현 범위가 아닙니다.

## 검증

```sh
npm run typecheck
npm run lint
npm test
npm run build
# DB: 실행 중인 로컬 Supabase에 테스트 계정을 생성하고 종료 시 제거
npm run test:db
# 읽기 전용 데모 모드의 빌드에서
npm run test:e2e
# 실제 DB 연결 환경변수로 빌드한 뒤
E2E_CONNECTED=1 npm run test:e2e
```

Playwright는 `npx playwright install chromium`으로 브라우저를 설치합니다. 이 클라우드에는 시스템 Chromium이 있어 `PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`로 실행할 수 있습니다. 다운로드 허용 도메인이 없을 때 TLS 검증을 끄거나 프록시를 우회하지 않습니다.

DB 테스트는 로컬 URL만 허용하고 Auth로 만든 실제 계정 3개를 사용해 비공개 격리, 소유자 위조, 관리자 승격, 공유 전환, 순서 변경, 승인/중복 지급, 포인트 격리, 신고, 가사 제약, 관계 삭제를 검증합니다. 서비스 역할 키는 로컬 테스트 프로세스에서만 읽고 출력하거나 파일에 저장하지 않습니다. E2E는 실제 가입→검색→저장→목록→기록→공개→관리 승인→공연 준비 상태를 검증합니다. 실제 음악 서비스의 스트리밍/권리나 외부 클라우드 배포를 테스트 성공으로 주장하지 않습니다.

현재 검증 결과: 타입·린트·프로덕션 빌드 통과, 단위 18/18, 실제 DB 통합 18/18, 데모 Playwright 7/7, 실제 Supabase A–H 흐름 1/1 통과. 모드별 해당하지 않는 테스트는 구분해 제외했습니다. 자세한 진단과 남은 외부 설정은 PLAN.md를 참고하세요.
