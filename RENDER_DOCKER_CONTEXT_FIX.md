# Docker Context 오류 해결 가이드

## 🔴 현재 문제
```
error: failed to solve: failed to compute cache key: failed to calculate checksum of ref ... "/src": not found
```

Docker가 `pom.xml`과 `src` 디렉토리를 찾을 수 없습니다.

## ✅ 해결 방법

### Render 대시보드에서 Docker Context 설정

1. **Render 대시보드 접속**
   - https://dashboard.render.com
   - 서비스 → Settings

2. **다음 설정 확인/변경:**

   **Root Directory:**
   ```
   server-java
   ```
   (이 필드에 `server-java` 입력)

   **Dockerfile Path:**
   ```
   Dockerfile
   ```
   (Root Directory를 `server-java`로 설정하면, Dockerfile Path는 `Dockerfile`만 입력)

   또는

   **Root Directory:**
   ```
   (비워두기)
   ```

   **Dockerfile Path:**
   ```
   server-java/Dockerfile
   ```

3. **"Save Changes" 클릭**

4. **재배포:**
   - "Manual Deploy" → "Deploy latest commit"

---

## 🔍 두 가지 방법

### 방법 1: Root Directory 사용 (권장)

- **Root Directory:** `server-java`
- **Dockerfile Path:** `Dockerfile`

이렇게 하면 Render가 `server-java` 디렉토리에서 모든 명령을 실행하므로, Dockerfile의 상대 경로가 올바르게 작동합니다.

### 방법 2: 전체 경로 사용

- **Root Directory:** (비워두기)
- **Dockerfile Path:** `server-java/Dockerfile`

이 경우 Docker Context를 명시적으로 설정해야 할 수 있습니다.

---

## ⚠️ 중요

Render에서 "Docker Context" 필드가 보이지 않으면, **Root Directory**를 사용하세요.
Root Directory를 `server-java`로 설정하면, Dockerfile도 `server-java` 디렉토리 내에서 찾습니다.

---

## 📝 체크리스트

- [ ] Root Directory = `server-java` 설정
- [ ] Dockerfile Path = `Dockerfile` (Root Directory 설정 시)
- [ ] 또는 Dockerfile Path = `server-java/Dockerfile` (Root Directory 비워둘 시)
- [ ] Save Changes
- [ ] Manual Deploy

