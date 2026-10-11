#!/bin/bash
# 本机（Homebrew，无 MacPorts）环境下构建 ImageMagick，产物写入 bin/macos/imagemagick/magick。
#
# 为什么不用 brew 装好的 magick，也不用 MacPorts 那份 imagemagick.sh：
#   1) brew 的 bottle 是 --with-modules 编的，coder 是可加载模块，而 IM 找模块的目录是
#      **编译期写死**的绝对路径（/opt/homebrew/Cellar/imagemagick/<ver>/.../coders）。实测
#      MAGICK_MODULE_PATH 与 configure.xml 里的 CODER_PATH 都压不住它，于是包内 magick 会
#      去 brew 目录找 png.la，注册进另一份 libMagickCore（DYLD 里能看到两份同 UUID 的核），
#      报 "no decode delegate for this image format"。换台没装 brew 的机器就是坏包。
#   2) MacPorts 那份脚本硬绑 /opt/local 与 clang-mp-17，这台机跑不了。
# 所以这里用 --without-modules：coders 直接编进 CLI，包内不再有任何 .la/.so 模块需要 relocate。
# 依赖仍然来自 brew，由 stage_dylibs.sh 负责 vendor 并把绝对路径改写成 @rpath。
set -euo pipefail

IM_TAG="${IM_TAG:-7.1.2-33}"
OUT_DIR="$(pwd)/bin/macos/imagemagick"
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "${TEMP_DIR}"' EXIT

BP=$(brew --prefix)
export PKG_CONFIG_PATH="${BP}/lib/pkgconfig"
for f in libpng jpeg-turbo webp xz zstd little-cms2 freetype libtiff libheif aom libjxl brotli; do
  [ -d "${BP}/opt/${f}/lib/pkgconfig" ] && PKG_CONFIG_PATH="${PKG_CONFIG_PATH}:${BP}/opt/${f}/lib/pkgconfig"
done
export PKG_CONFIG_PATH

cd "${TEMP_DIR}"
# 官方发布只发 .7z（Homebrew 的 formula 也是抓这个）
URL="https://github.com/ImageMagick/ImageMagick/releases/download/${IM_TAG}/ImageMagick-${IM_TAG}.7z"
extract() {
  if command -v 7zz >/dev/null 2>&1; then 7zz x -y -o"${TEMP_DIR}" im.7z >/dev/null
  elif command -v 7z >/dev/null 2>&1; then 7z x -y -o"${TEMP_DIR}" im.7z >/dev/null
  else bsdtar -xf im.7z -C "${TEMP_DIR}"
  fi
}
if ! curl -fsSL --max-time 600 -o im.7z "${URL}"; then
  echo "direct download failed, retrying through local proxy" >&2
  curl -fsSL -x http://127.0.0.1:7890 --max-time 600 -o im.7z "${URL}"
fi
extract
cd "ImageMagick-${IM_TAG}"

MACOSX_DEPLOYMENT_TARGET=11.0 ./configure \
  --prefix="${TEMP_DIR}/prefix" \
  --enable-static \
  --disable-shared \
  --without-modules \
  --disable-dependency-tracking \
  --disable-opencl \
  --enable-hdri \
  --with-quantum-depth=16 \
  --without-perl \
  --without-magick-plus-plus \
  --with-png \
  --with-jpeg \
  --with-tiff \
  --with-webp \
  --with-jxl \
  --with-zstd \
  --with-bzlib \
  --with-lzma \
  --with-openjp2 \
  --with-heic \
  --without-raw \
  --without-x \
  --without-gvc \
  --without-pango \
  --without-rsvg \
  --without-raqm \
  --without-jbig \
  --without-uhdr \
  --without-djvu \
  --without-openexr \
  --without-wmf \
  > "${TEMP_DIR}/configure.log" 2>&1 || {
    tail -25 "${TEMP_DIR}/configure.log" >&2
    echo "configure failed" >&2
    exit 1
  }

make -j"$(sysctl -n hw.ncpu)" > "${TEMP_DIR}/make.log" 2>&1 || {
  tail -25 "${TEMP_DIR}/make.log" >&2
  echo "make failed" >&2
  exit 1
}
make install > "${TEMP_DIR}/install.log" 2>&1 || {
  tail -25 "${TEMP_DIR}/install.log" >&2
  echo "make install failed" >&2
  exit 1
}

BUILT="${TEMP_DIR}/prefix/bin/magick"
if [ ! -x "${BUILT}" ]; then
  echo "build produced no ${BUILT}" >&2
  exit 1
fi
# 静态 coders 的自检：Modules 不该出现在 Features 里，且 PNG 必须能在无 brew 配置下解
if "${BUILT}" -version | grep -q "Modules"; then
  echo "built magick still uses loadable modules (--without-modules did not take effect)" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"
# 只掉那一个软链/旧产物：rm -rf 整个目录会连 bin/macos/imagemagick 里的别的原料一起没掉
rm -f "${OUT_DIR}/magick"
cp "${BUILT}" "${OUT_DIR}/magick"
chmod 755 "${OUT_DIR}/magick"

echo "built: ${OUT_DIR}/magick"
file "${OUT_DIR}/magick"
"${OUT_DIR}/magick" -version | head -2
otool -L "${OUT_DIR}/magick" | head -20
