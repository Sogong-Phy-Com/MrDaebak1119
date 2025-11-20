# Maven 자동 설치 스크립트
Write-Host "Maven 설치를 시작합니다..." -ForegroundColor Green

# Maven 버전 및 다운로드 URL
$mavenVersion = "3.9.9"
$mavenUrl = "https://dlcdn.apache.org/maven/maven-3/$mavenVersion/binaries/apache-maven-$mavenVersion-bin.zip"
$installDir = "C:\Program Files\Apache"
$mavenHome = "$installDir\maven"

# 관리자 권한 확인
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "경고: 관리자 권한이 필요합니다. 환경 변수 설정을 위해 관리자 권한으로 실행하세요." -ForegroundColor Yellow
    Write-Host "스크립트를 마우스 오른쪽 클릭 -> '관리자 권한으로 실행'을 선택하세요." -ForegroundColor Yellow
    pause
}

# 설치 디렉토리 생성
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    Write-Host "설치 디렉토리 생성: $installDir" -ForegroundColor Cyan
}

# Maven이 이미 설치되어 있는지 확인
if (Test-Path $mavenHome) {
    Write-Host "Maven이 이미 설치되어 있습니다: $mavenHome" -ForegroundColor Yellow
    $overwrite = Read-Host "덮어쓰시겠습니까? (Y/N)"
    if ($overwrite -ne "Y" -and $overwrite -ne "y") {
        Write-Host "설치를 취소했습니다." -ForegroundColor Red
        exit
    }
    Remove-Item -Path $mavenHome -Recurse -Force
}

# 임시 다운로드 경로
$tempZip = "$env:TEMP\apache-maven-$mavenVersion-bin.zip"

# Maven 다운로드
Write-Host "Maven 다운로드 중... (이 작업은 시간이 걸릴 수 있습니다)" -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $mavenUrl -OutFile $tempZip -UseBasicParsing
    Write-Host "다운로드 완료!" -ForegroundColor Green
} catch {
    Write-Host "다운로드 실패: $_" -ForegroundColor Red
    exit 1
}

# 압축 해제
Write-Host "압축 해제 중..." -ForegroundColor Cyan
try {
    Expand-Archive -Path $tempZip -DestinationPath $installDir -Force
    # 압축 해제된 폴더 이름 변경
    $extractedFolder = "$installDir\apache-maven-$mavenVersion"
    if (Test-Path $extractedFolder) {
        Rename-Item -Path $extractedFolder -NewName "maven" -Force
    }
    Write-Host "압축 해제 완료!" -ForegroundColor Green
} catch {
    Write-Host "압축 해제 실패: $_" -ForegroundColor Red
    exit 1
}

# 임시 파일 삭제
Remove-Item -Path $tempZip -Force

# 환경 변수 설정
Write-Host "환경 변수 설정 중..." -ForegroundColor Cyan

# MAVEN_HOME 설정
[System.Environment]::SetEnvironmentVariable("MAVEN_HOME", $mavenHome, [System.EnvironmentVariableTarget]::Machine)
$env:MAVEN_HOME = $mavenHome

# PATH에 Maven bin 추가
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::Machine)
$mavenBin = "$mavenHome\bin"

if ($currentPath -notlike "*$mavenBin*") {
    $newPath = "$currentPath;$mavenBin"
    [System.Environment]::SetEnvironmentVariable("Path", $newPath, [System.EnvironmentVariableTarget]::Machine)
    $env:Path = "$env:Path;$mavenBin"
    Write-Host "PATH에 Maven 추가 완료!" -ForegroundColor Green
} else {
    Write-Host "PATH에 이미 Maven이 등록되어 있습니다." -ForegroundColor Yellow
}

Write-Host "`nMaven 설치 완료!" -ForegroundColor Green
Write-Host "설치 경로: $mavenHome" -ForegroundColor Cyan
Write-Host "`n새 PowerShell 창을 열고 다음 명령어로 확인하세요:" -ForegroundColor Yellow
Write-Host "  mvn -version" -ForegroundColor White

pause

