package main

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLocalPreviewMiddlewareServesImage(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	imagePath := filepath.Join(tempDir, "sample.png")
	imageData, err := base64.StdEncoding.DecodeString("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0fcAAAAASUVORK5CYII=")
	if err != nil {
		t.Fatalf("decode png: %v", err)
	}
	if err := os.WriteFile(imagePath, imageData, 0o644); err != nil {
		t.Fatalf("write png: %v", err)
	}

	handler := localPreviewMiddleware(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		http.NotFound(rw, req)
	}))

	req := httptest.NewRequest(http.MethodGet, localPreviewRoute+"?path="+url.QueryEscape(imagePath), nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Content-Type"); !strings.HasPrefix(got, "image/png") {
		t.Fatalf("expected image/png content type, got %q", got)
	}
	if rec.Body.Len() != len(imageData) {
		t.Fatalf("expected %d bytes, got %d", len(imageData), rec.Body.Len())
	}
}

func TestLocalPreviewMiddlewareDelegatesOtherRoutes(t *testing.T) {
	t.Parallel()

	handler := localPreviewMiddleware(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		rw.WriteHeader(http.StatusTeapot)
		_, _ = rw.Write([]byte("fallback"))
	}))

	req := httptest.NewRequest(http.MethodGet, "/not-preview", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusTeapot {
		t.Fatalf("expected fallback status, got %d", rec.Code)
	}
	if body := rec.Body.String(); body != "fallback" {
		t.Fatalf("expected fallback body, got %q", body)
	}
}

func TestLocalPreviewMiddlewareRejectsRelativePath(t *testing.T) {
	t.Parallel()

	handler := localPreviewMiddleware(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		http.NotFound(rw, req)
	}))

	req := httptest.NewRequest(http.MethodGet, localPreviewRoute+"?path=relative.png", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestLocalPreviewMiddlewareRejectsUnsupportedExtension(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	textPath := filepath.Join(tempDir, "note.txt")
	if err := os.WriteFile(textPath, []byte("hello"), 0o644); err != nil {
		t.Fatalf("write text: %v", err)
	}

	handler := localPreviewMiddleware(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		http.NotFound(rw, req)
	}))

	req := httptest.NewRequest(http.MethodGet, localPreviewRoute+"?path="+url.QueryEscape(textPath), nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("expected 415, got %d", rec.Code)
	}
}
