#!/bin/bash
# Git에 추가된 큰 파일들을 제거하는 스크립트

echo "Git 캐시에서 큰 파일들을 제거합니다..."

# .cache 폴더 제거
git rm -r --cached "client/node_modules/.cache" 2>/dev/null
git rm -r --cached "**/.cache" 2>/dev/null

# 빌드 결과물 제거
git rm -r --cached "server-java/src/main/resources/static/static" 2>/dev/null
git rm -r --cached "server-java/target/classes/static/static" 2>/dev/null

# node_modules 전체 제거 (이미 추가된 경우)
git rm -r --cached "client/node_modules" 2>/dev/null
git rm -r --cached "server/node_modules" 2>/dev/null

# target 폴더 제거
git rm -r --cached "server-java/target" 2>/dev/null

echo ""
echo "완료! 이제 다음 명령어를 실행하세요:"
echo "  git add .gitignore"
echo "  git commit -m 'Remove large files and update .gitignore'"
echo "  git push"

