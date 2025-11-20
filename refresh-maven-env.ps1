# 현재 PowerShell 세션에서 Maven 환경 변수 새로고침
Write-Host "Maven 환경 변수를 현재 세션에 로드합니다..." -ForegroundColor Cyan

$mavenHome = "C:\Maven\apache-maven-3.9.11"
$mavenBin = "$mavenHome\bin"

# 시스템 환경 변수에서 읽어오기
$systemMavenHome = [System.Environment]::GetEnvironmentVariable("MAVEN_HOME", [System.EnvironmentVariableTarget]::Machine)
$systemPath = [System.Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::Machine)

if ($systemMavenHome) {
    $env:MAVEN_HOME = $systemMavenHome
    Write-Host "MAVEN_HOME 설정됨: $env:MAVEN_HOME" -ForegroundColor Green
} else {
    $env:MAVEN_HOME = $mavenHome
    Write-Host "MAVEN_HOME 임시 설정: $env:MAVEN_HOME" -ForegroundColor Yellow
}

# PATH에 Maven bin 추가
if ($env:Path -notlike "*$mavenBin*") {
    $env:Path = "$env:Path;$mavenBin"
    Write-Host "PATH에 Maven bin 추가됨" -ForegroundColor Green
} else {
    Write-Host "PATH에 이미 Maven bin이 있습니다" -ForegroundColor Yellow
}

Write-Host "`nMaven 버전 확인:" -ForegroundColor Cyan
& "$mavenBin\mvn.cmd" -version

Write-Host "`n이제 이 세션에서 'mvn' 명령어를 사용할 수 있습니다!" -ForegroundColor Green

