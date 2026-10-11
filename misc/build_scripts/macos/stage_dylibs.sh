#!/usr/bin/env bash
# 把 bundle 里编码器的动态依赖收进包内，并把绝对路径改写成 @rpath，
# 使产物不依赖打包机上的 Homebrew 布局（原来 17 条 /opt/homebrew 绝对引用，
# 里面还有一条钉了版本号的 Cellar/imagemagick/7.1.2-32 路径）。
#
# 用法: stage_dylibs.sh <bundle 内的 bin/macos 目录>
#
# 改过 install name 的每个 Mach-O 都会被重新封一层 adhoc 签名：install_name_tool
# 原地改 Mach-O 会让旧签名失效，dyld 在 arm64 上直接按 Code Signature Invalid 杀掉。
set -uo pipefail

BIN=${1:?usage: stage_dylibs.sh <path to bin/macos inside the bundle>}
LIB="$(dirname "$BIN")/lib"
[ -d "$BIN" ] || { echo "No such directory: $BIN" >&2; exit 1; }
mkdir -p "$LIB"

LIB_NAME="$(basename "$LIB")"
BIN_NAME="$(basename "$BIN")"

search_dirs=()
if command -v brew >/dev/null 2>&1; then
  brew_prefix=$(brew --prefix)
  search_dirs+=("$brew_prefix/lib")
  for d in "$brew_prefix/opt"/*/lib; do
    [ -d "$d" ] && search_dirs+=("$d")
  done
fi
search_dirs+=(/opt/homebrew/lib /usr/local/lib)

staged=0
rewritten=0
change_fail=0
rpath_fail=0
missing=()
modified=()

is_macho() {
  file -b "$1" 2>/dev/null | grep -q '^Mach-O'
}

deps_of() {  # 列出某 Mach-O 引用的依赖路径（不含自身那一行）
  otool -L "$1" 2>/dev/null | tail -n +2 | awk '{print $1}'
}

find_src() {  # 按裸文件名在候选目录里找源 dylib
  local name=$1 dir
  for dir in "${search_dirs[@]}"; do
    if [ -f "$dir/$name" ]; then
      echo "$dir/$name"
      return 0
    fi
  done
  return 1
}

ensure_rpath() {  # ensure_rpath <file> <rpath>
  if ! otool -l "$1" 2>/dev/null | grep -q "path $2 "; then
    if install_name_tool -add_rpath "$2" "$1" 2>/dev/null; then
      modified+=("$1")       # 加 rpath 同样会拆掉原签名，必须进重签清单
    else
      echo "RPATHFAIL $1 ($2)"
      rpath_fail=$((rpath_fail + 1))
    fi
  fi
}

lib_rpath_for() {  # 该文件所在目录 → $LIB 的 @loader_path 相对路径
  local d=$1 suffix up prefix=""
  suffix="${d#"$BIN"}"
  up=$(printf '%s' "$suffix" | tr -dc '/' | wc -c | tr -d ' ')
  up=$((up + 1))                       # lib 在 $BIN 的上一级
  while [ "$up" -gt 0 ]; do prefix="${prefix}../"; up=$((up - 1)); done
  printf '@loader_path/%s%s' "$prefix" "$LIB_NAME"
}

# 收一个依赖：必要时复制进 $LIB，并递归处理它自己的依赖
stage_one() {
  local name=$1 src
  [ -e "$LIB/$name" ] && return 0
  src=$(find_src "$name") || { missing+=("$name"); return 1; }
  cp -L "$src" "$LIB/$name"
  chmod u+w "$LIB/$name"
  staged=$((staged + 1))
  echo "STAGED $name <- $src"
  # 复制件的 id 也改成 @rpath，免得还被当成 brew 里那一份
  install_name_tool -id "@rpath/$name" "$LIB/$name" 2>/dev/null
  modified+=("$LIB/$name")
  ensure_rpath "$LIB/$name" "@loader_path"
  local dep
  while read -r dep; do
    case "$dep" in
      /usr/lib/*|/System/*) continue ;;
      @rpath/*) stage_one "$(basename "$dep")" ;;
      @loader_path/*|@executable_path/*) continue ;;
      /*)
        local bn
        bn=$(basename "$dep")
        stage_one "$bn" && install_name_tool -change "$dep" "@rpath/$bn" "$LIB/$name" 2>/dev/null
        ;;
    esac
  done < <(deps_of "$LIB/$name")
}

# ImageMagick：模块制（brew bottle 的 --with-modules）的 coder 目录是编译期写死的绝对路径，
# env 与 configure.xml 都压不住 → 那种包必须连 config-*/modules-* 一起搬进来并用包装脚本指路；
# 而 misc/build_scripts/macos/imagemagick_brew.sh 出的静态 coders 版只需要配置文件。
IM_DIR="$BIN/imagemagick"
if [ -d "$IM_DIR" ]; then
  im_prefix=""
  command -v brew >/dev/null 2>&1 && im_prefix=$(brew --prefix imagemagick 2>/dev/null)
  if [ -n "$im_prefix" ] && [ -f "$IM_DIR/magick" ]; then
    rm -rf "$IM_DIR/lib" "$IM_DIR/etc"
    mkdir -p "$IM_DIR/etc"
    for d in "$im_prefix"/etc/ImageMagick-*; do
      [ -d "$d" ] && cp -R "$d" "$IM_DIR/etc/"
    done
    chmod -R u+w "$IM_DIR/etc"

    if "$IM_DIR/magick" -version 2>/dev/null | grep -q "Modules"; then
      echo "imagemagick 是模块制：连 lib/ImageMagick 一起 vendor"
      [ -d "$im_prefix/lib/ImageMagick" ] || im_prefix=""
      if [ -n "$im_prefix" ]; then
        mkdir -p "$IM_DIR/lib"
        cp -R "$im_prefix/lib/ImageMagick" "$IM_DIR/lib/ImageMagick"
        chmod -R u+w "$IM_DIR/lib"
      fi
    else
      echo "imagemagick 是静态 coders：只补配置文件"
    fi

    if [ ! -f "$IM_DIR/magick.bin" ] && [ -n "$im_prefix" ]; then
      mv "$IM_DIR/magick" "$IM_DIR/magick.bin"
    fi
    if [ -f "$IM_DIR/magick.bin" ]; then
      cat > "$IM_DIR/magick" <<'WRAP'
#!/bin/sh
# 包内 ImageMagick：默认查找路径是打包机的 brew 绝对路径，这里改指到包内。
d=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cfg=$(ls -d "$d"/lib/ImageMagick/config-* 2>/dev/null | head -1)
mod=$(ls -d "$d"/lib/ImageMagick/modules-* 2>/dev/null | head -1)
etc=$(ls -d "$d"/etc/ImageMagick-* 2>/dev/null | head -1)
MAGICK_CONFIGURE_PATH="${cfg:+$cfg:}$etc"
MAGICK_MODULE_PATH="$mod"
export MAGICK_CONFIGURE_PATH MAGICK_MODULE_PATH
exec "$d/magick.bin" "$@"
WRAP
      chmod 755 "$IM_DIR/magick"
      echo "IMAGEMAGICK wrapped <- $im_prefix"
    fi
  else
    echo "MISSING imagemagick prefix or bundled magick (prefix: $im_prefix)"
    missing+=("imagemagick-config")
  fi
fi

# 处理 bin 里的每个编码器：@rpath 依赖要收进来，绝对 brew 依赖要改写
while IFS= read -r binary; do
  [ -n "$binary" ] || continue
  # brew 的 Cellar 文件常是 444；不加写位的话 install_name_tool/codesign 会静默失败，
  # 表现是「模块收进包了但 dyld 解析不到 @rpath」，coder 全数失踪。
  chmod u+w "$binary" 2>/dev/null
  ensure_rpath "$binary" "$(lib_rpath_for "$(dirname "$binary")")"
  while read -r dep; do
    case "$dep" in
      /usr/lib/*|/System/*) continue ;;
      @rpath/*)
        stage_one "$(basename "$dep")"
        ;;
      @loader_path/*|@executable_path/*) continue ;;
      /*)
        bn=$(basename "$dep")
        if stage_one "$bn"; then
          if install_name_tool -change "$dep" "@rpath/$bn" "$binary" 2>/dev/null; then
            rewritten=$((rewritten + 1))
          else
            change_fail=$((change_fail + 1))
            echo "CHANGEFAIL $binary ($dep)"
          fi
          modified+=("$binary")
        else
          echo "MISSING $bn (referenced absolutely by $binary)"
        fi
        ;;
    esac
  done < <(deps_of "$binary")
done < <(find "$BIN" -type f | while read -r f; do is_macho "$f" && echo "$f"; done)

# exiftool 是个 perl 脚本，脚本里两行 unshift @INC 写死了 brew 的 Cellar 路径（还钉版本号），
# 换台机器就 Can't locate Image/ExifTool.pm。这里把 Image/ 模块树收进包内，并按包内位置改写。
EXF="$BIN/exiftool"
if [ -f "$EXF" ] && ! is_macho "$EXF"; then
  src_perl5=$(sed -n 's/^unshift @INC, "\([^"]*\)";.*/\1/p' "$EXF" | head -1)
  if [ -n "$src_perl5" ] && [ -d "$src_perl5/Image" ]; then
    rm -rf "$LIB/perl5"
    mkdir -p "$LIB/perl5"
    # 整棵树都要：Image::ExifTool 还 require File::RandomAccess 等同级模块
    cp -R "$src_perl5/." "$LIB/perl5/"
    awk '
      BEGIN { n = 0 }
      /^unshift @INC, ".*";$/ {
        n += 1
        if (n == 1) print "use FindBin; unshift @INC, \"$FindBin::RealBin/../lib/perl5\";"
        else print "unshift @INC, \"$FindBin::RealBin/../lib/perl5/$Config{archname}\";"
        next
      }
      { print }' "$EXF" > "$EXF.tmp" && mv "$EXF.tmp" "$EXF"
    chmod 755 "$EXF"
    echo "PERL5 vendored Image/ <- $src_perl5/Image"
  else
    echo "MISSING exiftool module tree (looked in: $src_perl5)"
    missing+=("exiftool-perl5")
  fi
fi

# 去重后重签所有被改过的 Mach-O（install_name_tool 会拆掉原签名）
# 注意：macOS 自带 bash 3.2，没有关联数组，也不能对空数组用 "${arr[@]}"（set -u 会炸）。
sign_fail=0
resealed=0
if [ "${#modified[@]}" != 0 ]; then
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    if codesign --force --timestamp=none -s - "$f" 2>/dev/null; then
      resealed=$((resealed + 1))
    else
      echo "SIGNFAIL $f"
      sign_fail=$((sign_fail + 1))
    fi
  done < <(printf '%s\n' "${modified[@]}" | sort -u)
fi

echo "=== bin/lib ==="
ls -1 "$LIB" 2>/dev/null
echo "staged=$staged rewritten=$rewritten resealed=$resealed sign_fail=$sign_fail change_fail=$change_fail rpath_fail=$rpath_fail missing=${#missing[@]}"

if [ "${#missing[@]}" != 0 ] || [ "$sign_fail" != 0 ] || [ "$change_fail" != 0 ] || [ "$rpath_fail" != 0 ]; then
  if [ "${#missing[@]}" != 0 ]; then
    printf 'unresolved: %s\n' "${missing[*]}"
  fi
  exit 1
fi
exit 0
