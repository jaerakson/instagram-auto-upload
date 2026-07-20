---
name: insta-image-generation
description: "Gemini Imagen 3를 사용하여 인스타그램 최적화 AI 이미지를 생성하는 스킬. 트렌드 리포트 기반으로 영문 프롬프트를 설계하고, Gemini API로 이미지를 생성하여 Vercel Blob 공개 URL을 확보한다. insta-image-creator 에이전트가 사용한다."
---

# Gemini Imagen 3 이미지 생성

## 생성 절차

### 1. 트렌드 리포트 분석
`_workspace/01_trend_analyst_report.md`를 읽고:
- 추천 스타일 키워드 추출
- 추천 주제/분위기 키워드 추출
- 피해야 할 요소 확인

### 2. 프롬프트 설계
영문 프롬프트를 다음 구조로 조합한다:

```
[주제/피사체], [스타일], [분위기/조명], [배경], [품질 부스터]
```

**품질 부스터 (항상 포함):**
- highly detailed, professional, 8k resolution
- cinematic lighting, sharp focus
- trending on artstation (스타일에 따라)

**피해야 할 네거티브 요소:**
- blurry, low quality, watermark, text overlay
- distorted hands, extra fingers (인물 이미지 시)

**프롬프트 길이:** 30~80단어가 최적. 너무 길면 품질 저하.

### 3. 이미지 생성 API 호출

프로젝트의 `/api/generate` 엔드포인트를 호출한다:

```
POST /api/generate
Body:
{
  "prompt": "{설계된 프롬프트}",
  "aspectRatio": "1:1"
}
```

내부 동작:
1. Gemini Imagen 3 API (`imagen-3.0-generate-002`) 호출
2. base64 이미지 반환
3. Vercel Blob에 업로드 → 공개 https URL 획득
4. 이전 `insta-*` prefix 이미지 자동 삭제 (1개만 유지)

**Instagram 업로드 호환:**
- Vercel Blob URL은 공개 https URL이므로 Instagram Graph API에서 직접 접근 가능
- fal.ai CDN과 달리 URL이 만료되지 않음

### 4. 결과 저장
`_workspace/02_image_creator_output.md`에 저장:

```
## 사용 프롬프트
{영문 프롬프트 전문}

## 프롬프트 설계 의도
{트렌드 리포트의 어떤 키워드를 반영했는지}

## 생성 결과
- image_url: {Vercel Blob 공개 URL}
- model: imagen-3.0-generate-002
- image_size: 1:1
- status: SUCCESS
```

### 5. 주의사항
- Vercel Blob URL은 영구적이지만, 새 이미지 생성 시 이전 이미지가 자동 삭제된다.
- 인물 이미지는 비현실적 특징이 나올 수 있으므로 프롬프트에 네거티브 키워드를 활용한다.
- 인스타그램 커뮤니티 가이드라인 위반 소지가 있는 콘텐츠는 생성하지 않는다.
- 로컬 개발 시에도 `BLOB_READ_WRITE_TOKEN` 환경변수가 필요하다.
