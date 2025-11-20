# Maven 환경 변수 영구 설정 스크립트
# 관리자 권한으로 실행해야 합니다.

Write-Host "Maven 환경 변수 설정을 시작합니다..." -ForegroundColor Green

$mavenHome = "C:\Maven\apache-maven-3.9.11"
$mavenBin = "$mavenHome\bin"

# 관리자 권한 확인
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "`n경고: 이 스크립트는 관리자 권한이 필요합니다!" -ForegroundColor Red
    Write-Host "PowerShell을 관리자 권한으로 실행한 후 다시 시도하세요." -ForegroundColor Yellow
    Write-Host "`n방법:" -ForegroundColor Cyan
    Write-Host "1. Windows 키 누르기" -ForegroundColor White
    Write-Host "2. 'PowerShell' 검색" -ForegroundColor White
    Write-Host "3. 'Windows PowerShell'을 마우스 오른쪽 클릭" -ForegroundColor White
    Write-Host "4. '관리자 권한으로 실행' 선택" -ForegroundColor White
    Write-Host "5. 이 스크립트 다시 실행" -ForegroundColor White
    pause
    exit 1
}

# Maven 경로 확인
if (-not (Test-Path $mavenHome)) {
    Write-Host "오류: Maven이 다음 경로에 없습니다: $mavenHome" -ForegroundColor Red
    exit 1
}

Write-Host "Maven 경로 확인 완료: $mavenHome" -ForegroundColor Green

# MAVEN_HOME 환경 변수 설정
try {
    $currentMavenHome = [System.Environment]::GetEnvironmentVariable("MAVEN_HOME", [System.EnvironmentVariableTarget]::Machine)
    
    if ($currentMavenHome -ne $mavenHome) {
        [System.Environment]::SetEnvironmentVariable("MAVEN_HOME", $mavenHome, [System.EnvironmentVariableTarget]::Machine)
        Write-Host "MAVEN_HOME 환경 변수 설정 완료: $mavenHome" -ForegroundColor Green
    } else {
        Write-Host "MAVEN_HOME 환경 변수가 이미 설정되어 있습니다." -ForegroundColor Yellow
    }
} catch {
    Write-Host "MAVEN_HOME 설정 실패: $_" -ForegroundColor Red
    exit 1
}

# PATH에 Maven bin 추가
try {
    $currentPath = [System.Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::Machine)
    
    if ($currentPath -notlike "*$mavenBin*") {
        $newPath = "$currentPath;$mavenBin"
        [System.Environment]::SetEnvironmentVariable("Path", $newPath, [System.EnvironmentVariableTarget]::Machine)
        Write-Host "PATH에 Maven bin 추가 완료: $mavenBin" -ForegroundColor Green
    } else {
        Write-Host "PATH에 이미 Maven bin이 등록되어 있습니다." -ForegroundColor Yellow
    }
} catch {
    Write-Host "PATH 설정 실패: $_" -ForegroundColor Red
    exit 1
}

# 현재 세션에도 환경 변수 설정
$env:MAVEN_HOME = $mavenHome
$env:Path = "$env:Path;$mavenBin"

Write-Host "`n환경 변수 설정 완료!" -ForegroundColor Green
Write-Host "`n설정된 값:" -ForegroundColor Cyan
Write-Host "  MAVEN_HOME = $mavenHome" -ForegroundColor White
Write-Host "  PATH에 추가됨 = $mavenBin" -ForegroundColor White

Write-Host "`nMaven 버전 확인:" -ForegroundColor Cyan
& "$mavenBin\mvn.cmd" -version

Write-Host "`n중요: 새 PowerShell 창을 열어야 환경 변수가 적용됩니다!" -ForegroundColor Yellow
Write-Host "현재 세션에서는 이미 적용되었습니다." -ForegroundColor Green

pause

