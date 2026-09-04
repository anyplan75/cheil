#!/usr/bin/env bash
# cheil/clip_edit → anyplan75/clip_edit 로 코드를 옮깁니다.
# 본인 GitHub 계정으로 로그인된 PC/터미널에서 실행하세요.
set -euo pipefail

SRC_REPO="${SRC_REPO:-https://github.com/anyplan75/cheil.git}"
SRC_BRANCH="${SRC_BRANCH:-cursor/nas-video-upload-6575}"
DST_REPO="${DST_REPO:-https://github.com/anyplan75/clip_edit.git}"
WORKDIR="${TMPDIR:-/tmp}/clip_edit_migrate_$$"

cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

echo "==> clone $SRC_REPO ($SRC_BRANCH)"
git clone --depth 1 --branch "$SRC_BRANCH" "$SRC_REPO" "$WORKDIR/cheil"
cd "$WORKDIR/cheil/clip_edit"

echo "==> init destination repo"
rm -rf .git
git init -b main
git add -A
git commit -m "Initial commit: Windows NAS video archive toolkit"

echo "==> push to $DST_REPO"
git remote add origin "$DST_REPO"
git push -u origin main

echo "OK: https://github.com/anyplan75/clip_edit"
