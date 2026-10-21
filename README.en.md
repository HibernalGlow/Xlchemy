<p align="center">
  <img src="./assets/icons/logo.svg" width="64" alt="Xlchemy logo: letter X in a dark rounded square">
</p>

<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="Xlchemy: a desktop batch converter that shrinks images to JPEG XL / AVIF / WebP / JPEG / PNG; the right side shows the app UI with before/after size cards">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Windows-10%20%2F%2011-0078D4?logo=windows&logoColor=white&style=flat-square" alt="Windows 10 / 11"/>
  <img src="https://img.shields.io/badge/Linux-Ubuntu--based-FCC622?logo=linux&logoColor=black&style=flat-square" alt="Ubuntu-based Linux"/>
  <img src="https://img.shields.io/badge/macOS-Apple%20Silicon-000000?logo=apple&logoColor=white&style=flat-square" alt="macOS Apple Silicon"/>
  <img src="https://img.shields.io/badge/Python-3.12%20%C2%B7%203.13-3776AB?logo=python&logoColor=white&style=flat-square" alt="Python 3.12 or 3.13"/>
  <img src="https://img.shields.io/badge/UI-PySide6%20%2B%20Fluent-41CD52?logo=qt&logoColor=black&style=flat-square" alt="PySide6 with Fluent shell"/>
  <img src="https://img.shields.io/badge/Rust-pyo3%20bindings-DEA584?logo=rust&logoColor=white&style=flat-square" alt="Rust pyo3 bindings"/>
  <img src="https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square" alt="GPL-3.0"/>
  <img src="https://img.shields.io/badge/upstream-XL%20Converter%20v1.3.0-informational?style=flat-square" alt="Based on XL Converter v1.3.0"/>
</p>

<p align="center">
  <a href="README.md"><b>中文</b></a> · <b>English</b> · <a href="https://xl-docs.codepoems.eu">Manual</a>
</p>

---



A batch image converter in one window: drop in photos and screenshots, pick a format, and get **JPEG XL / AVIF / WebP / JPEG / PNG** — or a **reversible lossless** shrink. It drives the real encoders (`cjxl`, `cjpegli`, `avifenc`, ImageMagick, Oxipng, `jpegtran`) instead of reimplementing them, and it is a fork of [XL Converter](https://github.com/JacobDev1/xl-converter) based on upstream `stable` **v1.3.0**.

### What the fork adds

| Addition | Detail |
| --- | --- |
| **Fluent UI shell** | A closable seam on `PySide6-Fluent-Widgets`; Miku / Ralsei / Dark Amber / Light Amber themes plus an optional follow-system light/dark switch |
| **Classic shell kept** | `XLCHEMY_UI=classic` restores the upstream interface shown in the hero image above |
| **Rust bindings** | `xlchemy_rust` (pyo3) handles conversion, optimization and image-info decoding |
| **macOS builds** | `.app` and `.dmg` (Apple Silicon arm64 by default; `XL_MAC_UNIVERSAL2=1` for universal2), with dylib staging scripts |
| **Simplified Chinese UI** | `zh_CN` catalog behind a verifiable i18n seam (`task i18n:check`) |
| **Taskfile + uv workflow** | One command to create the environment, build the extension and run tests |

### Mechanism

<p align="center">
  <img src="./assets/readme/pipeline.svg" width="100%" alt="Xlchemy transcoding pipeline: inputs are dispatched to the selected external encoders, Rust bindings handle conversion, optimization and image-info decoding, producing five formats plus four policy-driven specialized modes."
</p>

The pipeline diagram is the short version: encoders run in parallel with thread caps derived from **physical** cores; a memory-pressure rule can drop concurrent encoders to 1 or a chosen fraction once an image exceeds a megapixel threshold; ExifTool carries metadata across; and lossless JPEG transcoding re-quantizes no pixels, so it stays reversible.

### Features

- **JPEGli** — fully compatible JPEGs with up to [35% better compression ratio](https://opensource.googleblog.com/2024/04/introducing-jpegli-new-jpeg-coding-library.html).
- **Modern formats** — JPEG XL and AVIF for the deepest cuts; WebP, JPEG and PNG also supported.
- **Lossless JPEG transcoding** — 16%–22% smaller, reversible.
- **Downscaling** — by resolution, percent, shortest/longest side, or megapixels.
- **PNG optimization mode** — lossless Oxipng pass, adjustable effort, in-place option.
- **Specialized modes** — Lossless JPEG Transcoding, JPEG Reconstruction, Smallest Lossless (picks the smallest lossless result among PNG / WebP / JPEG XL).
- **Process priority, presets, conflict policies** — yield CPU, save settings, handle name collisions, optionally move originals to trash.

Per-encoder input acceptance is listed in [支持的格式](README.md#支持的格式) (Chinese).

### Quick start

```bash
git clone https://github.com/HibernalGlow/Xlchemy.git
cd Xlchemy
task setup   # environment → dependencies → Rust extension → self-check
task run     # launch
task test    # unit tests; pass through args: task test -- -k theme
```

External encoders are compiled separately with `make deps`; bundled releases ship them. Full Windows, Linux and macOS source-build steps and the test commands are in the collapsible sections of [README.md](README.md#快速开始) (Chinese).

### License

GNU General Public License v3, inherited from upstream XL Converter — see [LICENSE.txt](LICENSE.txt). Third-party notices live in [LICENSE_3RD_PARTY.txt](LICENSE_3RD_PARTY.txt). Please read [CONTRIBUTING.md](.github/CONTRIBUTING.md) before opening issues or pull requests.
