## 2026-07-22 07:00 (집) — v3.2: 실패 tooltip + 수동 이미지 + 단계별 비용 + 비용 표시 개선
- 브랜치: main
- 완료:
  - **실패 tooltip**: 작업내역 "실패" 배지 hover → 실패 사유 tooltip 표시
  - **수동 이미지 생성**: 트렌드 분석(Step 1) 없이 프롬프트 직접 입력 → 이미지 생성 가능
  - **단계별 비용 기록**: pipeline job PUT 6곳 + handleSaveProgress에 totalTokens/totalCost 포함
    - 중간 중단 시에도 발생 비용이 시트에 저장 → 작업내역에 표시됨
  - **비용 표시 개선**: locale 기반 통화 (ko: 원화, en: 달러) + hover tooltip (달러/원화 양쪽)
- 현재 상태: **v3.2 완성. 빌드 정상.**
- 다음 할 일:
  - 모바일 반응형 개선
  - 성과 분석 페이지 동영상/이미지 비교 분석
- 관련 커밋: 2dbe143
- 푸시 여부: origin/main 에 푸시 완료

## 2026-07-22 06:00 (집) — v3.1: 이미지 다운로드 + 품질 선택 + Google Drive 자동 저장
- 브랜치: main
- 완료:
  - **이미지 품질 선택**: Standard ($0.04) / Ultra ($0.08) 모델 티어 분기
    - 설정 + 게시물 생성 페이지에 품질 select 추가
    - Gemini API: imagen-4.0-generate-001 vs imagen-4.0-ultra-generate-001
  - **브라우저 다운로드**: fetch→blob→download 패턴, 게시물 생성 + 작업내역 상세에 다운로드 버튼
  - **Google Drive 자동 저장**: google-drive.ts + /api/drive/upload 신규
    - 설정: Drive 자동저장 토글 + 폴더 ID 입력
    - 이미지 생성 후 백그라운드 Drive 업로드 + 상태 표시
  - AppSettings 확장: imageQuality, googleDriveAutoSave, googleDriveFolderId
- 현재 상태: **v3.1 완성. 빌드 정상.**
- 다음 할 일: 실패 tooltip, 수동 이미지 생성, 단계별 비용, 비용 표시 개선
- 관련 커밋: 0cd549e
- 푸시 여부: origin/main 에 푸시 완료

## 2026-07-22 05:00 (집) — v3.0: 비용 원화 표시 + 작업관리 시스템 개선
- 브랜치: main
- 완료:
  - **비용 원화 병기**: 환율 API(open.er-api.com) 실시간 조회, `$0.0012 (≈1.6원)` 형식 (create + history)
  - **새로 시작 시 pending 정리**: "새로 시작" 클릭 → 이전 pending 작업을 `status: 'failed'` + `error: '사용자 취소'`로 마킹 (DELETE /api/pipeline/job)
  - **작업내역 필터**: 전체/게시됨/실패/대기중 토글 버튼
  - **작업내역 검색**: 캡션/프롬프트/해시태그 텍스트 검색
  - **작업내역 정렬**: 날짜순/비용순/좋아요순 토글
  - **작업내역 삭제**: 확인 다이얼로그 후 Sheets 행 삭제 + Blob 삭제 (published만)
  - **실패 재시도**: 빨간색 행 + 재시도 버튼 → sessionStorage로 create 페이지에 데이터 복원
  - **PostRecord 확장**: `retryCount` (S열), `error` (T열) 추가, Sheets range A:R → A:T
  - **Blob Store 정리**: 생성 시 무조건 삭제 → 명시적 삭제로 변경 (미완료 blob 보존)
  - DELETE /api/sheets: 게시물 삭제 + blob 삭제 엔드포인트
  - i18n: ko.json + en.json에 필터/검색/정렬/삭제/재시도 키 추가
- 현재 상태: **v3.0 완성. 빌드 정상.**
- 다음 할 일:
  - 모바일 반응형 개선
  - 성과 분석 페이지 동영상/이미지 비교 분석
- 관련 커밋: 527b9d8
- 푸시 여부: origin/main 에 푸시 완료

## 2026-07-22 04:00 (집) — v2.8: 토큰 사용량 + 비용 추적
- 브랜치: main
- 완료:
  - **게시물 생성**: 진행바 옆 Tokens/Cost 실시간 표시 (트렌드+프롬프트+캡션 누적)
  - **작업내역**: 상단에 총 Tokens + 총 비용 합계, 테이블에 Cost 컬럼 추가
  - Gemini API usageMetadata에서 토큰 추출 + 비용 자동 계산
  - 비용: Flash 입력 $0.15/1M, 출력 $0.60/1M, Imagen $0.02/장, Veo $2.80/8초
  - Google Sheets에 totalTokens/totalCost 저장 (Q, R 컬럼)
  - **게시물 생성 프롬프트 편집**: 설정에서 시스템 프롬프트 커스텀 + 초기화
- 현재 상태: **v2.8 완성.**
- 다음 할 일:
  - 모바일 반응형 개선
  - 성과 분석 페이지 동영상/이미지 비교 분석
- 관련 커밋: 8fcfd43 ~ c56c99a
- 푸시 여부: origin/main 에 푸시 완료

## 2026-07-22 03:00 (집) — fix: 이어하기 설정 전체 복원 누락 수정
- 브랜치: main
- 완료:
  - **자동생성 중간 저장 PUT 6곳** 모두에 `mediaType`, `stylePreset`, `captionLang`, `trendPreset` 추가
  - 최초 작업 POST에도 `trendPreset` 추가
  - `PostRecord` 타입에 `trendPreset` 필드 추가, Google Sheets P열 연동
  - `handleResume()`에서 `trendPreset` 복원 추가
  - 원인: 중간 단계 PUT에서 설정값을 보내지 않아, 중간에 멈추면 시트에서 빈 값으로 남음 → 이어하기 시 기본값(image)으로 복원되어 동영상이 이미지로 업로드됨
- 현재 상태: **수정 완료. 빌드 정상.**
- 다음 할 일:
  - 모바일 반응형 개선
  - 성과 분석 페이지 동영상/이미지 비교 분석
- 관련 커밋: ea0662c, c82a127, 10c442d
- 푸시 여부: origin/main 에 푸시 완료

## 2026-07-22 02:00 (집) — v2.7: 게시물 생성 프롬프트 커스텀 편집
- 브랜치: main
- 완료:
  - **게시물 생성 프롬프트 편집**: 설정 페이지에서 AI 시스템 프롬프트 커스텀 가능 + 초기화
  - DEFAULT_GENERATE_PROMPT 상수 분리, gemini.ts 하드코딩 제거
  - generate-prompt API + pipeline 모두 시트 generatePrompt 전달
  - Google Sheets 설정에 generatePrompt 읽기/쓰기 연동
- 현재 상태: **v2.7 완성. 설정에서 트렌드/스타일/생성 프롬프트 모두 편집 가능.**
- 다음 할 일:
  - 모바일 반응형 개선
  - 성과 분석 페이지 동영상/이미지 비교 분석
- 관련 커밋: 8fcfd43
- 푸시 여부: origin/main 에 푸시 완료

## 2026-07-22 01:00 (집) — v2.6: 트렌드 프리셋 + 프롬프트 커스텀 확장
- 브랜치: main
- 완료:
  - **트렌드 분석 프리셋 5종**: 인물사진/애니메이션/다크무드/미니멀/트렌드추적
  - **트렌드 키워드 편집**: 프리셋별 키워드를 Google Sheets에서 커스텀 + 초기화
  - **설정 페이지 리뉴얼**: 트렌드 select + 키워드 편집 + 스타일 select + 프롬프트 편집 (동일 패턴)
  - **게시물 생성 상단바**: 트렌드 + 스타일 + 형식 + 언어 select 배치, 설정 기본값 자동 로드
  - **"이미지 스타일" → "스타일"** 라벨 통일
  - DEFAULT_TREND_KEYWORDS 상수 분리, TrendPreset 타입 추가
- 현재 상태: **v2.6 완성.**
- 다음 할 일:
  - 모바일 반응형 개선
  - 성과 분석 페이지 동영상/이미지 비교 분석
- 관련 커밋: 4d827d7
- 푸시 여부: origin/main 에 푸시 완료

## 2026-07-22 00:00 (집) — fix: 이어하기 동영상→이미지 업로드 버그
- 브랜치: main
- 완료:
  - **이어하기 저장 시 mediaType 누락 수정**: `handleSaveProgress()` PUT 경로에서 `mediaType`, `stylePreset`, `captionLang`을 전송하지 않아, 진행 중 저장 후 이어하기 시 동영상(reels)이 이미지로 업로드되는 버그 수정
- 현재 상태: **수정 완료. 빌드 정상.**
- 다음 할 일:
  - 모바일 반응형 개선
  - 성과 분석 페이지 동영상/이미지 비교 분석
- 관련 커밋: ea0662c
- 푸시 여부: origin/main 에 푸시 완료

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
