# Render Docker 배포 가이드 (Java 옵션이 없을 때)

## 🎯 문제
Render 대시보드에서 Java 런타임 옵션이 보이지 않습니다.

## ✅ 해결: Docker 사용

Docker를 사용하면 어떤 언어든 배포할 수 있습니다!

---

## 🚀 단계별 배포

### 방법 1: Render 대시보드에서 Docker 선택

1. **Render 대시보드 접속**
   - https://dashboard.render.com
   - 기존 서비스 삭제 또는 새로 생성

2. **"New +" → "Web Service" 클릭**

3. **GitHub 저장소 연결**

4. **설정 입력:**

   **Name:**
   ```
   mrdabak-dinner-service
   ```

   **Runtime:**
   - **Docker** 선택 (목록에서 Docker 선택)

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

5. **Environment Variables 추가:**
   - `SPRING_PROFILES_ACTIVE` = `production`
   - `JWT_SECRET` = `your-very-strong-secret-key-here` (강력한 키 사용)
   - `PORT` = `5000` (선택사항, Render가 자동으로 설정)

6. **Health Check Path:**
   ```
   /api/health
   ```

7. **"Create Web Service" 클릭**

---

### 방법 2: render.yaml 사용 (자동)

`render.yaml` 파일이 이미 Docker 설정으로 업데이트되었습니다.

1. **GitHub에 푸시:**
   ```bash
   cd C:\Users\pando\Desktop\MrDaeBak
   git add render.yaml
   git commit -m "Configure Docker deployment for Render"
   git push
   ```

2. **Render에서 새 서비스 생성:**
   - "New +" → "Web Service"
   - GitHub 저장소 연결
   - **"Infrastructure as Code"** 옵션 선택
   - `render.yaml` 파일이 자동으로 인식됨

---

## 📋 Dockerfile 확인

`server-java/Dockerfile` 파일이 이미 준비되어 있습니다:

```dockerfile
# Multi-stage build for Spring Boot application
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy built JAR
COPY --from=build /app/target/dinner-service-1.0.0.jar app.jar

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 5000

# Run application
ENTRYPOINT ["java", "-jar", "app.jar"]
```

이 Dockerfile은:
- ✅ Java 17 사용
- ✅ Maven으로 빌드
- ✅ 최적화된 멀티 스테이지 빌드
- ✅ 작은 이미지 크기 (Alpine Linux)

---

## 🔧 Render 대시보드 설정 (수동)

만약 `render.yaml`이 작동하지 않으면:

1. **Runtime:** `Docker`
2. **Dockerfile Path:** `server-java/Dockerfile`
3. **Docker Context:** `server-java`
4. **Build Command:** (비워두기 - Dockerfile이 처리)
5. **Start Command:** (비워두기 - Dockerfile이 처리)

---

## ⚠️ 주의사항

### SQLite 데이터베이스
- Render의 무료 플랜에서는 파일 시스템이 임시입니다
- 서비스 재시작 시 데이터가 삭제될 수 있습니다
- 프로덕션에서는 Render의 PostgreSQL 사용 권장

### 포트 설정
- Render가 자동으로 `PORT` 환경 변수를 제공합니다
- `application.properties`에서 `${PORT:5000}` 사용 중
- Dockerfile에서 `EXPOSE 5000` 설정

---

## 🎉 완료!

Docker를 사용하면:
- ✅ Java 옵션이 없어도 배포 가능
- ✅ 더 나은 제어와 일관성
- ✅ 로컬과 프로덕션 환경 동일
- ✅ 멀티 스테이지 빌드로 최적화

배포가 완료되면 `https://your-app.onrender.com`에서 접속 가능합니다!

---

## 🔄 업데이트 방법

코드를 수정한 후:
```bash
git add .
git commit -m "Update code"
git push
```

Render가 자동으로 Docker 이미지를 다시 빌드하고 재배포합니다!

