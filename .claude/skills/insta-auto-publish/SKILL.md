---
name: insta-auto-publish
description: "Instagram Graph API를 사용하여 게시물을 업로드하는 스킬. Vercel Blob 이미지 URL과 캡션을 받아 2단계 API 호출로 게시한다. 수동/자동 모드를 지원하며 Google Sheets에 게시 기록을 저장한다. insta-auto-publisher 에이전트가 사용한다."
---

# 인스타그램 자동 업로드

## 업로드 절차

### 1. 입력 수집
두 파일을 읽는다:
- `_workspace/02_image_creator_output.md` — image_url (Vercel Blob 공개 URL)
- `_workspace/03_content_writer_post.md` — 전체 게시 텍스트

### 2. 사전 검증
- image_url이 유효한 https URL 형식인지 확인
- 전체 게시 텍스트가 Instagram 글자 수 제한(2,200자) 이내인지 확인
- Instagram access_token이 설정되어 있는지 확인

### 3. Instagram Graph API 2단계 업로드

**Step 1: 미디어 컨테이너 생성**
```
POST https://graph.facebook.com/v21.0/{ig-user-id}/media
Body:
{
  "image_url": "{Vercel Blob 공개 URL}",
  "caption": "{전체 게시 텍스트}",
  "access_token": "{INSTAGRAM_ACCESS_TOKEN}"
}
응답: { "id": "container_id" }
```

**Step 2: 컨테이너 퍼블리시**
```
POST https://graph.facebook.com/v21.0/{ig-user-id}/media_publish
Body:
{
  "creation_id": "{container_id}",
  "access_token": "{INSTAGRAM_ACCESS_TOKEN}"
}
응답: { "id": "media_id" }
```

### 4. Google Sheets 기록
"게시기록" 시트에 한 행 추가:

| 날짜 | 이미지URL | 프롬프트 | 캡션요약 | 해시태그 | media_id | 모드 |
|------|----------|---------|---------|---------|----------|------|

### 5. 결과 저장
`_workspace/04_publisher_result.md`에 저장:

```
## 게시 결과
- status: success / failed
- media_id: {Instagram 게시물 ID}
- image_url: {사용된 Vercel Blob URL}
- posted_at: {게시 시간 ISO 8601}
- mode: manual / auto

## Google Sheets 기록
- 시트명: 게시기록
- 기록 완료: yes/no
```

### 6. 에러 대응

| 에러 | 원인 | 대응 |
|------|------|------|
| OAuthException | access_token 만료 | 토큰 갱신 안내, 작업 중단 |
| Invalid image URL | URL 접근 불가 | 오케스트레이터에 이미지 재생성 요청 |
| Rate limit | API 호출 초과 | 1분 대기 후 1회 재시도 |
| Caption too long | 2,200자 초과 | 해시태그 수 줄여서 재시도 |
