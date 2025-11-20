# Maven 환경 변수 영구 설정 가이드

## 현재 상태
- Maven 설치 위치: `C:\Maven\apache-maven-3.9.11`
- 현재 세션에서는 Maven이 작동합니다
- 새 PowerShell 창에서는 환경 변수를 설정해야 합니다

## 영구 설정 방법

### 방법 1: PowerShell 스크립트 사용 (권장)

1. **PowerShell을 관리자 권한으로 실행**
   - Windows 키 누르기
   - "PowerShell" 검색
   - "Windows PowerShell"을 마우스 오른쪽 클릭
   - "관리자 권한으로 실행" 선택

2. **스크립트 실행**
   ```powershell
   cd "C:\Users\최완재\Downloads\SWe\MrDaebak1119-main\MrDaebak1119-main"
   .\setup-maven-env.ps1
   ```

3. **설정 확인**
   - 새 PowerShell 창 열기 (관리자 권한 불필요)
   - 다음 명령어 실행:
   ```powershell
   mvn -version
   ```

### 방법 2: 수동 설정 (GUI)

1. **시스템 속성 열기**
   - Windows 키 + R
   - `sysdm.cpl` 입력 후 Enter

2. **환경 변수 설정**
   - "고급" 탭 클릭
   - "환경 변수" 버튼 클릭

3. **MAVEN_HOME 변수 추가**
   - "시스템 변수" 섹션에서 "새로 만들기" 클릭
   - 변수 이름: `MAVEN_HOME`
   - 변수 값: `C:\Maven\apache-maven-3.9.11`
   - "확인" 클릭

4. **PATH 변수 수정**
   - "시스템 변수" 섹션에서 `Path` 선택
   - "편집" 클릭
   - "새로 만들기" 클릭
   - `%MAVEN_HOME%\bin` 입력
   - "확인" 클릭

5. **모든 창 닫기**
   - 모든 "확인" 버튼 클릭하여 창 닫기

6. **설정 확인**
   - 새 PowerShell 창 열기
   - 다음 명령어 실행:
   ```powershell
   mvn -version
   ```

## 확인 방법

설정이 완료되면 다음 명령어로 확인할 수 있습니다:

```powershell
# Maven 버전 확인
mvn -version

# 환경 변수 확인
echo $env:MAVEN_HOME
echo $env:Path
```

## 문제 해결

### Maven이 인식되지 않는 경우

1. **PowerShell 재시작**: 새 PowerShell 창을 열어보세요
2. **환경 변수 확인**: `echo $env:MAVEN_HOME` 명령어로 확인
3. **경로 확인**: `C:\Maven\apache-maven-3.9.11\bin\mvn.cmd` 파일이 존재하는지 확인

### 관리자 권한 오류

- PowerShell을 관리자 권한으로 실행했는지 확인하세요
- 또는 방법 2(수동 설정)를 사용하세요

## 완료 후

환경 변수 설정이 완료되면:
- 모든 PowerShell 창에서 `mvn` 명령어 사용 가능
- 프로젝트 빌드 및 실행 가능
- 재부팅 후에도 설정 유지

