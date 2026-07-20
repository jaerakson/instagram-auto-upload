# Publisher Result

> 게시일: 2026-07-20
> 상태: SUCCESS

---

## 업로드 결과

- media_id: 18082956752443609
- platform: Instagram
- mode: manual (사용자 확인 후 게시)
- status: SUCCESS

## 게시 상세

- image_url: https://yoeoqdwvbet4mi3v.public.blob.vercel-storage.com/insta-1784527901051.png
- model: imagen-4.0-generate-001
- style: Cinematic Flash Portrait + Vintage Film Grain
- caption_language: English
- hashtag_count: 5

## 게시 텍스트

She looked like a scene from a film nobody's made yet.

Warm light, cafe fog, and that cinematic portrait glow you can't fake with a filter. Shot with AI but it doesn't feel like it — 35mm film grain, soft halation, every imperfection left in on purpose.

Sometimes the mood finds you. Save this for your next creative reference.

.
.
.

#AIart #cinematicportrait #filmgrain #photooftheday #aestheticfeed

## 코드 수정 사항 (이번 세션)

1. `src/lib/gemini.ts`: Imagen 모델 `imagen-3.0-generate-002` → `imagen-4.0-generate-001` 업데이트, 인증 방식 query param → `x-goog-api-key` 헤더로 변경
2. `src/lib/instagram.ts`: API base URL `graph.facebook.com/v21.0` → `graph.instagram.com/v25.0` 변경
3. `.env.local`: BLOB_READ_WRITE_TOKEN, BLOB_STORE_ID 추가
