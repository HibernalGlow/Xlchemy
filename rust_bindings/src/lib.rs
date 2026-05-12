use pyo3::prelude::*;
use pyo3::types::PyBytes;
use std::path::Path;

#[pyclass(eq, eq_int)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Format {
    Jpeg,
    Png,
    WebP,
    Avif,
    Jxl,
    Qoi,
}

impl Format {
    fn to_core(self) -> slimg_core::Format {
        match self {
            Format::Jpeg => slimg_core::Format::Jpeg,
            Format::Png => slimg_core::Format::Png,
            Format::WebP => slimg_core::Format::WebP,
            Format::Avif => slimg_core::Format::Avif,
            Format::Jxl => slimg_core::Format::Jxl,
            Format::Qoi => slimg_core::Format::Qoi,
        }
    }

    fn from_core(format: slimg_core::Format) -> Self {
        match format {
            slimg_core::Format::Jpeg => Format::Jpeg,
            slimg_core::Format::Png => Format::Png,
            slimg_core::Format::WebP => Format::WebP,
            slimg_core::Format::Avif => Format::Avif,
            slimg_core::Format::Jxl => Format::Jxl,
            slimg_core::Format::Qoi => Format::Qoi,
        }
    }
}

#[pymethods]
impl Format {
    #[new]
    fn new() -> Self {
        Format::Jpeg
    }

    fn extension(&self) -> String {
        self.to_core().extension().to_string()
    }

    fn can_encode(&self) -> bool {
        self.to_core().can_encode()
    }

    fn __str__(&self) -> String {
        self.extension()
    }

    fn __repr__(&self) -> String {
        format!("Format::{}", match self {
            Format::Jpeg => "Jpeg",
            Format::Png => "Png",
            Format::WebP => "WebP",
            Format::Avif => "Avif",
            Format::Jxl => "Jxl",
            Format::Qoi => "Qoi",
        })
    }
}

#[pyclass]
#[derive(Debug, Clone)]
pub struct ImageData {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
}

impl ImageData {
    fn to_core(&self) -> slimg_core::ImageData {
        slimg_core::ImageData::new(self.width, self.height, self.data.clone())
    }

    fn from_core(img: slimg_core::ImageData) -> Self {
        Self {
            width: img.width,
            height: img.height,
            data: img.data,
        }
    }
}

#[pymethods]
impl ImageData {
    #[new]
    fn new(width: u32, height: u32, data: Vec<u8>) -> Self {
        Self { width, height, data }
    }

    #[getter]
    fn width(&self) -> u32 {
        self.width
    }

    #[getter]
    fn height(&self) -> u32 {
        self.height
    }

    #[getter]
    fn data<'py>(&self, py: Python<'py>) -> PyResult<Bound<'py, PyBytes>> {
        Ok(PyBytes::new(py, &self.data))
    }

    fn __repr__(&self) -> String {
        format!("ImageData(width={}, height={}, data_len={})", self.width, self.height, self.data.len())
    }
}

#[pyclass]
#[derive(Debug, Clone)]
pub struct DecodeResult {
    image: ImageData,
    format: Format,
}

#[pymethods]
impl DecodeResult {
    #[getter]
    fn image(&self) -> ImageData {
        self.image.clone()
    }

    #[getter]
    fn format(&self) -> Format {
        self.format
    }

    fn __repr__(&self) -> String {
        format!("DecodeResult(format={:?}, image={})", self.format, self.image.__repr__())
    }
}

#[pyclass]
#[derive(Debug, Clone)]
pub struct PipelineResult {
    data: Vec<u8>,
    format: Format,
    width: u32,
    height: u32,
}

#[pymethods]
impl PipelineResult {
    #[getter]
    fn data<'py>(&self, py: Python<'py>) -> PyResult<Bound<'py, PyBytes>> {
        Ok(PyBytes::new(py, &self.data))
    }

    #[getter]
    fn format(&self) -> Format {
        self.format
    }

    #[getter]
    fn width(&self) -> u32 {
        self.width
    }

    #[getter]
    fn height(&self) -> u32 {
        self.height
    }

    fn save(&self, path: &str) -> PyResult<()> {
        std::fs::write(path, &self.data)?;
        Ok(())
    }

    fn __repr__(&self) -> String {
        format!("PipelineResult(format={:?}, width={}, height={}, data_len={})", 
            self.format, self.width, self.height, self.data.len())
    }
}

#[pyclass]
#[derive(Debug, Clone)]
pub struct ResizeMode {
    mode: ResizeModeInner,
}

#[derive(Debug, Clone)]
enum ResizeModeInner {
    Width(u32),
    Height(u32),
    Exact(u32, u32),
    Fit(u32, u32),
    Scale(f64),
}

impl ResizeMode {
    fn to_core(&self) -> slimg_core::ResizeMode {
        match &self.mode {
            ResizeModeInner::Width(v) => slimg_core::ResizeMode::Width(*v),
            ResizeModeInner::Height(v) => slimg_core::ResizeMode::Height(*v),
            ResizeModeInner::Exact(w, h) => slimg_core::ResizeMode::Exact(*w, *h),
            ResizeModeInner::Fit(mw, mh) => slimg_core::ResizeMode::Fit(*mw, *mh),
            ResizeModeInner::Scale(f) => slimg_core::ResizeMode::Scale(*f),
        }
    }
}

#[pymethods]
impl ResizeMode {
    #[staticmethod]
    fn width(value: u32) -> Self {
        Self { mode: ResizeModeInner::Width(value) }
    }

    #[staticmethod]
    fn height(value: u32) -> Self {
        Self { mode: ResizeModeInner::Height(value) }
    }

    #[staticmethod]
    fn exact(width: u32, height: u32) -> Self {
        Self { mode: ResizeModeInner::Exact(width, height) }
    }

    #[staticmethod]
    fn fit(max_width: u32, max_height: u32) -> Self {
        Self { mode: ResizeModeInner::Fit(max_width, max_height) }
    }

    #[staticmethod]
    fn scale(factor: f64) -> Self {
        Self { mode: ResizeModeInner::Scale(factor) }
    }
}

#[pyclass]
#[derive(Debug, Clone)]
pub struct CropMode {
    mode: CropModeInner,
}

#[derive(Debug, Clone)]
enum CropModeInner {
    Region { x: u32, y: u32, width: u32, height: u32 },
    AspectRatio { width: u32, height: u32 },
}

impl CropMode {
    fn to_core(&self) -> slimg_core::CropMode {
        match &self.mode {
            CropModeInner::Region { x, y, width, height } => slimg_core::CropMode::Region {
                x: *x, y: *y, width: *width, height: *height,
            },
            CropModeInner::AspectRatio { width, height } => slimg_core::CropMode::AspectRatio {
                width: *width, height: *height,
            },
        }
    }
}

#[pymethods]
impl CropMode {
    #[staticmethod]
    fn region(x: u32, y: u32, width: u32, height: u32) -> Self {
        Self { mode: CropModeInner::Region { x, y, width, height } }
    }

    #[staticmethod]
    fn aspect_ratio(width: u32, height: u32) -> Self {
        Self { mode: CropModeInner::AspectRatio { width, height } }
    }
}

#[pyclass]
#[derive(Debug, Clone)]
pub struct ExtendMode {
    mode: ExtendModeInner,
}

#[derive(Debug, Clone)]
enum ExtendModeInner {
    AspectRatio { width: u32, height: u32 },
    Size { width: u32, height: u32 },
}

impl ExtendMode {
    fn to_core(&self) -> slimg_core::ExtendMode {
        match &self.mode {
            ExtendModeInner::AspectRatio { width, height } => slimg_core::ExtendMode::AspectRatio {
                width: *width, height: *height,
            },
            ExtendModeInner::Size { width, height } => slimg_core::ExtendMode::Size {
                width: *width, height: *height,
            },
        }
    }
}

#[pymethods]
impl ExtendMode {
    #[staticmethod]
    fn aspect_ratio(width: u32, height: u32) -> Self {
        Self { mode: ExtendModeInner::AspectRatio { width, height } }
    }

    #[staticmethod]
    fn size(width: u32, height: u32) -> Self {
        Self { mode: ExtendModeInner::Size { width, height } }
    }
}

#[pyclass]
#[derive(Debug, Clone)]
pub struct FillColor {
    color: FillColorInner,
}

#[derive(Debug, Clone)]
enum FillColorInner {
    Solid { r: u8, g: u8, b: u8, a: u8 },
    Transparent,
}

impl FillColor {
    fn to_core(&self) -> slimg_core::FillColor {
        match &self.color {
            FillColorInner::Solid { r, g, b, a } => slimg_core::FillColor::Solid([*r, *g, *b, *a]),
            FillColorInner::Transparent => slimg_core::FillColor::Transparent,
        }
    }
}

#[pymethods]
impl FillColor {
    #[staticmethod]
    fn solid(r: u8, g: u8, b: u8, a: u8) -> Self {
        Self { color: FillColorInner::Solid { r, g, b, a } }
    }

    #[staticmethod]
    fn transparent() -> Self {
        Self { color: FillColorInner::Transparent }
    }
}

#[pyclass]
#[derive(Debug, Clone)]
pub struct PipelineOptions {
    format: Format,
    quality: u8,
    resize: Option<ResizeMode>,
    crop: Option<CropMode>,
    extend: Option<ExtendMode>,
    fill_color: Option<FillColor>,
}

impl PipelineOptions {
    fn to_core(&self) -> slimg_core::PipelineOptions {
        slimg_core::PipelineOptions {
            format: self.format.to_core(),
            quality: self.quality,
            resize: self.resize.as_ref().map(|r| r.to_core()),
            crop: self.crop.as_ref().map(|c| c.to_core()),
            extend: self.extend.as_ref().map(|e| e.to_core()),
            fill_color: self.fill_color.as_ref().map(|f| f.to_core()),
        }
    }
}

#[pymethods]
impl PipelineOptions {
    #[new]
    #[pyo3(signature = (format, quality=80, resize=None, crop=None, extend=None, fill_color=None))]
    fn new(
        format: Format,
        quality: u8,
        resize: Option<ResizeMode>,
        crop: Option<CropMode>,
        extend: Option<ExtendMode>,
        fill_color: Option<FillColor>,
    ) -> Self {
        Self { format, quality, resize, crop, extend, fill_color }
    }

    #[getter]
    fn format(&self) -> Format {
        self.format
    }

    #[getter]
    fn quality(&self) -> u8 {
        self.quality
    }
}

fn map_error(e: slimg_core::Error) -> PyErr {
    PyErr::new::<pyo3::exceptions::PyRuntimeError, _>(format!("slimg error: {}", e))
}

#[pyfunction]
fn format_extension(format: Format) -> String {
    format.to_core().extension().to_string()
}

#[pyfunction]
fn format_can_encode(format: Format) -> bool {
    format.to_core().can_encode()
}

#[pyfunction]
fn format_from_extension(path: &str) -> Option<Format> {
    slimg_core::Format::from_extension(Path::new(path)).map(Format::from_core)
}

#[pyfunction]
fn format_from_magic_bytes(data: &[u8]) -> Option<Format> {
    slimg_core::Format::from_magic_bytes(data).map(Format::from_core)
}

#[pyfunction]
fn decode(data: &[u8]) -> PyResult<DecodeResult> {
    let (image, format) = slimg_core::decode(data).map_err(map_error)?;
    Ok(DecodeResult {
        image: ImageData::from_core(image),
        format: Format::from_core(format),
    })
}

#[pyfunction]
fn decode_file(path: &str) -> PyResult<DecodeResult> {
    let (image, format) = slimg_core::decode_file(Path::new(path)).map_err(map_error)?;
    Ok(DecodeResult {
        image: ImageData::from_core(image),
        format: Format::from_core(format),
    })
}

#[pyfunction]
fn convert(image: &ImageData, options: &PipelineOptions) -> PyResult<PipelineResult> {
    let result = slimg_core::convert(&image.to_core(), &options.to_core()).map_err(map_error)?;
    Ok(PipelineResult {
        data: result.data,
        format: Format::from_core(result.format),
        width: result.width,
        height: result.height,
    })
}

#[pyfunction]
fn crop(image: &ImageData, mode: &CropMode) -> PyResult<ImageData> {
    let result = slimg_core::crop::crop(&image.to_core(), &mode.to_core()).map_err(map_error)?;
    Ok(ImageData::from_core(result))
}

#[pyfunction]
fn extend(image: &ImageData, mode: &ExtendMode, fill: &FillColor) -> PyResult<ImageData> {
    let result = slimg_core::extend::extend(&image.to_core(), &mode.to_core(), &fill.to_core()).map_err(map_error)?;
    Ok(ImageData::from_core(result))
}

#[pyfunction]
fn resize(image: &ImageData, mode: &ResizeMode) -> PyResult<ImageData> {
    let result = slimg_core::resize::resize(&image.to_core(), &mode.to_core()).map_err(map_error)?;
    Ok(ImageData::from_core(result))
}

#[pyfunction]
fn optimize(data: &[u8], quality: u8) -> PyResult<PipelineResult> {
    let result = slimg_core::optimize(data, quality).map_err(map_error)?;
    Ok(PipelineResult {
        data: result.data,
        format: Format::from_core(result.format),
        width: result.width,
        height: result.height,
    })
}

#[pyfunction]
fn output_path(input: &str, format: Format, output: Option<&str>) -> String {
    let result = slimg_core::output_path(
        Path::new(input),
        format.to_core(),
        output.as_ref().map(|s| Path::new(s)),
    );
    result.to_string_lossy().to_string()
}

#[pymodule]
fn xlchemy_rust(_py: Python<'_>, m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_class::<Format>()?;
    m.add_class::<ImageData>()?;
    m.add_class::<DecodeResult>()?;
    m.add_class::<PipelineResult>()?;
    m.add_class::<ResizeMode>()?;
    m.add_class::<CropMode>()?;
    m.add_class::<ExtendMode>()?;
    m.add_class::<FillColor>()?;
    m.add_class::<PipelineOptions>()?;

    m.add_function(wrap_pyfunction!(format_extension, m)?)?;
    m.add_function(wrap_pyfunction!(format_can_encode, m)?)?;
    m.add_function(wrap_pyfunction!(format_from_extension, m)?)?;
    m.add_function(wrap_pyfunction!(format_from_magic_bytes, m)?)?;
    m.add_function(wrap_pyfunction!(decode, m)?)?;
    m.add_function(wrap_pyfunction!(decode_file, m)?)?;
    m.add_function(wrap_pyfunction!(convert, m)?)?;
    m.add_function(wrap_pyfunction!(crop, m)?)?;
    m.add_function(wrap_pyfunction!(extend, m)?)?;
    m.add_function(wrap_pyfunction!(resize, m)?)?;
    m.add_function(wrap_pyfunction!(optimize, m)?)?;
    m.add_function(wrap_pyfunction!(output_path, m)?)?;

    Ok(())
}
