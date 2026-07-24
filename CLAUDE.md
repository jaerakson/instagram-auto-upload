# Instagram Auto Upload

## 프로젝트 개요
- 프로젝트명: Instagram Auto Upload
- 목적: 인스타그램 인기 AI 사진 트렌드 분석 → Nano Banana 이미지 생성 → 게시글/태그 자동 작성 → 자동 업로드 → 성과 분석 피드백 루프
- 주요 기술 스택: Next.js 16 (Vercel), Google Sheets API, Gemini API (Imagen 4 + Veo 3.1 + Flash 2.5), Instagram Graph API v25.0, Vercel Blob
- 빌드 명령어: `npm run build`
- 테스트 명령어: `npm test`
- 실행 명령어: `npm run dev`
- 브랜치 전략: main 직접 커밋 (1인 프로젝트)
- 기본 원격/브랜치: origin / main

## 하네스: Instagram Auto Upload

**목표:** 인스타그램 AI 사진 트렌드 분석 → 이미지 생성 → 게시글 작성 → 업로드 → 성과 분석을 자동화하는 완전한 파이프라인

**트리거:** 인스타, 게시물, 업로드, 이미지 생성, 트렌드, 성과 분석 관련 작업 요청 시 `insta-orchestrator` 스킬을 사용하라. 단순 질문은 직접 응답 가능.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-07-20 | 초기 구성 | 전체 | 하네스 신규 구축 |
| 2026-07-24 | v4.0 대규모 업데이트 | 전체 | 비용추적·중복방지·동기화·직접업로드·다중키·주제프리셋·UI컴팩트화 |
