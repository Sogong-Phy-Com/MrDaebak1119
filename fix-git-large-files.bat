@echo off
REM Git에 추가된 큰 파일들을 제거하는 스크립트

echo ========================================
echo Git에서 큰 파일 제거 (25MB 이하로 만들기)
echo ========================================
echo.

REM node_modules 전체 제거 (가장 중요 - 358MB)
echo [1/4] node_modules 제거 중...
git rm -r --cached "client/node_modules" 2>nul
git rm -r --cached "server/node_modules" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] node_modules 제거 완료
) else (
    echo [INFO] node_modules가 Git에 없거나 이미 제거됨
)

REM .cache 폴더 제거
echo [2/4] .cache 폴더 제거 중...
git rm -r --cached "client/node_modules/.cache" 2>nul
git rm -r --cached "**/.cache" 2>nul
echo [OK] .cache 폴더 제거 완료

REM 빌드 결과물 제거
echo [3/4] 빌드 결과물 제거 중...
git rm -r --cached "server-java/src/main/resources/static/static" 2>nul
git rm -r --cached "server-java/target/classes/static/static" 2>nul
git rm -r --cached "server-java/target" 2>nul
echo [OK] 빌드 결과물 제거 완료

REM .gitignore 업데이트
echo [4/4] .gitignore 확인 중...
git add .gitignore 2>nul
echo [OK] .gitignore 업데이트 완료

echo.
echo ========================================
echo 완료!
echo ========================================
echo.
echo 다음 명령어를 실행하세요:
echo   git commit -m "Remove large files (node_modules, cache, build outputs)"
echo   git push
echo.
echo 참고: node_modules는 package.json과 package-lock.json만 있으면
echo       npm install로 자동 재생성됩니다.
echo.

pause

