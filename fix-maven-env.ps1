# Maven 환경 변수 확인 및 수정 스크립트
# 관리자 권한으로 실행해야 합니다.

Write-Host "Maven 환경 변수 확인 및 수정" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Cyan

$mavenHome = "C:\Maven\apache-maven-3.9.11"
$mavenBin = "$mavenHome\bin"

# 관리자 권한 확인
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "`n경고: 관리자 권한이 필요합니다!" -ForegroundColor Red
    Write-Host "PowerShell을 관리자 권한으로 실행한 후 다시 시도하세요." -ForegroundColor Yellow
    Write-Host "`n현재 세션에서만 사용하려면 다음 명령어를 실행하세요:" -ForegroundColor Cyan
    Write-Host "  .\refresh-maven-env.ps1" -ForegroundColor White
    pause
    exit 1
}

Write-Host "`n1. Maven 경로 확인..." -ForegroundColor Cyan
if (Test-Path $mavenHome) {
    Write-Host "   Maven 경로 존재: $mavenHome" -ForegroundColor Green
} else {
    Write-Host "   오류: Maven 경로를 찾을 수 없습니다: $mavenHome" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. MAVEN_HOME 환경 변수 확인..." -ForegroundColor Cyan
$currentMavenHome = [System.Environment]::GetEnvironmentVariable("MAVEN_HOME", [System.EnvironmentVariableTarget]::Machine)
if ($currentMavenHome -eq $mavenHome) {
    Write-Host "   MAVEN_HOME이 올바르게 설정되어 있습니다: $currentMavenHome" -ForegroundColor Green
} else {
    Write-Host "   MAVEN_HOME이 설정되지 않았거나 잘못되었습니다." -ForegroundColor Yellow
    Write-Host "   현재 값: $currentMavenHome" -ForegroundColor Yellow
    Write-Host "   올바른 값으로 설정합니다..." -ForegroundColor Cyan
    [System.Environment]::SetEnvironmentVariable("MAVEN_HOME", $mavenHome, [System.EnvironmentVariableTarget]::Machine)
    Write-Host "   MAVEN_HOME 설정 완료: $mavenHome" -ForegroundColor Green
}

Write-Host "`n3. PATH 환경 변수 확인..." -ForegroundColor Cyan
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::Machine)
if ($currentPath -like "*$mavenBin*") {
    Write-Host "   PATH에 Maven bin이 이미 등록되어 있습니다." -ForegroundColor Green
} else {
    Write-Host "   PATH에 Maven bin이 없습니다. 추가합니다..." -ForegroundColor Yellow
    $newPath = "$currentPath;$mavenBin"
    [System.Environment]::SetEnvironmentVariable("Path", $newPath, [System.EnvironmentVariableTarget]::Machine)
    Write-Host "   PATH에 Maven bin 추가 완료: $mavenBin" -ForegroundColor Green
}

# 현재 세션에도 적용
$env:MAVEN_HOME = $mavenHome
$env:Path = "$env:Path;$mavenBin"

Write-Host "`n4. Maven 버전 확인..." -ForegroundColor Cyan
try {
    & "$mavenBin\mvn.cmd" -version | Select-Object -First 1
    Write-Host "   Maven이 정상적으로 작동합니다!" -ForegroundColor Green
} catch {
    Write-Host "   오류: Maven 실행 실패" -ForegroundColor Red
}

Write-Host "`n" + ("=" * 50) -ForegroundColor Cyan
Write-Host "환경 변수 설정 완료!" -ForegroundColor Green
Write-Host "`n중요: 새 PowerShell 창을 열어야 변경사항이 적용됩니다." -ForegroundColor Yellow
Write-Host "현재 세션에서는 이미 적용되었습니다." -ForegroundColor Green

pause

