# Render 배포 오류 수동 해결 가이드

## 🔴 현재 문제
Render가 여전히 Node.js로 인식하고 있습니다.
`render.yaml` 파일이 자동으로 인식되지 않았을 수 있습니다.

## ✅ 해결 방법: Render 대시보드에서 수동 설정

### 방법 1: 기존 서비스 설정 변경 (권장)

1. **Render 대시보드 접속**
   - https://dashboard.render.com
   - 배포 중인 서비스 클릭

2. **Settings 탭으로 이동**

3. **다음 설정을 모두 변경:**

   **Runtime:**
   - 현재: `Node` 또는 `Auto-detect`
   - 변경: **`Docker`** 선택

   **Dockerfile Path:**
   ```
   server-java/Dockerfile
   ```

   **Docker Context:**
   ```
   server-java
   ```

   **Build Command:**
   - **비워두기** (Dockerfile이 처리)

   **Start Command:**
   - **비워두기** (Dockerfile이 처리)

4. **Environment Variables 확인/추가:**
   - `SPRING_PROFILES_ACTIVE` = `production`
   - `JWT_SECRET` = `your-very-strong-secret-key-here` (강력한 키 사용)
   - `PORT` = `5000` (선택사항)

5. **Health Check Path:**
   ```
   /api/health
   ```

6. **"Save Changes" 클릭**

7. **재배포:**
   - "Manual Deploy" → "Deploy latest commit" 클릭

---

### 방법 2: 서비스 삭제 후 새로 생성

1. **기존 서비스 삭제**
   - Render 대시보드에서 서비스 선택
   - Settings → "Delete Service" 클릭

2. **새 서비스 생성**
   - "New +" → "Web Service" 클릭
   - GitHub 저장소 연결

3. **설정 입력:**

   **Name:**
   ```
   mrdabak-dinner-service
   ```

   **Runtime:**
   - **Docker** 선택

   **Dockerfile Path:**
   ```
   server-java/Dockerfile
   ```

   **Docker Context:**
   ```
   server-java
   ```

   **Instance Type:**
   - **Free** 선택

4. **Environment Variables 추가:**
   - `SPRING_PROFILES_ACTIVE` = `production`
   - `JWT_SECRET` = `your-very-strong-secret-key-here`

5. **Health Check Path:**
   ```
   /api/health
   ```

6. **"Create Web Service" 클릭**

---

### 방법 3: Infrastructure as Code 사용

1. **GitHub에 render.yaml 푸시 확인:**
   ```bash
   cd C:\Users\pando\Desktop\MrDaeBak
   git add render.yaml
   git commit -m "Add render.yaml for Docker deployment"
   git push
   ```

2. **기존 서비스 삭제**

3. **새 서비스 생성:**
   - "New +" → "Web Service"
   - GitHub 저장소 연결
   - **"Infrastructure as Code"** 옵션 선택
   - `render.yaml` 파일이 자동으로 인식됨

---

## 🔍 확인 사항

### render.yaml 파일 위치
- ✅ 루트 디렉토리에 있어야 함: `render.yaml`
- ✅ `server-java/render.yaml`이 아닌 루트의 `render.yaml`

### Dockerfile 위치
- ✅ `server-java/Dockerfile` 파일이 존재해야 함
- ✅ 파일 내용이 올바른지 확인

### GitHub 저장소
- ✅ `render.yaml` 파일이 GitHub에 푸시되었는지 확인
- ✅ 최신 커밋이 푸시되었는지 확인

---

## ⚠️ 중요: Build Command와 Start Command

**Docker를 사용할 때는:**
- Build Command: **비워두기** (또는 삭제)
- Start Command: **비워두기** (또는 삭제)

Dockerfile이 모든 것을 처리하므로 이 명령어들이 있으면 충돌할 수 있습니다!

---

## 🎯 가장 빠른 해결 방법

1. Render 대시보드 → 서비스 → Settings
2. Runtime을 **Docker**로 변경
3. Dockerfile Path: `server-java/Dockerfile`
4. Docker Context: `server-java`
5. Build Command **삭제** (비워두기)
6. Start Command **삭제** (비워두기)
7. Save Changes
8. Manual Deploy

이렇게 하면 즉시 해결됩니다!

