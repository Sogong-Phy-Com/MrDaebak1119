# Render 배포 후 문제 해결 가이드

## 🔍 현재 로그 분석

보여주신 로그는 **정상적인 동작**입니다:

```
[JWT Filter] Request Path: /favicon.ico
[JWT Filter] Request Path: /api/health
[JWT Filter] Authorization Header: MISSING
```

이것은 문제가 아닙니다:
- `/favicon.ico`: 브라우저가 자동으로 요청하는 정적 리소스
- `/api/health`: 헬스 체크 엔드포인트 (인증 불필요)

## ✅ 로그인/회원가입이 작동하는지 확인

### 1. 실제 로그인/회원가입 시도

브라우저에서 로그인 또는 회원가입을 시도하면 다음과 같은 로그가 나타나야 합니다:

```
[JWT Filter] Request Path: /api/auth/login
[JWT Filter] Request Method: POST
[JWT Filter] Authorization Header: MISSING
```

또는

```
[JWT Filter] Request Path: /api/auth/register
[JWT Filter] Request Method: POST
[JWT Filter] Authorization Header: MISSING
```

### 2. 예상되는 정상 로그

**로그인 성공 시:**
```
[JWT Filter] Request Path: /api/auth/login
[JWT Filter] Request Method: POST
[AuthController] Login successful for user: user@example.com
```

**회원가입 성공 시:**
```
[JWT Filter] Request Path: /api/auth/register
[JWT Filter] Request Method: POST
[AuthController] Registration successful for user: user@example.com
```

## 🐛 문제 진단

### 문제 1: 프론트엔드가 잘못된 API URL 사용

**증상:**
- 브라우저 콘솔에 CORS 오류
- 네트워크 탭에서 요청이 실패

**해결:**
1. 브라우저 개발자 도구 (F12) → Network 탭 열기
2. 로그인/회원가입 시도
3. 요청 URL 확인:
   - ❌ 잘못됨: `http://localhost:5000/api/auth/login`
   - ✅ 올바름: `https://your-app.onrender.com/api/auth/login` 또는 `/api/auth/login`

**프론트엔드 수정:**
- 프론트엔드가 같은 Render 서비스에서 서빙되는 경우: API URL을 상대 경로로 변경 (`/api`)
- 프론트엔드가 별도로 배포되는 경우: 환경 변수 설정

### 문제 2: CORS 오류

**증상:**
- 브라우저 콘솔: `Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy`

**해결:**
- 이미 CORS 설정을 수정했으므로, 변경사항을 커밋하고 재배포:
  ```bash
  git add .
  git commit -m "Fix CORS"
  git push
  ```
- Render에서 재배포

### 문제 3: 데이터베이스 문제

**증상:**
- 로그인/회원가입 시도 시 500 오류
- 로그에 SQL 오류

**해결:**
- SQLite는 Render의 임시 파일 시스템에 저장되므로 재시작 시 삭제될 수 있음
- 프로덕션에서는 PostgreSQL 사용 권장

## 📝 확인 체크리스트

- [ ] 실제로 로그인/회원가입을 시도했는가?
- [ ] 브라우저 콘솔에 오류가 있는가?
- [ ] Network 탭에서 요청이 전송되는가?
- [ ] 요청 URL이 올바른가?
- [ ] CORS 오류가 있는가?
- [ ] 서버 로그에 `/api/auth/login` 또는 `/api/auth/register` 요청이 나타나는가?

## 🔧 다음 단계

1. **브라우저에서 실제로 로그인/회원가입 시도**
2. **브라우저 개발자 도구 (F12) 열기**
3. **Network 탭에서 요청 확인**
4. **Console 탭에서 오류 확인**
5. **서버 로그에서 `/api/auth/login` 또는 `/api/auth/register` 요청 확인**

이 정보를 알려주시면 더 정확한 진단이 가능합니다!

