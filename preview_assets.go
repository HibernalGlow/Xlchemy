package main

import (
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const localPreviewRoute = "/local-preview"

func localPreviewMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		if req.URL.Path != localPreviewRoute {
			next.ServeHTTP(rw, req)
			return
		}

		serveLocalPreview(rw, req)
	})
}

func serveLocalPreview(rw http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet && req.Method != http.MethodHead {
		http.Error(rw, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	path := strings.TrimSpace(req.URL.Query().Get("path"))
	if path == "" {
		http.Error(rw, "missing path", http.StatusBadRequest)
		return
	}

	path = filepath.Clean(path)
	if !filepath.IsAbs(path) {
		http.Error(rw, "path must be absolute", http.StatusBadRequest)
		return
	}

	ext := strings.TrimPrefix(strings.ToLower(filepath.Ext(path)), ".")
	if !IsAllowedInput(ext) {
		http.Error(rw, "unsupported preview format", http.StatusUnsupportedMediaType)
		return
	}

	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			http.NotFound(rw, req)
			return
		}
		http.Error(rw, "failed to stat file", http.StatusInternalServerError)
		return
	}
	if info.IsDir() {
		http.Error(rw, "path must be a file", http.StatusBadRequest)
		return
	}

	file, err := os.Open(path)
	if err != nil {
		http.Error(rw, "failed to open file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	contentType := mime.TypeByExtension(filepath.Ext(path))
	if contentType == "" {
		header := make([]byte, 512)
		n, _ := file.Read(header)
		contentType = http.DetectContentType(header[:n])
		_, _ = file.Seek(0, io.SeekStart)
	}
	if contentType != "" {
		rw.Header().Set("Content-Type", contentType)
	}
	rw.Header().Set("Cache-Control", "private, max-age=300")

	http.ServeContent(rw, req, filepath.Base(path), info.ModTime(), file)
}
