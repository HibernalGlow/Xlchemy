# slimg 编译脚本
# 用法: .\build_slimg.ps1

param(
    [switch]$Clean = $false
)

$ErrorActionPreference = "Stop"

$ProjectRoot = "D:\1VSCODE\Projects\ImageAll\Xlchemy"
$SlimgSrc = "$ProjectRoot\ref\slimg"
$PrebuiltDav1d = "$ProjectRoot\prebuilt\dav1d"
$LibjxlPath = "D:\scoop\apps\libjxl\current"

Write-Host "=== slimg 编译脚本 ===" -ForegroundColor Cyan

# 检查依赖
Write-Host "检查依赖..." -ForegroundColor Yellow

if (-not (Test-Path "$LibjxlPath\lib\jxl.lib")) {
    Write-Error "libjxl 未安装。请运行: scoop install libjxl"
    exit 1
}

if (-not (Test-Path "$PrebuiltDav1d\lib\dav1d.lib")) {
    Write-Error "dav1d 预编译库不存在: $PrebuiltDav1d"
    exit 1
}

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Error "Rust/cargo 未安装"
    exit 1
}

# 清理（可选）
if ($Clean) {
    Write-Host "清理旧编译文件..." -ForegroundColor Yellow
    Remove-Item "$SlimgSrc\target\release\slimg_cffi.dll" -ErrorAction SilentlyContinue
    Remove-Item "$SlimgSrc\target\release\slimg_cffi.lib" -ErrorAction SilentlyContinue
    cargo clean --manifest-path "$SlimgSrc\Cargo.toml" -p slimg-cffi 2>$null
}

# 设置环境变量
Write-Host "设置编译环境..." -ForegroundColor Yellow
$env:PKG_CONFIG_PATH = "$LibjxlPath\lib\pkgconfig;$PrebuiltDav1d\lib\pkgconfig"

# 编译 slimg-cffi
Write-Host "编译 slimg-cffi DLL..." -ForegroundColor Yellow
Push-Location $SlimgSrc
cargo build --release -p slimg-cffi
Pop-Location

if (-not (Test-Path "$SlimgSrc\target\release\slimg_cffi.dll")) {
    Write-Error "slimg_cffi.dll 编译失败"
    exit 1
}

# 复制 DLL 文件
Write-Host "复制 DLL 文件..." -ForegroundColor Yellow
Copy-Item "$SlimgSrc\target\release\slimg_cffi.dll" -Destination "$ProjectRoot\slimg_cffi.dll" -Force
Copy-Item "$PrebuiltDav1d\bin\dav1d.dll" -Destination "$ProjectRoot\dav1d.dll" -Force

# 编译 Go 程序
Write-Host "编译 Go 程序..." -ForegroundColor Yellow
Push-Location $ProjectRoot
go build -o xlchemy.exe .
Pop-Location

Write-Host "=== 编译完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "输出文件:" -ForegroundColor Cyan
Write-Host "  - $ProjectRoot\xlchemy.exe"
Write-Host "  - $ProjectRoot\slimg_cffi.dll"
Write-Host "  - $ProjectRoot\dav1d.dll"
Write-Host ""
Write-Host "运行时需要这三个文件在同一目录。" -ForegroundColor Yellow