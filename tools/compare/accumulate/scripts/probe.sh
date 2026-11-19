#!/bin/sh
# 사용: probe.sh <작업 폴더> <저장소 루트> <단계>
T="$1"; REPO="$2"; STEP="$3"
port=5560
for c in A1 A2 A3 B1 B2 B3; do
  port=$((port + 1))
  snap="$T/snaps/$c-$STEP"
  case $c in A*) app="$snap/apps/sample";; B*) app="$snap";; esac
  out="$T/out/$c-$STEP"; mkdir -p "$out"
  (cd "$REPO" && node tools/compare/accumulate/probe.mjs "$app" "$out" $port > "$out/probe.txt" 2>&1)
  (cd "$REPO" && node tools/compare/accumulate/static.mjs "$app/src" "$c-$STEP" > "$out/static.json")
  echo "$c $STEP: $(grep '여러 화면에 걸친' "$out/probe.txt") | $(grep -c '^  ' "$out/probe.txt") 오류"
done
