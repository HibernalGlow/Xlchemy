#!/bin/bash
# 本机（Homebrew）环境下构建 cjpegli，产物写入 bin/macos/cjpegli。
#
# 为什么单独一个脚本：仓里 misc/build_scripts/macos/libjxl.sh 的 cjpegli 部分硬绑
# MacPorts（/opt/local、clang-mp-17、libgif5 路径），这台机只有 Homebrew，于是
# bin/macos 里从来就没有 cjpegli —— 而设置项 JPEG Encoder 的第一项就是 JPEGLI，
# mac 包发到别人机器上，默认走 JPEG 就会 OSError 找不到文件。
# 源与 commit 沿用 libjxl.sh 里那个 JPEGLI_COMMIT，只出 arm64（不做 universal2）。
set -euo pipefail

JPEGLI_COMMIT="${JPEGLI_COMMIT:-031a0077f5799a6041004267fc12b956c1f52a20}"
OUT_DIR="$(pwd)/bin/macos"
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "${TEMP_DIR}"' EXIT

BP=$(brew --prefix)
SDK=$(xcrun --show-sdk-path)

for need in cmake ninja git clang; do
  command -v "$need" >/dev/null 2>&1 || { echo "缺少构建工具: $need" >&2; exit 1; }
done
for f in libpng jpeg-turbo giflib; do
  [ -d "$BP/opt/$f" ] || { echo "缺少 Homebrew 包: $f" >&2; exit 1; }
done

git init "${TEMP_DIR}/jpegli" >/dev/null
cd "${TEMP_DIR}/jpegli"
git remote add origin https://github.com/google/jpegli.git

# 这台机直连 GitHub 经常把 fetch-pack 打断（RPC 失败 / 早 EOF），所以留一个可选代理开关：
#   XLC_GIT_PROXY=http://127.0.0.1:7890 bash misc/build_scripts/macos/jpegli_brew.sh
# -c 的 http.proxy 会通过 GIT_CONFIG_PARAMETERS 传给 submodule 派生的子进程。
git_config=()
if [ -n "${XLC_GIT_PROXY:-}" ]; then
  git_config=(-c "http.proxy=${XLC_GIT_PROXY}" -c "https.proxy=${XLC_GIT_PROXY}")
fi

# GitHub 的 fetch-pack 在这台机上会随机断流（curl 18/56 + 早 EOF），所以两个网络步骤都重试；
# 每次重试前把已取得的 objects 留着，depth 1 的 pack 能续上。
retry_git() {
  local attempt=1 max=5
  until git ${git_config[@]+"${git_config[@]}"} "$@"; do
    if [ "$attempt" = "$max" ]; then
      echo "git $* 连续 $max 次失败" >&2
      return 1
    fi
    echo "git $* 第 $attempt 次失败，$((attempt * 10))s 后重试" >&2
    sleep $((attempt * 10))
    attempt=$((attempt + 1))
  done
  return 0
}

retry_git fetch --depth 1 origin "${JPEGLI_COMMIT}"
git switch --detach "${JPEGLI_COMMIT}"
retry_git submodule update --init --recursive --depth 1 --recommend-shallow \
  third_party/lcms \
  third_party/skcms \
  third_party/highway \
  third_party/libpng \
  third_party/zlib \
  third_party/libjpeg-turbo

build_dir="${TEMP_DIR}/build-arm64"
mkdir -p "${build_dir}"
cd "${build_dir}"

export PKG_CONFIG_PATH="${BP}/lib/pkgconfig:${BP}/opt/libpng/lib/pkgconfig:${BP}/opt/jpeg-turbo/lib/pkgconfig"
export LDFLAGS="-L${BP}/lib"
export CPPFLAGS="-I${BP}/include"

cmake -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0 \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_PREFIX_PATH="${BP}" \
  -DJPEGLI_STATIC=ON \
  -DBUILD_TESTING=OFF \
  -DJPEGLI_ENABLE_TOOLS=ON \
  -DJPEGLI_ENABLE_JPEGLI_LIBJPEG=OFF \
  -DJPEGLI_ENABLE_BENCHMARK=OFF \
  -DJPEGLI_ENABLE_FUZZERS=OFF \
  -DJPEGLI_ENABLE_JNI=OFF \
  -DJPEGLI_ENABLE_SJPEG=OFF \
  -DJPEGLI_ENABLE_OPENEXR=OFF \
  -DJPEGLI_ENABLE_DEVTOOLS=OFF \
  -DJPEGLI_ENABLE_DOXYGEN=OFF \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DGIF_LIBRARY="${BP}/opt/giflib/lib/libgif.a" \
  -DGIF_INCLUDE_DIR="${BP}/opt/giflib/include" \
  -DZLIB_LIBRARY="${SDK}/usr/lib/libz.tbd" \
  -DZLIB_INCLUDE_DIR="${SDK}/usr/include" \
  -DJPEG_LIBRARY="${BP}/opt/jpeg-turbo/lib/libjpeg.a" \
  -DJPEG_INCLUDE_DIR="${BP}/opt/jpeg-turbo/include" \
  -DPNG_LIBRARY="${BP}/opt/libpng/lib/libpng16.a" \
  -DPNG_PNG_INCLUDE_DIR="${BP}/opt/libpng/include/libpng16" \
  "${TEMP_DIR}/jpegli" >"${TEMP_DIR}/configure.log" 2>&1 || {
    tail -30 "${TEMP_DIR}/configure.log" >&2
    echo "cmake configure failed" >&2
    exit 1
  }

ninja cjpegli >"${TEMP_DIR}/ninja.log" 2>&1 || {
  tail -30 "${TEMP_DIR}/ninja.log" >&2
  echo "ninja cjpegli failed" >&2
  exit 1
}

BUILT="${build_dir}/tools/cjpegli"
if [ ! -x "${BUILT}" ]; then
  echo "no cjpegli produced at ${BUILT}" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"
cp "${BUILT}" "${OUT_DIR}/cjpegli"
chmod 755 "${OUT_DIR}/cjpegli"

echo "built: ${OUT_DIR}/cjpegli"
file "${OUT_DIR}/cjpegli"

# 自检：拿仓里现成的一张 PNG 真编一张 JPEG，并用包内的 jpegtran 验它是合法 JPEG
png="assets/icons/icon_original.png"
[ -f "${png}" ] || png=$(find assets images -name "*.png" -print -quit 2>/dev/null)
if [ -z "${png}" ] || [ ! -f "${png}" ]; then
  echo "找不到自检用的 PNG" >&2
  exit 1
fi
jpg="${TEMP_DIR}/probe.jpg"
"${OUT_DIR}/cjpegli" -q 80 "${png}" "${jpg}" || { echo "cjpegli 编码失败" >&2; exit 1; }
[ -s "${jpg}" ] || { echo "cjpegli 没产出 JPEG" >&2; exit 1; }
jpegtran_ok=0
if [ -x "${OUT_DIR}/jpegtran" ]; then
  "${OUT_DIR}/jpegtran" -outfile /dev/null "${jpg}" && jpegtran_ok=1
fi
echo "cjpegli produced $(wc -c <"${jpg}" | tr -d ' ') byte jpeg; jpegtran_accepts=${jpegtran_ok}"
otool -L "${OUT_DIR}/cjpegli" | head -8
