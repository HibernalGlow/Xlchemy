/* slimg C FFI header — generated manually to match lib.rs */
#ifndef SLIMG_CFFI_H
#define SLIMG_CFFI_H

#include <stdint.h>
#include <stddef.h>

/* Result buffer from decode/convert operations */
typedef struct {
    uint8_t *data;
    size_t   len;
    uint32_t width;
    uint32_t height;
    int32_t  format; /* 0=Jpeg, 1=Png, 2=WebP, 3=Avif, 4=Jxl, 5=Qoi, -1=error */
} SlimgBuffer;

/* Returns last error message (caller must free with slimg_free_string) */
const char *slimg_last_error(void);

/* Frees a string returned by slimg_last_error */
void slimg_free_string(char *ptr);

/* Decodes an image file to RGBA pixels. Free result with slimg_free_buffer. */
SlimgBuffer slimg_decode_file(const char *path);

/* Converts RGBA pixels to target format. Free result with slimg_free_buffer. */
SlimgBuffer slimg_convert(const uint8_t *data, size_t data_len,
                           uint32_t width, uint32_t height,
                           int32_t format, uint8_t quality);

/* Frees a SlimgBuffer returned by decode/convert functions */
void slimg_free_buffer(SlimgBuffer buf);

/* Writes format extension string to out_buf. Returns bytes written or -1. */
int32_t slimg_format_extension(int32_t format, char *out_buf, size_t out_buf_len);

/* Returns 1 if format supports encoding, 0 otherwise */
int32_t slimg_format_can_encode(int32_t format);

#endif /* SLIMG_CFFI_H */
