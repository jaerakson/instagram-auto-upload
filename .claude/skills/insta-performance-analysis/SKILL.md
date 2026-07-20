---
name: insta-performance-analysis
description: "인스타그램 게시물 성과(좋아요, 댓글, 저장, 팔로워 변화)를 분석하는 스킬. Instagram Graph API로 인사이트를 수집하고, Google Sheets 기록과 결합하여 스타일별 engagement 패턴을 도출한다. 다음 콘텐츠 방향을 자동으로 제안하여 피드백 루프를 완성한다. insta-performance-analyst 에이전트가 사용한다."
---

# 인스타그램 게시물 성과 분석

## 분석 절차

### 1. 데이터 수집

**Instagram Graph API 인사이트:**
```
# 게시물별 인사이트
GET https://graph.facebook.com/v21.0/{media-id}/insights
  ?metric=likes,comments,saved,reach,impressions
  &access_token={token}

# 최근 게시물 목록
GET https://graph.facebook.com/v21.0/{ig-user-id}/media
  ?fields=id,caption,timestamp,like_count,comments_count
  &access_token={token}

# 계정 팔로워 수
GET https://graph.facebook.com/v21.0/{ig-user-id}
  ?fields=followers_count,media_count
  &access_token={token}
```

**Google Sheets "게시기록" 시트:**
- 게시 날짜, 사용된 프롬프트, 스타일 키워드, 해시태그 조회

### 2. 성과 매핑
Google Sheets의 프롬프트/스타일 정보와 Instagram 인사이트를 media_id로 매핑한다.

| 날짜 | 스타일 | 프롬프트 요약 | 좋아요 | 댓글 | 저장 | 도달 |
|------|-------|------------|-------|------|------|------|

### 3. 패턴 분석

**정량 분석:**
- 스타일별 평균 engagement (좋아요+댓글+저장)
- 게시 시간대별 도달률
- 해시태그 조합별 성과 비교
- 팔로워 증감 추이 (게시물당)

**정성 분석:**
- 댓글 감성 분류 (긍정/부정/요청)
- 자주 등장하는 댓글 키워드 추출
- "더 보고 싶다" 류의 요청 패턴 수집

### 4. 방향 제안 도출
분석 결과를 기반으로 다음 콘텐츠 방향을 구체적으로 제안한다.
이 제안이 다음 실행 사이클에서 insta-trend-analyst의 입력이 된다.

### 5. 결과 저장
`_workspace/05_performance_analysis.md`에 저장:

```
## 분석 기간
{시작일} ~ {종료일}, 총 {N}개 게시물

## 게시물별 성과 요약
| 날짜 | 스타일 | 좋아요 | 댓글 | 저장 | 도달 | engagement점수 |

## 성과 패턴
- 최고 성과 스타일: {스타일명} (평균 engagement: {N})
- 최저 성과 스타일: {스타일명} (평균 engagement: {N})
- 최적 게시 시간: {시간대}
- 효과적 해시태그: {태그 목록}

## 댓글 분석
- 긍정 반응 키워드: [...]
- 부정 반응 키워드: [...]
- 팔로워 요청 사항: [...]

## 팔로워 변화
- 분석 시작: {N}명
- 현재: {N}명
- 증감: +{N}명

## 다음 콘텐츠 추천
- 추천 스타일: {구체적 스타일}
- 추천 키워드 (영문): [...]
- 피해야 할 것: [...]
- 근거: {왜 이 방향을 추천하는지}
```

### 6. 데이터 부족 시
게시물 3개 미만이면:
- "데이터 부족 — 충분한 패턴 분석 불가" 명시
- 가용 데이터로 최선의 분석 제공
- "추가 {N}개 게시 후 재분석 권장" 안내
