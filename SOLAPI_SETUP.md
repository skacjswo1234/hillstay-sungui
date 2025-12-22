# 솔라피(Solapi) 문자 발송 설정 가이드

## 1. 솔라피 계정 설정

### API 키 발급
1. [솔라피 대시보드](https://solapi.com/)에 로그인
2. **설정** > **API 인증키 관리** 메뉴로 이동
3. **API Key**와 **API Secret** 확인 (또는 새로 생성)

#### ⚠️ 중요: IP 제한 설정
**Cloudflare Pages Functions를 사용하는 경우 IP 제한을 설정하지 마세요!**

- Cloudflare Pages Functions는 엣지 네트워크에서 실행되어 고정 IP가 없습니다
- IP 제한을 설정하면 API 호출이 실패할 수 있습니다
- **"API Key를 사용할 수 있는 IP를 제한합니다" 옵션을 체크하지 않고** API Key를 생성하세요
- 보안은 API Key와 Secret을 안전하게 보관하는 것으로 충분합니다

### 발신번호 등록
1. **번호 관리** > **발신번호 등록** 메뉴로 이동
2. 발신번호 등록: **010-9079-4624**
3. 관리자 승인 대기 (승인 완료 후 사용 가능)

## 2. Cloudflare Pages 환경 변수 설정

### Cloudflare 대시보드에서 설정
1. Cloudflare 대시보드에 로그인
2. **Pages** > 프로젝트 선택
3. **Settings** > **Environment Variables** 메뉴로 이동
4. 다음 환경 변수들을 추가:

```
SOLAPI_API_KEY = [솔라피 API Key]
SOLAPI_API_SECRET = [솔라피 API Secret]
SOLAPI_SENDER = 010-9079-4624
ADMIN_PHONE = 010-9079-4624
```

**참고:**
- `SOLAPI_SENDER`: 발신번호 (등록된 번호, 고객이 보는 번호)
- `ADMIN_PHONE`: 수신번호 (예약 알림을 받을 번호)
- 발신번호와 수신번호는 다를 수 있습니다
- 테스트 시 `ADMIN_PHONE`을 테스트할 번호로 변경하면 됩니다

### 로컬 개발 환경 설정 (선택사항)
프로젝트 루트에 `.dev.vars` 파일 생성 (로컬 테스트용):

```
SOLAPI_API_KEY=your_api_key_here
SOLAPI_API_SECRET=your_api_secret_here
SOLAPI_SENDER=010-9079-4624
ADMIN_PHONE=01012345678
```

⚠️ **주의**: `.dev.vars` 파일은 `.gitignore`에 추가하여 Git에 커밋하지 마세요!

## 3. 프로젝트 구조

```
hillstay-sungui/
├── functions/
│   └── api/
│       └── send-sms.js    # Cloudflare Function (솔라피 API 호출)
├── index.html              # 메인 HTML 파일
└── SOLAPI_SETUP.md         # 이 파일
```

## 4. 배포 및 테스트

### 배포
1. Git 저장소에 코드 푸시
2. Cloudflare Pages가 자동으로 빌드 및 배포
3. 환경 변수가 자동으로 적용됨

### 테스트
1. 배포된 사이트에서 예약 폼 작성
2. **예약 신청하기** 버튼 클릭
3. 관리자 번호로 문자 수신 확인

## 5. 문제 해결

### 문자 발송이 안 될 때
- 솔라피 대시보드에서 **잔액 확인** (잔액 부족 시 발송 불가)
- 발신번호 승인 상태 확인
- API Key/Secret 정확성 확인
- Cloudflare Functions 로그 확인 (대시보드 > Pages > 프로젝트 > Functions 탭)

### CORS 오류 발생 시
- Cloudflare Function의 CORS 헤더 확인
- 브라우저 콘솔에서 에러 메시지 확인

## 6. 문자 메시지 형식

발송되는 문자 메시지 예시:

```
[Hillstay 방문 예약 신청]

성함: 홍길동
연락처: 010-1234-5678
방문 날짜: 2024-01-15
방문 시간: 14:00~15:00
거주 지역: 부산진구
문의사항: 주차 가능한가요?

예약 신청이 접수되었습니다.
```

## 7. 추가 기능 확장 가능

- 고객에게도 확인 문자 발송
- 예약 시간 알림 문자 발송
- 예약 취소 문자 발송
- 데이터베이스 연동 (예약 내역 저장)

## 참고 자료
- [솔라피 API 문서](https://docs.solapi.com/)
- [Cloudflare Pages Functions 문서](https://developers.cloudflare.com/pages/platform/functions/)

