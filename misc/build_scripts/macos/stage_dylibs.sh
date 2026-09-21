#!/usr/bin/env bash
# 把 bin/macos 里经 @rpath 引用的 dylib 递归收进 bundle，使包内编码器可加载。
# 用法: stage_dylibs.sh <bundle 内的 bin/macos 目录>
# 上游自带的 libavif/libjxl 是静态编的，这里对它们就是空操作。
set -uo pipefail

BIN=${1:?usage: stage_dylibs.sh <path to bin/macos inside the bundle>}
LIB="$(dirname "$BIN")/lib"
[ -d "$BIN" ] || { echo "No such directory: $BIN" >&2; exit 1; }
mkdir -p "$LIB"

search_dirs=(/opt/homebrew/lib /usr/local/lib)
if command -v brew >/dev/null 2>&1; then
  brew_prefix=$(brew --prefix)
  search_dirs=("$brew_prefix/lib" "$brew_prefix/opt"/*/lib)
fi

collect_deps() {  # 列出某二进制 @rpath 依赖的裸文件名
  otool -L "$1" 2>/dev/null | sed -n 's:.*@rpath/\([^ ]*\.dylib\).*:\1:p'
}

queue=()
for b in "$BIN"/* "$BIN"/imagemagick/*; do
  [ -f "$b" ] || continue
  while read -r d; do [ -n "$d" ] && queue+=("$d"); done < <(collect_deps "$b")
done

for ((pass=0; pass<6; pass++)); do
  next=()
  for d in "${queue[@]:-}"; do
    [ -n "$d" ] || continue
    [ -e "$LIB/$d" ] && continue
    src=""
    for s in "${search_dirs[@]:-}"; do
      [ -f "$s/$d" ] && { src="$s/$d"; break; }
    done
    if [ -z "$src" ]; then echo "MISSING $d"; continue; fi
    cp -L "$src" "$LIB/$d"
    chmod u+w "$LIB/$d"
    echo "STAGED $d <- $src"
    while read -r x; do [ -n "$x" ] && next+=("$x"); done < <(collect_deps "$LIB/$d")
  done
  queue=("${next[@]:-}")
  # 去掉已落地的
  pruned=()
  for d in "${queue[@]:-}"; do [ -n "$d" ] && [ ! -e "$LIB/$d" ] && pruned+=("$d"); done
  queue=("${pruned[@]:-}")
  [ ${#queue[@]} -eq 0 ] && break
done

echo "=== bin/lib ==="
ls -1 "$LIB"
