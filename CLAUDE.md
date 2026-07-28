# CLAUDE.md — Instagram Auto Upload

> 위치: 프로젝트 루트. **이 프로젝트에만** 적용되며 git으로 커밋해 PC 간 동기화한다.
> 공통 규칙(코드 원칙·세션 연속성·문서화·보안)은 `~/.claude/CLAUDE.md`에 있다.
> 여기엔 이 프로젝트 고유 정보만 둔다. 전역 규칙과 중복·충돌하는 내용을 넣지 않는다.

---

## 1. 프로젝트 개요
- 프로젝트명: Instagram Auto Upload
- 한 줄 설명: 인스타그램 AI 사진 트렌드 분석 → Nano Banana 이미지 생성 → 게시글/태그 자동 작성 → 자동 업로드 → 성과 분석 피드백 루프
- 기술 스택: Next.js 16 (Vercel), Google Sheets API, Gemini API (Imagen 4 + Veo 3.1 + Flash 2.5), Instagram Graph API v25.0, Vercel Blob
- 핵심 디렉터리:
  - `src/app/` — 페이지 및 API 라우트 (App Router)
  - `src/app/api/` — 백엔드 API (generate, pipeline, instagram, sheets, analytics, cron)
  - `src/components/` — UI 컴포넌트 (`ui/` = shadcn, `layout/` = Sidebar 등)
  - `src/lib/` — 핵심 로직 (gemini, instagram, google-sheets, credential-manager, services)
  - `src/types/` — TypeScript 타입 정의
  - `src/messages/` — i18n 메시지 (ko, en)
- 빌드: `npm run build` / 테스트: `npm test` / 실행: `npm run dev`
- 브랜치 전략: main 직접 커밋 (1인 프로젝트)
- 기본 원격/브랜치: origin / main

## 2. 제품 요구사항 (PRD 요약)
- 핵심 기능:
  1. **트렌드 분석** — 웹 검색으로 인기 AI 이미지 스타일·해시태그·engagement 패턴 조사
  2. **이미지 생성** — Gemini Imagen 4로 Nano Banana 캐릭터 이미지 생성, Vercel Blob에 저장
  3. **캡션/태그 작성** — Gemini Flash 2.5로 트렌드 기반 게시글·해시태그 자동 생성 (캡션 길이 프리셋: 짧게/보통/길게)
  4. **자동 업로드** — Instagram Graph API container → publish 2단계로 게시
  5. **성과 분석** — Instagram Insights 수집 → Google Sheets 기록 → 스타일별 engagement 분석 → 다음 콘텐츠 방향 제안
  6. **동기화** — Instagram 미디어 ↔ Sheets 양방향 동기화 (이미지 갱신 + 삭제 감지 + import)
  7. **파이프라인** — 위 1~4를 일괄 실행하는 자동화 파이프라인 (수동/자동 모드)
  8. **다국어** — 한국어(기본) / 영어 지원
- 범위 제외:
  - 릴스/스토리 자동 업로드 (피드 이미지만)
  - 댓글 자동 응답
  - 팔로워 자동 관리

## 3. 기술 요구사항 (TRD)
- 확정 기술 스택 / 버전 제약:
  - Next.js 16 + Turbopack, Vercel 배포
  - Google Sheets API — DB 대체 (게시물/성과/설정/인증정보 저장)
  - Gemini API — Flash 2.5 (텍스트), Imagen 4 (이미지), Veo 3.1 (동영상)
  - Instagram Graph API v25.0
  - Vercel Blob — 이미지 저장 (무료 플랜, 용량 제한)
- DB 제약 조건:
  - Google Sheets `append` API는 빈 행이 있으면 컬럼 어긋남 → `update(마지막 행+1)`로 삽입
  - 성과 시트 범위: `A:H` (impressions 컬럼 H열)
  - `batchUpdatePosts`, `batchUpsertPerformance`로 rate limit 방지
- 보안 규칙:
  - API 키는 `credential-manager.ts`로 관리 (GEMINI_KEY ~ GEMINI_KEY_5)
  - 다중 키 + 자동 폴백 (키당 3회 재시도)
  - 인증정보는 Google Sheets 설정 시트에 암호화 저장

## 4. UI 컴포넌트 가이드
- 컴포넌트 구조 규칙:
  - `src/components/ui/` — shadcn/ui 컴포넌트 (button, card, tabs, table, input, select, badge, sheet, toggle 등)
  - `src/components/layout/` — 레이아웃 컴포넌트 (Sidebar)
  - 페이지 컴포넌트는 `src/app/*/page.tsx`에 직접 작성
- 스타일 규칙:
  - Tailwind CSS 유틸리티 클래스 사용
  - shadcn/ui 기본 테마 기반
  - 컴팩트 UI 선호 — Card 통합 + hover tooltip으로 공간 절약
  - 캡션 글자수: 슬라이더 + 프리셋 버튼 (짧게/보통/길게)
  - `force-dynamic` export로 GET 캐싱 방지

## 5. 하네스: Instagram Auto Upload

**목표:** 인스타그램 AI 사진 트렌드 분석 → 이미지 생성 → 게시글 작성 → 업로드 → 성과 분석을 자동화하는 완전한 파이프라인

**트리거:** 인스타, 게시물, 업로드, 이미지 생성, 트렌드, 성과 분석 관련 작업 요청 시 `insta-orchestrator` 스킬을 사용하라. 단순 질문은 직접 응답 가능.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-07-20 | 초기 구성 | 전체 | 하네스 신규 구축 |
| 2026-07-24 | v4.0 대규모 업데이트 | 전체 | 비용추적·중복방지·동기화·직접업로드·다중키·주제프리셋·UI컴팩트화 |

## 6. 프로젝트 고유 규칙
- **Instagram API 주의사항:**
  - CDN URL (`cdninstagram.com`)은 임시 — 며칠 후 만료됨. Blob 복사 대신 동기화로 갱신
  - `impressions` metric은 v25.0에서 deprecated → **`views`** 사용
  - `plays`도 미지원 → views가 올바른 대체
  - insights는 한 번에 10~25개씩 처리 (rate limit 방지)
  - container/publish 2단계 분리 호출 필수
- **Gemini API 비용 관련:**
  - 다중 키 폴백 시스템 — 한 키가 quota 초과되면 자동으로 다음 키 사용
  - Imagen 4 호출은 비용이 높으므로 불필요한 재생성 방지 (중복 방지 로직 필수)
  - Veo 3.1 영상 생성은 Vercel Blob 무료 용량 제한으로 Blob 복사 금지
- **실 API 호출 주의:**
  - Instagram 업로드, Gemini 이미지 생성 등 비용/부작용이 있는 API 호출 코드는 실행 전 사용자 확인
  - 파이프라인 전체 실행(`/api/pipeline`)은 여러 유료 API를 연쇄 호출하므로 특히 주의
