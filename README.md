# 🚇 Subway Tracker

지하철 플랫폼 USB 체크인 관리 웹 애플리케이션

## 📝 프로젝트 소개

작업자가 일정 시간마다 지하철 플랫폼을 방문하여 USB를 점검하고, 그 일시와 열차 정보를 기록하는 모바일 전용 PWA입니다.

### 주요 기능

- ✅ **체크인**: 열차 일련번호 선택, 플랫폼 번호(1/10), 사진 업로드, 특이사항 기록
- 📋 **히스토리**: 작업 히스토리 조회, 필터링, 상세보기, 수정/삭제
- ⚙️ **설정**: 열차 일련번호 추가/삭제 관리
- 📱 **모바일 최적화**: 모바일 전용 UI, 큰 버튼, 터치 친화적
- 💾 **오프라인 지원**: IndexedDB 기반 로컬 데이터 저장
- 🔒 **정적 배포**: GitHub Pages를 통한 무료 호스팅

## 🛠 기술 스택

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v7
- **Database**: IndexedDB (idb wrapper)
- **Styling**: CSS
- **Deployment**: GitHub Pages

## 📦 설치 및 실행

### 개발 환경 설정

\`\`\`bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프리뷰
npm run preview
\`\`\`

### GitHub Pages 배포

**GitHub Actions를 통한 자동 배포 (권장)**:
1. GitHub 저장소 Settings > Pages로 이동
2. Source를 "GitHub Actions"로 설정
3. `main` 브랜치에 푸시하면 자동으로 배포됩니다

**수동 배포**:
\`\`\`bash
# 빌드 및 배포
npm run deploy
\`\`\`

**배포 URL**: `https://[username].github.io/subway-tracker/`

**참고**: 
- HashRouter를 사용하여 GitHub Pages에서 라우팅이 정상 작동합니다
- URL에 `#`이 포함됩니다 (예: `.../#/history`)

## 📁 프로젝트 구조

\`\`\`
src/
├── components/          # 공통 컴포넌트
│   ├── BottomNav.tsx   # 하단 네비게이션
│   └── OnlineStatus.tsx # 오프라인 상태 표시
├── db/                 # IndexedDB 클라이언트
│   └── indexedDbClient.ts
├── features/           # 기능별 페이지
│   ├── checkin/       # 체크인 페이지
│   ├── history/       # 히스토리 페이지
│   └── trains/        # 열차 관리 페이지
├── types/             # TypeScript 타입 정의
│   └── index.ts
├── utils/             # 유틸리티 함수
│   └── helpers.ts
├── App.tsx            # 메인 앱 컴포넌트
└── main.tsx           # 진입점
\`\`\`

## 💾 데이터 모델

### IndexedDB 스키마

- **trains**: 열차 일련번호 관리
- **checkins**: 체크인 기록 (열차ID, 플랫폼, 시간, 메모 등)
- **photos**: 사진 데이터 (Blob 형태로 저장)

## 📱 사용 방법

1. **열차 등록**: 설정 페이지에서 열차 일련번호를 미리 등록합니다.
2. **체크인**: 체크인 페이지에서 열차 선택, 플랫폼 번호 선택, 사진 촬영, 특이사항 기록 후 저장합니다.
3. **히스토리 확인**: 히스토리 페이지에서 과거 작업 내역을 확인하고 관리합니다.

## 🌐 브라우저 지원

- Chrome/Edge (최신 버전)
- Safari (iOS 15+)
- Firefox (최신 버전)

## 📄 라이선스

MIT License

## 🔥 Firebase 연동

이 프로젝트는 **Firebase Firestore**와 **Firebase Storage**를 사용하여 여러 사용자 간 실시간 데이터 동기화를 지원합니다.

### 주요 기능
- ✅ **실시간 동기화**: 모든 사용자가 자동으로 최신 데이터 확인
- ✅ **오프라인 지원**: Firebase 자동 캐싱으로 오프라인 작업 가능
- ✅ **사진 클라우드 저장**: Firebase Storage에 사진 자동 백업
- ✅ **무료 티어**: 소규모 팀은 무료로 사용 가능

### Firebase 설정

자세한 설정 방법은 [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) 문서를 참고하세요.

**빠른 설정:**
1. Firebase Console에서 Firestore Database 활성화
2. Firebase Storage 활성화
3. 보안 규칙 설정 (FIREBASE_SETUP.md 참고)

### 데이터베이스 구조

- **Firestore Collections**
  - `trains`: 열차 일련번호 관리
  - `checkins`: 체크인 기록
- **Firebase Storage**
  - `photos/`: 체크인 사진 저장

### 로컬 개발 vs 프로덕션

- **로컬 개발**: IndexedDB 캐싱으로 오프라인 작업 가능
- **프로덕션**: Firebase를 통해 모든 사용자 간 실시간 동기화

