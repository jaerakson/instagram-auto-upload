---
name: insta-orchestrator
description: "인스타그램 AI 사진 자동 업로드 파이프라인을 조율하는 오케스트레이터. 트렌드 분석 → Nano Banana 이미지 생성 → 게시글/태그 작성 → 업로드 → 성과 분석의 전체 흐름을 관리한다. '인스타 게시물', '인스타 올려', '인스타 업로드', '이미지 만들어', '게시물 생성', '성과 분석', '트렌드 분석', '다시 실행', '재실행', '수정', '보완', '업데이트', '결과 개선' 요청 시 이 스킬을 사용하라."
---

# Instagram Auto Upload Orchestrator

인스타그램 AI 사진 자동 업로드 파이프라인을 조율하는 통합 스킬.

## 실행 모드: 서브 에이전트 (파이프라인)

## 에이전트 구성

| 순서 | 에이전트 | subagent_type | 역할 | 스킬 | 출력 |
|------|---------|--------------|------|------|------|
| 1 | 트렌드 분석가 | insta-trend-analyst | 인기 AI 사진 트렌드 조사 | insta-trend-analysis | 01_trend_analyst_report.md |
| 2 | 이미지 생성가 | insta-image-creator | Nano Banana 이미지 생성 | insta-image-generation | 02_image_creator_output.md |
| 3 | 콘텐츠 작성가 | insta-content-writer | 게시글·태그 작성 | insta-content-optimization | 03_content_writer_post.md |
| 4 | 게시 담당 | insta-auto-publisher | Instagram 업로드 | insta-auto-publish | 04_publisher_result.md |
| 5 | 성과 분석가 | insta-performance-analyst | 게시물 성과 분석 | insta-performance-analysis | 05_performance_analysis.md |

## 워크플로우

### Phase 0: 컨텍스트 확인

기존 산출물 존재 여부를 확인하여 실행 모드를 결정한다:

1. `_workspace/` 디렉토리 존재 여부 확인
2. 실행 모드 결정:
   - **`_workspace/` 미존재** → 초기 실행. Phase 1로 진행
   - **`_workspace/` 존재 + 사용자가 부분 수정 요청** → 부분 재실행. 해당 에이전트만 재호출
   - **`_workspace/` 존재 + 새 실행 요청** → 기존 `_workspace/`를 `_workspace_{YYYYMMDD_HHMMSS}/`로 이동 후 Phase 1 진행
3. `_workspace/05_performance_analysis.md`가 있으면 이전 성과 데이터를 다음 트렌드 분석에 전달

### Phase 1: 준비

1. 사용자 입력 분석 — 수동 모드 / 자동 모드 / 성과 분석만 요청인지 판별
2. `_workspace/` 디렉토리 생성
3. 실행할 Phase 범위 결정:
   - **전체 실행** (기본): Phase 2 → 3 → 4 → 5
   - **성과 분석만**: Phase 6만 실행
   - **이미지 재생성**: Phase 3부터 재실행
   - **게시글만 수정**: Phase 4만 재실행

### Phase 2: 트렌드 분석

```
Agent(
  description: "인스타 트렌드 분석",
  subagent_type: "insta-trend-analyst",
  model: "opus",
  prompt: """
  인스타그램 AI 사진 트렌드를 분석하라.

  작업 디렉토리: {프로젝트 루트}/_workspace/
  이전 성과 데이터: {있으면 경로, 없으면 '초기 실행'}

  결과를 _workspace/01_trend_analyst_report.md 에 저장하라.
  insta-trend-analysis 스킬을 참조하라.
  """
)
```

완료 대기 → 결과 파일 존재 확인

### Phase 3: 이미지 생성

```
Agent(
  description: "Nano Banana 이미지 생성",
  subagent_type: "insta-image-creator",
  model: "opus",
  prompt: """
  트렌드 분석 결과를 기반으로 인스타그램용 AI 이미지를 생성하라.

  입력: _workspace/01_trend_analyst_report.md
  결과를 _workspace/02_image_creator_output.md 에 저장하라.
  insta-image-generation 스킬을 참조하라.

  fal.ai Nano Banana Pro를 사용하고, image_size는 square로 설정하라.
  """
)
```

완료 대기 → image_url 존재 확인. 비어있으면 1회 재시도.

### Phase 4: 게시글·태그 작성

```
Agent(
  description: "게시글 태그 작성",
  subagent_type: "insta-content-writer",
  model: "opus",
  prompt: """
  생성된 이미지에 맞는 인스타그램 게시글과 해시태그를 작성하라.

  입력:
  - _workspace/01_trend_analyst_report.md (트렌드·해시태그 참고)
  - _workspace/02_image_creator_output.md (이미지 프롬프트·의도 참고)

  결과를 _workspace/03_content_writer_post.md 에 저장하라.
  insta-content-optimization 스킬을 참조하라.
  """
)
```

완료 대기 → 전체 게시 텍스트 존재 확인

### Phase 5: 업로드

**수동 모드:**
1. 사용자에게 미리보기 제공:
   - 이미지: fal.ai CDN URL
   - 게시글: 전체 텍스트
2. 사용자 확인 후 업로드 에이전트 호출

**자동 모드:**
즉시 업로드 에이전트 호출

```
Agent(
  description: "인스타그램 업로드",
  subagent_type: "insta-auto-publisher",
  model: "opus",
  prompt: """
  인스타그램에 게시물을 업로드하라.

  입력:
  - _workspace/02_image_creator_output.md (image_url)
  - _workspace/03_content_writer_post.md (전체 게시 텍스트)

  모드: {manual / auto}
  결과를 _workspace/04_publisher_result.md 에 저장하라.
  Google Sheets "게시기록" 시트에도 기록하라.
  insta-auto-publish 스킬을 참조하라.
  """
)
```

### Phase 6: 성과 분석

게시 후 일정 시간이 지난 후 실행하거나, 사용자가 명시적으로 요청할 때 실행:

```
Agent(
  description: "게시물 성과 분석",
  subagent_type: "insta-performance-analyst",
  model: "opus",
  prompt: """
  인스타그램 게시물의 성과를 분석하고 다음 콘텐츠 방향을 제안하라.

  Google Sheets "게시기록" 시트에서 게시물 목록과 media_id를 조회하라.
  Instagram Graph API로 각 게시물의 인사이트를 수집하라.
  결과를 _workspace/05_performance_analysis.md 에 저장하라.
  insta-performance-analysis 스킬을 참조하라.

  이 분석 결과는 다음 실행 사이클의 트렌드 분석에 자동 반영된다.
  """
)
```

### Phase 7: 정리 및 보고

1. 각 Phase 산출물을 요약하여 사용자에게 보고:
   - 트렌드 요약
   - 생성된 이미지 URL
   - 게시글 미리보기
   - 업로드 결과 (성공/실패)
   - 성과 분석 요약 (실행된 경우)
2. `_workspace/` 보존 (삭제하지 않음)

## 데이터 흐름

```
[오케스트레이터]
    │
    ├→ Agent(insta-trend-analyst) → 01_trend_analyst_report.md
    │                                        │
    ├→ Agent(insta-image-creator)  ←──── Read ┘
    │   → 02_image_creator_output.md
    │              │
    ├→ Agent(insta-content-writer) ←── Read ┤ (01 + 02)
    │   → 03_content_writer_post.md
    │              │
    ├→ Agent(insta-auto-publisher) ←── Read ┤ (02 + 03)
    │   → 04_publisher_result.md
    │
    ├→ Agent(insta-performance-analyst) ←── Google Sheets + Instagram API
    │   → 05_performance_analysis.md
    │              │
    └── 다음 사이클: insta-trend-analyst가 05를 읽음 (피드백 루프)
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 트렌드 분석 실패 | 일반적 AI 아트 키워드로 대체하여 Phase 3 진행 |
| 이미지 생성 실패 | 프롬프트 단순화 후 1회 재시도. 재실패 시 사용자에게 보고 |
| 이미지 URL 만료 | Phase 3 재실행 (이미지 재생성) |
| Instagram API 실패 | 인증 문제면 사용자에게 토큰 갱신 안내, 기타면 1회 재시도 |
| 성과 데이터 수집 실패 | Google Sheets 기록만으로 분석 진행, 누락 항목 명시 |
| 에이전트 과반 실패 | 사용자에게 알리고 진행 여부 확인 |

## 테스트 시나리오

### 정상 흐름 (수동 모드)
1. 사용자: "인스타 게시물 만들어줘"
2. Phase 0: _workspace/ 없음 → 초기 실행
3. Phase 2: 트렌드 분석 → 사이버펑크 포트레이트 추천
4. Phase 3: Nano Banana Pro로 이미지 생성 → CDN URL 확보
5. Phase 4: 이미지에 맞는 게시글·태그 작성
6. Phase 5: 사용자에게 미리보기 → 확인 후 업로드 → 성공
7. Phase 7: 결과 요약 보고

### 에러 흐름
1. Phase 3에서 fal.ai API 실패
2. 프롬프트 단순화 후 재시도
3. 재시도 성공 → Phase 4 계속
4. (재실패 시) 사용자에게 "이미지 생성 실패. fal.ai 상태를 확인해주세요" 보고

### 피드백 루프 흐름
1. 사용자: "성과 분석해줘"
2. Phase 1: 성과 분석만 실행으로 판별
3. Phase 6: Instagram API + Google Sheets로 성과 수집 → 분석
4. 결과: "사이버펑크 스타일이 engagement 2배, 다음엔 네온 포트레이트 추천"
5. 다음 "인스타 게시물 만들어줘" 실행 시 이 분석이 Phase 2에 자동 반영
