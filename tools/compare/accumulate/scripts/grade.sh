#!/bin/sh
# 사용: grade.sh <작업 폴더> <저장소 루트> <단계: s2|s3|s4|s5> <검사 id 앞글자들...>
T="$1"; REPO="$2"; STEP="$3"; shift 3
port=5520
for c in A1 A2 A3 B1 B2 B3; do
  port=$((port + 1))
  snap="$T/snaps/$c-$STEP"
  case $c in A*) app="$snap/apps/sample";; B*) app="$snap";; esac
  out="$T/out/$c-$STEP"; mkdir -p "$out"
  (cd "$snap" && pnpm check > "$out/check.txt" 2>&1; echo "exit $?" >> "$out/check.txt")
  (cd "$REPO" && node tools/compare/accumulate/screens.mjs "$app" "$out" $port "$@" > "$out/screens.txt" 2>&1)
  echo "$c $STEP: check $(tail -1 "$out/check.txt") | $(tail -1 "$out/screens.txt")"
done
