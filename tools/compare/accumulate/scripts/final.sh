#!/bin/sh
# 변경 전(s4)과 변경 후(s5)의 최종 측정. 사용: final.sh <작업 폴더> <저장소 루트>
T="$1"; REPO="$2"
port=5600
cd "$REPO"
for c in A1 A2 A3 B1 B2 B3; do
  for step in s4 s5; do
    port=$((port + 10))
    snap="$T/snaps/$c-$step"
    case $c in A*) app="$snap/apps/sample";; B*) app="$snap";; esac
    out="$T/out/$c-$step"; mkdir -p "$out"
    node tools/compare/accumulate/probe.mjs "$app" "$out" $port > "$out/probe.txt" 2>&1
    node tools/compare/accumulate/static.mjs "$app/src" "$c-$step" > "$out/static.json"
    node tools/compare/accept.mjs "$app" "$out/accept1" $((port + 1)) > "$out/accept1.txt" 2>&1
    node tools/compare/accumulate/change.mjs "$app" "$out" $((port + 2)) "$T/out/$c-s4/probe.json" > "$out/change.txt" 2>&1
    if [ "$step" = s5 ]; then
      (cd "$snap" && pnpm check > "$out/check.txt" 2>&1; echo "exit $?" >> "$out/check.txt")
      node tools/compare/accumulate/screens.mjs "$app" "$out" $((port + 3)) > "$out/screens.txt" 2>&1
      echo "$c $step: check $(tail -1 "$out/check.txt") | 화면2~4 $(tail -1 "$out/screens.txt")"
    fi
    echo "$c $step: 화면1 $(tail -1 "$out/accept1.txt") | 변경 $(tail -1 "$out/change.txt") | $(grep '여러 화면에 걸친' "$out/probe.txt")"
  done
done
