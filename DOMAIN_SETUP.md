# 도메인 설정 가이드

## 🌐 도메인: mrdaebakdinnerdelivery.com

### 옵션 1: 로컬 hosts 파일 설정 (무료, 로컬 네트워크에서만 작동)

#### Windows hosts 파일 수정
1. 메모장을 **관리자 권한**으로 실행
2. 다음 파일 열기: `C:\Windows\System32\drivers\etc\hosts`
3. 파일 끝에 다음 줄 추가:
```
10.0.3.111    mrdaebakdinnerdelivery.com
10.0.3.111    www.mrdaebakdinnerdelivery.com
```
4. 저장

#### 프론트엔드 .env 파일 수정
`client/.env` 파일을 다음과 같이 수정:
```
REACT_APP_API_URL=http://mrdaebakdinnerdelivery.com:5000/api
DANGEROUSLY_DISABLE_HOST_CHECK=true
```

#### 접속 방법
- PC에서: `http://mrdaebakdinnerdelivery.com:3000`
- **주의**: 같은 PC에서만 작동합니다. 다른 기기에서는 각각 hosts 파일을 수정해야 합니다.

---

### 옵션 2: 실제 도메인 구매 및 설정 (유료, 인터넷에서 접근 가능)

#### 1. 도메인 구매
- **Namecheap**: https://www.namecheap.com (약 $10-15/년)
- **GoDaddy**: https://www.godaddy.com (약 $12-20/년)
- **Google Domains**: https://domains.google (약 $12/년)

도메인 이름: `mrdaebakdinnerdelivery.com`

#### 2. DNS 설정
도메인 구매 후 DNS 레코드 추가:

**A 레코드**:
- 호스트: `@` 또는 `www`
- 값: PC의 공인 IP 주소 (공유기 외부 IP)
- TTL: 3600

**참고**: 공인 IP 확인 방법:
```
https://whatismyipaddress.com
```

#### 3. 포트 포워딩 설정 (공유기)
공유기 관리 페이지에서 포트 포워딩 설정:
- 외부 포트 80 → 내부 IP 10.0.3.111:3000 (HTTP)
- 외부 포트 443 → 내부 IP 10.0.3.111:3000 (HTTPS, SSL 필요)
- 외부 포트 5000 → 내부 IP 10.0.3.111:5000 (API)

#### 4. SSL 인증서 설정 (HTTPS)
- **Let's Encrypt** (무료): https://letsencrypt.org
- **Cloudflare** (무료 SSL 포함): https://www.cloudflare.com

#### 5. 프론트엔드 .env 파일 수정
```
REACT_APP_API_URL=https://mrdaebakdinnerdelivery.com/api
DANGEROUSLY_DISABLE_HOST_CHECK=true
```

#### 접속 방법
- 인터넷 어디서나: `https://mrdaebakdinnerdelivery.com`
- HTTPS 사용 권장

---

### 옵션 3: 무료 동적 DNS 서비스 (중간 옵션)

#### 서비스 선택
- **No-IP**: https://www.noip.com (무료)
- **Duck DNS**: https://www.duckdns.org (무료)
- **FreeDNS**: https://freedns.afraid.org (무료)

#### 설정 예시 (No-IP)
1. No-IP에서 계정 생성
2. 호스트 이름 생성: `mrdaebakdinnerdelivery.ddns.net`
3. No-IP 동적 DNS 클라이언트 설치 및 실행
4. DNS 설정에서 CNAME 레코드 추가:
   - `mrdaebakdinnerdelivery.com` → `mrdaebakdinnerdelivery.ddns.net`

#### 장점
- 무료
- 동적 IP 자동 업데이트
- 실제 도메인 연결 가능

---

### 옵션 4: 클라우드 배포 (권장)

#### 서비스 선택
- **Render**: https://render.com (무료 티어 제공)
- **Railway**: https://railway.app (무료 티어 제공)
- **Vercel** (프론트엔드): https://vercel.com (무료)
- **AWS EC2**: https://aws.amazon.com/ec2 (유료, 프리티어 제공)

#### Render 사용 예시
1. GitHub에 코드 푸시
2. Render에서 새 서비스 생성
3. 자동으로 도메인 할당: `your-app.onrender.com`
4. 커스텀 도메인 연결: `mrdaebakdinnerdelivery.com`

#### 장점
- 무료 티어 제공
- 자동 배포
- HTTPS 자동 설정
- 24/7 가동

---

## 🚀 빠른 시작 (로컬 hosts 파일)

가장 빠른 방법은 로컬 hosts 파일을 수정하는 것입니다:

1. **관리자 권한으로 메모장 실행**
2. **hosts 파일 열기**: `C:\Windows\System32\drivers\etc\hosts`
3. **다음 추가**:
   ```
   10.0.3.111    mrdaebakdinnerdelivery.com
   ```
4. **저장**
5. **프론트엔드 .env 수정**:
   ```
   REACT_APP_API_URL=http://mrdaebakdinnerdelivery.com:5000/api
   ```
6. **프론트엔드 재시작**
7. **접속**: `http://mrdaebakdinnerdelivery.com:3000`

---

## 📝 현재 설정 요약

- **현재 IP**: 10.0.3.111
- **백엔드 포트**: 5000
- **프론트엔드 포트**: 3000
- **원하는 도메인**: mrdaebakdinnerdelivery.com

---

## ⚠️ 주의사항

1. **로컬 hosts 파일**: 같은 PC에서만 작동
2. **실제 도메인**: 인터넷에서 접근 가능하지만 보안 설정 필요
3. **포트 번호**: 도메인만으로는 포트를 생략할 수 없음 (포트 80/443 사용 시 가능)
4. **HTTPS**: 실제 서비스에서는 HTTPS 필수

---

## 🔧 다음 단계

원하는 옵션을 선택하세요:
- **로컬 테스트**: 옵션 1 (hosts 파일)
- **실제 서비스**: 옵션 2 (도메인 구매) 또는 옵션 4 (클라우드 배포)


