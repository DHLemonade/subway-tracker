# GitHub Pages 배포 문제 해결 가이드

## 🔍 현재 상황
에러: `GET https://dhlemonade.github.io/src/main.tsx net::ERR_ABORTED 404`

이 에러는 GitHub Pages가 **빌드되지 않은 소스 파일**을 서빙하고 있다는 의미입니다.

## ✅ GitHub Pages 설정 확인 및 수정

### 1단계: GitHub 저장소 설정 확인

1. GitHub 저장소로 이동: https://github.com/DHLemonade/subway-tracker
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Pages** 클릭

### 2단계: Source 설정 변경

**현재 설정 (잘못된 경우)**:
```
Source: Deploy from a branch
Branch: main / (root)  ❌ 잘못됨!
```

**올바른 설정**:
```
Source: GitHub Actions  ✅ 올바름!
```

### 3단계: Source를 GitHub Actions로 변경

1. **Source** 드롭다운을 클릭
2. **"GitHub Actions"** 선택
3. 자동으로 저장됨

### 4단계: 재배포 대기

- 방금 푸시한 커밋으로 인해 GitHub Actions가 자동 실행됨
- **Actions** 탭에서 진행 상황 확인: https://github.com/DHLemonade/subway-tracker/actions
- 보통 1-2분 소요

### 5단계: 배포 확인

배포 완료 후:
1. https://dhlemonade.github.io/subway-tracker/ 접속
2. 페이지가 정상적으로 로드되는지 확인
3. 하단 네비게이션으로 페이지 이동 테스트

---

## 🚨 여전히 문제가 있다면

### 옵션 A: 브라우저 캐시 삭제

1. Chrome/Edge: `Ctrl+Shift+Delete` (Mac: `Cmd+Shift+Delete`)
2. "캐시된 이미지 및 파일" 선택
3. 삭제 후 페이지 새로고침

### 옵션 B: 시크릿 모드로 테스트

1. 시크릿/프라이빗 브라우징 모드로 접속
2. https://dhlemonade.github.io/subway-tracker/ 접속
3. 정상 작동하면 캐시 문제

### 옵션 C: GitHub Actions 로그 확인

1. https://github.com/DHLemonade/subway-tracker/actions
2. 최신 워크플로우 클릭
3. 빌드 단계에서 에러 확인

---

## 📋 체크리스트

- [ ] GitHub Pages Source를 "GitHub Actions"로 변경
- [ ] Actions 탭에서 배포 완료 확인 (녹색 체크)
- [ ] 브라우저 캐시 삭제
- [ ] 시크릿 모드로 테스트
- [ ] URL이 `https://dhlemonade.github.io/subway-tracker/#/` 형태인지 확인

---

## 💡 예상 결과

배포 성공 시:
- ✅ 메인 페이지 로드
- ✅ URL에 `#` 포함 (예: `#/history`)
- ✅ 하단 네비게이션 작동
- ✅ 페이지 새로고침 시에도 정상 작동

---

문제가 계속되면 GitHub Actions 로그를 공유해주세요!
