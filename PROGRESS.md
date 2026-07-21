## 2026-07-21 23:00 (집) — v2.5: 프롬프트 커스텀 + 이어하기 + 에러 개선
- 브랜치: main
- 완료:
  - **단계별 저장 + 이어하기**: Google Sheets에 currentStep 기록, 페이지 복귀 시 미완료 작업 감지 → 이어하기 배너
  - **수동 저장 버튼**: 현재 상태를 Sheets에 저장, 나중에 이어하기
  - **스타일/트렌드 프롬프트 커스텀**: 소스 기본값 → 시트 커스텀 → 초기화 버튼
    - 설정 페이지에서 스타일 프롬프트 / 트렌드 프롬프트 편집 가능
    - gemini.ts 하드코딩 제거, DEFAULT_STYLE_PROMPTS/DEFAULT_TREND_PROMPT 상수 분리
  - **"이미지 스타일" → "스타일"** 라벨 변경
  - **게시물 생성 기본값**: 설정에서 mediaType, stylePreset, captionLang 자동 로드
  - **Rate Limit 즉시 중단**: 재시도 불가 에러 감지, 한국어 안내 메시지
  - **업로드 재시도 5초 백오프**: 5s, 10s, 15s... 지수 대기
  - **이어하기 영상 깨짐 수정**: URL includes('.mp4') 판단 추가
  - **업로드 에러 로깅 강화**: console.error + 상세 에러 패널 UI
  - **Reels 폴링 3분 확대**: 24회→36회, status 필드 포함 조회
- 현재 상태: **v2.5 완성.**
- 다음 할 일:
  - 모바일 반응형 개선
  - 성과 분석 페이지 동영상/이미지 비교 분석
- 관련 커밋: fb87eae ~ 5594c2c (7개 커밋)
- 푸시 여부: origin/main 에 푸시 완료

## 2026-07-21 21:00 (집) — v2.4: 진행바 + 취소 + 캡션 스타일 + 정렬
- 브랜치: main
- 완료:
  - **진행바**: 전체 자동 생성 시 그라데이션 프로그레스 바 (5→25→50→75→100%) + 현재 단계 텍스트
  - **취소 기능**: AbortController로 진행 중인 fetch 즉시 중단, 빨간색 취소 버튼
  - **Step 3 스타일/형식 배지**: 캡션 에디터 위에 스타일 프리셋 + 미디어 타입 배지 표시
  - **캡션에 [style] 섹션 추가**: 게시글에 스타일 프리셋 자동 포함 (4곳)
  - **작업내역 최근순 정렬**: 날짜 내림차순으로 최근 게시물 먼저 표시
- 현재 상태: **v2.4 완성.**
- 다음 할 일:
  - 모바일 반응형 개선
  - 성과 분석 페이지 동영상/이미지 비교 분석
- 관련 커밋: b7e40fa ~ 334de5b (4개 커밋)
- 푸시 여부: origin/main 에 푸시 완료

## 2026-07-21 19:00 (집) — v2.1: 동영상 오디오 + UI 개선
- 브랜치: main
- 완료:
  - 동영상 프롬프트에 **배경음악 + 한국어 대사** 자동 포함 (Veo 3.1 네이티브 오디오)
  - 대시보드/작업내역 **동영상 미리보기 수정** (Instagram CDN URL includes('.mp4') 감지)
  - 대시보드 최근 게시물에 **Instagram → 링크** 추가
  - 작업내역 테이블에 **Link 컬럼** 추가 (mediaUrl permalink)
  - 작업내역 상세 시트 동영상 controls 재생 대응
- 현재 상태: **v2.1 완성. 이미지/동영상 모두 정상. 대시보드·작업내역 동영상 렌더링 정상.**
- 다음 할 일:
  - 모바일 반응형 개선
  - 성과 분석 페이지 동영상/이미지 비교 분석
- 관련 커밋: 8bf5f48 ~ 8612e1f (3개 커밋)
- 푸시 여부: origin/main 에 푸시 완료

## 2026-07-21 17:30 (집) — v2.0: Reels 동영상 + 스타일 프리셋
- 브랜치: main
- 완료:
  - **Reels 동영상 지원**: Veo 3.1 API 연동 (predictLongRunning + video.uri 다운로드 → Vercel Blob 저장)
  - Instagram Reels 업로드 (media_type: REELS + 상태 폴링)
  - API 라우트 분기: /api/generate (type=image|reels), /api/instagram/upload (mediaType 분기)
  - 캡션에 [image prompt] 섹션 자동 포함 (수동+자동 4곳)
  - **스타일 프리셋 7종**: 실사(기본)/애니메이션/지브리/빈티지필름/수채화/3D렌더/팝아트
  - generatePrompt()에 스타일 지시어 주입 → AI가 해당 스타일로 프롬프트 생성
  - 설정 페이지: 자동모드에서 mediaType + stylePreset 선택 가능
  - Google Sheets 설정에 stylePreset 읽기/쓰기 연동
  - 업로드 재시도 횟수 5→10회 (uploadPhoto, uploadReels 모두)
  - 동영상 모드 시 UI 동적 변경 (제목: 동영상 생성, 아이콘: Film, 버튼: 동영상 생성 중...)
  - Veo API 디버깅: 모델명(veo-3.1-generate-preview), 메서드(predictLongRunning), 파라미터(sampleCount), 다운로드 인증(3방식 순차 시도)
- 관련 커밋: 23f2912 ~ f72713e (6개 커밋)
- 푸시 여부: origin/main 에 푸시 완료

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
