# slimg 编码器集成说明

## 概述

slimg 是一个高性能图像编码库，支持 JPEG XL (JXL) 和 AVIF 格式。本文档记录了将 slimg 集成到 Xlchemy 的过程和关键注意事项。

## 架构设计

由于 Go 的 CGO 与 MSVC 不兼容，我们采用 **DLL 动态加载** 方式：

```
Go (syscall/LazyDLL) → slimg_cffi.dll → slimg-core (Rust)
```

### 关键设计决策

1. **DLL 方式而非静态链接**：Go 的 CGO 默认使用 MinGW GCC，而 slimg 依赖库（libjxl、dav1d）是 MSVC 编译的，静态链接会导致 ABI 不兼容。

2. **指针返回而非结构体返回**：Go 的 syscall 无法正确处理 C 函数按值返回的结构体，必须返回指针。

## 文件结构

```
Xlchemy/
├── slimg_dll.go          # Go DLL wrapper (syscall 方式)
├── slimg_avif.go         # slimg AVIF 转换实现 (CGO 方式，备用)
├── slimg_avif_stub.go    # 非 slimg 构建时的 stub
├── slimg_cffi.dll        # slimg C FFI DLL (运行时需要)
├── dav1d.dll             # dav1d 解码器 (运行时需要)
├── ref/slimg/            # slimg 源代码
│   └── crates/slimg-cffi/
│       ├── src/lib.rs    # C FFI 实现
│       └── slimg_cffi.h  # C 头文件
└── prebuilt/dav1d/       # 预编译的 dav1d 库
```

## 编译步骤

### 1. 编译 slimg DLL

需要预先安装：
- Rust (msvc target)
- Visual Studio Build Tools
- libjxl (scoop install libjxl)

```powershell
# 设置环境变量
$env:PKG_CONFIG_PATH = "D:\scoop\apps\libjxl\current\lib\pkgconfig;D:\1VSCODE\Projects\ImageAll\Xlchemy\prebuilt\dav1d\lib\pkgconfig"

# 编译 slimg-cffi
cd ref\slimg
cargo build --release -p slimg-cffi
```

### 2. 复制 DLL 文件

```powershell
Copy-Item "ref\slimg\target\release\slimg_cffi.dll" -Destination "." -Force
Copy-Item "prebuilt\dav1d\bin\dav1d.dll" -Destination "." -Force
```

### 3. 编译 Go 程序

```powershell
go build -o xlchemy.exe .
```

## 关键注意事项

### 1. C FFI 函数签名

**错误做法**（会导致 Go 程序闪退）：
```rust
// 返回结构体 - Go syscall 无法正确处理
pub extern "C" fn slimg_decode_file(path: *const c_char) -> SlimgBuffer
```

**正确做法**：
```rust
// 返回指针 - Go syscall 可以正确处理
pub extern "C" fn slimg_decode_file(path: *const c_char) -> *mut SlimgBuffer

// 必须提供指针释放函数
pub extern "C" fn slimg_free_buffer_ptr(ptr: *mut SlimgBuffer)
```

### 2. Go syscall 调用

```go
// 正确的调用方式
ret, _, _ := procDecodeFile.Call(uintptr(unsafe.Pointer(&pathBytes[0])))
if ret == 0 {
    return nil, fmt.Errorf("slimg decode: %s", slimgLastError())
}
buf := (*slimgBuffer)(unsafe.Pointer(ret))
// 使用后必须释放
procFreeBufferPtr.Call(ret)
```

### 3. 路径字符串传递

```go
// 正确方式：转换为 UTF-8 字节并添加 null 终止符
pathBytes := append([]byte(path), 0)
```

### 4. 结构体对齐

Go 和 Rust 的结构体必须完全匹配：

```go
// Go
type slimgBuffer struct {
    data   *uint8    // 8 bytes (pointer)
    len    uint64    // 8 bytes
    width  uint32    // 4 bytes
    height uint32    // 4 bytes
    format int32     // 4 bytes
}
// 总大小：32 bytes（含 padding）
```

```rust
// Rust
#[repr(C)]
pub struct SlimgBuffer {
    pub data: *mut u8,     // 8 bytes
    pub len: usize,        // 8 bytes
    pub width: u32,        // 4 bytes
    pub height: u32,       // 4 bytes
    pub format: i32,       // 4 bytes
}
```

## 运行时依赖

程序运行时需要以下 DLL 文件在同一目录：
- `xlchemy.exe`
- `slimg_cffi.dll`
- `dav1d.dll`

## 故障排除

### 问题：程序闪退

**原因**：DLL 函数返回结构体而非指针

**解决**：修改 Rust 函数返回 `*mut SlimgBuffer`，添加 `slimg_free_buffer_ptr`

### 问题：invalid utf-8 sequence

**原因**：路径字符串传递方式错误

**解决**：使用 `append([]byte(path), 0)` 创建 null 终止的 UTF-8 字节序列

### 问题：链接失败 (undefined reference)

**原因**：MinGW GCC 与 MSVC 库 ABI 不兼容

**解决**：使用 DLL 动态加载而非静态链接

## 参考资料

- slimg 源码：`ref/slimg/`
- libjxl 文档：https://github.com/libjxl/libjxl
- Go syscall 文档：https://pkg.go.dev/syscall