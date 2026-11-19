#!/bin/sh
# 사용: make-prompts.sh <작업 폴더(chains의 부모)>
T="$1"
port=5400
for c in A1 A2 A3 B1 B2 B3; do
  port=$((port + 1))
  case $c in A*) src="apps/sample/src";; B*) src="src";; esac
  dir="$T/chains/$c"
  for n in 2-orders 3-suppliers 4-settings; do
    cat "$T/specs/spec-$n.md" "$T/specs/tail.md" | sed -e "s#{{SRC}}#$src#g" -e "s#{{PROJECT_DIR}}#$dir#g" -e "s#{{PORT}}#$port#g" > "$T/prompts/$c-$n.md"
  done
  cat "$T/specs/spec-5-change.md" "$T/specs/tail-change.md" | sed -e "s#{{SRC}}#$src#g" -e "s#{{PROJECT_DIR}}#$dir#g" -e "s#{{PORT}}#$port#g" > "$T/prompts/$c-5-change.md"
done
