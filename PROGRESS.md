## 2026-07-20 20:30 (집) — 프로젝트 v1.0 완성
- 브랜치: main
- 완료:
  - **전체 파이프라인 완성**: 트렌드 분석 → 이미지 생성 → 캡션 생성 → 업로드 → 성과 수집
  - Vercel Blob Store 연결 (instagram-auto-upload, Public, ICN1)
  - Gemini Imagen 4 이미지 생성 + Vercel Blob 업로드
  - Instagram Graph API 연동 (graph.instagram.com/v25.0)
  - Instagram 토큰 자동 갱신 (cron 실행마다 60일 연장)
  - AI 캡션 생성 (Gemini 2.5 Flash) + 5개 언어 지원 (ko, en, ko+en, ja, ja+ko)
  - 혼합 언어 캡션/해시태그 검증 + 최대 5회 재시도
  - 업로드 5회 재시도 (Instagram API 안정성)
  - 전체 자동 생성 버튼 (원클릭 전 과정)
  - Pipeline auto 모드 = UI 자동생성과 동일 (Gemini 트렌드+프롬프트+캡션)
  - 설정: 자동모드 ON/OFF, 업로드 시간, 게시글 언어 선택
  - AI 추천 섹션 Gemini 연동 (하드코딩 제거)
  - 성과 데이터 자동 수집 (cron + 수동 버튼)
  - Pipeline/collect-insights API 인증 (CRON_SECRET)
  - 설정 연결 상태 자동 감지
  - mediaUrl(permalink) 저장
  - 게시물 생성 후 "새 게시물 만들기" 리셋 버튼
  - Google Sheets 게시기록 3건 정상 기록
- 현재 상태: **v1.0 완성. 수동/자동 모두 정상 동작.**
- cron: 매일 KST 19:00 (UTC 10:00) — 토큰 갱신 → 성과 수집 → AI 콘텐츠 생성 → 업로드
- 다음 할 일 (선택):
  - 대시보드 실제 데이터 연동
  - 작업 내역 이미지 미리보기
  - 모바일 반응형 개선
- 관련 커밋: 5462cd1 ~ 27a096a (총 9개 커밋)
- 푸시 여부: origin/main 에 푸시 완료

## 2026-07-20 16:30 (집)
- 브랜치: main
- 완료:
  - 전체 자동 생성 기능 구현 (원클릭: 트렌드→이미지→캡션→업로드)
  - AI 캡션 생성 + 5개 언어 지원
  - Pipeline auto 모드 전면 개편
- 관련 커밋: 5462cd1 ~ 9145017
- 푸시 여부: origin/main 에 푸시 완료

## 2026-07-20 15:00 (집)
- 브랜치: main
- 완료:
  - Vercel Blob Store 연결, Imagen 4 업그레이드
  - Instagram API 수정, 토큰 자동 갱신
  - 첫 번째 게시물 업로드 성공
- 관련 커밋: 5462cd1
- 푸시 여부: origin/main 에 푸시 완료
