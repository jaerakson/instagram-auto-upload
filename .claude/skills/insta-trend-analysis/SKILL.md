---
name: insta-trend-analysis
description: "인스타그램 AI 사진 트렌드를 분석하는 스킬. 웹 검색으로 인기 AI 이미지 스타일, 해시태그, engagement 패턴을 조사하고, 이전 게시물 성과 데이터가 있으면 결합하여 다음 콘텐츠 방향을 도출한다. insta-trend-analyst 에이전트가 사용한다."
---

# 인스타그램 AI 사진 트렌드 분석

## 분석 절차

### 1. 이전 성과 데이터 확인
- `_workspace/05_performance_analysis.md` 파일이 있으면 읽는다.
- 있으면: 잘 먹힌 스타일/키워드를 우선 참고하여 분석 방향 설정
- 없으면: 초기 실행으로 판단하고 외부 트렌드만으로 분석

### 2. 웹 검색 트렌드 조사
다음 검색 쿼리를 활용한다:
- "Instagram AI art trending 2026"
- "AI generated photo Instagram popular"
- "인스타그램 AI 사진 트렌드"
- "#AIart Instagram most liked"
- "best AI image prompts for Instagram engagement"

수집 항목:
- 인기 AI 이미지 스타일 (사이버펑크, 판타지, 포트레이트, 풍경 등)
- 높은 engagement을 받는 이미지의 공통 특징 (색감, 구도, 주제)
- 인기 해시태그 목록과 게시물 수
- 캡션 패턴 (스토리텔링, 질문형, 감성형 등)

### 3. 분석 결과 정리
다음 형식으로 `_workspace/01_trend_analyst_report.md`에 저장:

```
## 트렌드 요약
(3줄 이내 핵심 요약)

## 인기 스타일 TOP 5
1. 스타일명 — 설명, 왜 인기인지
2. ...

## 추천 키워드 (프롬프트용, 영문)
- 스타일: [cinematic, ethereal, neon, ...]
- 주제: [portrait, landscape, abstract, ...]
- 분위기: [moody, vibrant, dreamy, ...]
- 품질: [8k, highly detailed, professional photography, ...]

## 추천 해시태그 TOP 20
(대중적 10개 + 틈새 10개 혼합)

## 피해야 할 것
- 식상한 스타일, 인스타 정책 위반 소지 등

## 이전 성과 반영 사항
(성과 데이터가 있을 때만. 어떤 데이터를 어떻게 반영했는지)
```

### 4. 추천 방향 구체화
최종 추천은 insta-image-creator가 바로 프롬프트로 변환할 수 있도록 구체적 영문 키워드 조합으로 제시한다.

예시: "cyberpunk female portrait, neon pink and blue, rain-soaked street, cinematic"
