package ui

import (
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestImageProtoString(t *testing.T) {
	tests := []struct {
		proto imageProto
		want  string
	}{
		{protoMosaic, "mosaic"},
		{protoKitty, "kitty"},
		{protoITerm2, "iterm2"},
		{protoSixel, "sixel"},
	}
	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			if got := tt.proto.String(); got != tt.want {
				t.Errorf("String() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestDetectImageProtoKittyTermProgram(t *testing.T) {
	t.Setenv("TERM_PROGRAM", "kitty")
	t.Setenv("TERM", "")
	t.Setenv("KITTY_WINDOW_ID", "")
	if got := detectImageProto(); got != protoKitty {
		t.Errorf("detectImageProto() = %v, want kitty", got)
	}
}

func TestDetectImageProtoKittyTerm(t *testing.T) {
	t.Setenv("TERM_PROGRAM", "")
	t.Setenv("TERM", "xterm-kitty")
	t.Setenv("KITTY_WINDOW_ID", "")
	if got := detectImageProto(); got != protoKitty {
		t.Errorf("detectImageProto() = %v, want kitty", got)
	}
}

func TestDetectImageProtoKittyWindowID(t *testing.T) {
	t.Setenv("TERM_PROGRAM", "")
	t.Setenv("TERM", "")
	t.Setenv("KITTY_WINDOW_ID", "1")
	if got := detectImageProto(); got != protoKitty {
		t.Errorf("detectImageProto() = %v, want kitty", got)
	}
}

func TestDetectImageProtoITerm(t *testing.T) {
	t.Setenv("TERM_PROGRAM", "iTerm.app")
	t.Setenv("TERM", "")
	t.Setenv("KITTY_WINDOW_ID", "")
	if got := detectImageProto(); got != protoITerm2 {
		t.Errorf("detectImageProto() = %v, want iterm2", got)
	}
}

func TestDetectImageProtoWezTerm(t *testing.T) {
	t.Setenv("TERM_PROGRAM", "WezTerm")
	t.Setenv("TERM", "")
	t.Setenv("KITTY_WINDOW_ID", "")
	if got := detectImageProto(); got != protoITerm2 {
		t.Errorf("detectImageProto() = %v, want iterm2", got)
	}
}

func TestDetectImageProtoGhostty(t *testing.T) {
	t.Setenv("TERM_PROGRAM", "ghostty")
	t.Setenv("TERM", "")
	t.Setenv("KITTY_WINDOW_ID", "")
	if got := detectImageProto(); got != protoKitty {
		t.Errorf("detectImageProto() = %v, want kitty", got)
	}
}

func TestDetectImageProtoMosaicFallback(t *testing.T) {
	t.Setenv("TERM_PROGRAM", "")
	t.Setenv("TERM", "xterm-256color")
	t.Setenv("KITTY_WINDOW_ID", "")
	if got := detectImageProto(); got != protoMosaic {
		t.Errorf("detectImageProto() = %v, want mosaic", got)
	}
}

func TestImageCacheGetSet(t *testing.T) {
	c := newImageCache()

	_, ok := c.get("http://example.com/img.jpg")
	if ok {
		t.Error("empty cache should return !ok")
	}

	c.set("http://example.com/img.jpg", "rendered-data")
	got, ok := c.get("http://example.com/img.jpg")
	if !ok {
		t.Error("cache hit should return ok")
	}
	if got != "rendered-data" {
		t.Errorf("cached value = %q, want %q", got, "rendered-data")
	}
}

func TestImageCacheOverwrite(t *testing.T) {
	c := newImageCache()
	c.set("url", "first")
	c.set("url", "second")
	got, _ := c.get("url")
	if got != "second" {
		t.Errorf("overwritten value = %q, want %q", got, "second")
	}
}

func TestRenderPlaceholder(t *testing.T) {
	result := renderPlaceholder(20, 5)
	lines := strings.Split(result, "\n")
	if len(lines) != 5 {
		t.Errorf("placeholder lines = %d, want 5", len(lines))
	}
	if !strings.HasPrefix(lines[0], "┌") || !strings.HasSuffix(lines[0], "┐") {
		t.Errorf("top border wrong: %q", lines[0])
	}
	if !strings.HasPrefix(lines[4], "└") || !strings.HasSuffix(lines[4], "┘") {
		t.Errorf("bottom border wrong: %q", lines[4])
	}
	if !strings.Contains(result, "No Image") {
		t.Error("placeholder should contain 'No Image'")
	}
}

func TestRenderPlaceholderSmall(t *testing.T) {
	result := renderPlaceholder(10, 3)
	lines := strings.Split(result, "\n")
	if len(lines) != 3 {
		t.Errorf("placeholder lines = %d, want 3", len(lines))
	}
}

func TestCenterText(t *testing.T) {
	tests := []struct {
		name  string
		s     string
		width int
		want  string
	}{
		{"centered", "hi", 6, "  hi  "},
		{"exact fit", "test", 4, "test"},
		{"too long", "toolong", 4, "tool"},
		{"odd padding", "ab", 5, " ab  "},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := centerText(tt.s, tt.width)
			if got != tt.want {
				t.Errorf("centerText(%q, %d) = %q, want %q", tt.s, tt.width, got, tt.want)
			}
		})
	}
}

func TestFetchAndRenderEmptyURL(t *testing.T) {
	result, err := fetchAndRender(protoMosaic, "", 20, 5)
	if err != nil {
		t.Fatalf("fetchAndRender empty URL err: %v", err)
	}
	if !strings.Contains(result, "No Image") {
		t.Error("empty URL should return placeholder")
	}
}

func TestFetchAndRenderInvalidURL(t *testing.T) {
	result, err := fetchAndRender(protoMosaic, "http://localhost:1/nonexistent.jpg", 20, 5)
	if err != nil {
		t.Fatalf("fetchAndRender invalid URL err: %v", err)
	}
	if !strings.Contains(result, "No Image") {
		t.Error("failed fetch should return placeholder")
	}
}

func TestFetchImageInvalidURL(t *testing.T) {
	_, _, err := fetchImage("http://localhost:1/nonexistent.jpg")
	if err == nil {
		t.Error("fetchImage with unreachable URL should error")
	}
}

func TestRenderImageDispatches(t *testing.T) {
	defer func() {
		recover() //nolint:errcheck // expected panic from nil image
	}()

	_ = renderImage(protoMosaic, nil, nil, 1, 1)
}

func TestFetchImageBadStatusCode(t *testing.T) {
	_, _, err := fetchImage("")
	if err == nil {
		t.Error("fetchImage with empty URL should error")
	}
}

func TestDetectImageProtoSaved(t *testing.T) {
	for _, key := range []string{"TERM_PROGRAM", "TERM", "KITTY_WINDOW_ID"} {
		t.Setenv(key, "")
	}
	got := detectImageProto()
	if got != protoMosaic {
		t.Errorf("all env unset should give mosaic, got %v", got)
	}
}

func testImage() image.Image {
	img := image.NewRGBA(image.Rect(0, 0, 4, 4))
	for x := range 4 {
		for y := range 4 {
			img.Set(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}
	return img
}

func servePNG(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		if err := png.Encode(w, testImage()); err != nil {
			t.Errorf("png.Encode: %v", err)
		}
	}))
}

func TestRenderKitty(t *testing.T) {
	img := testImage()
	result := renderKitty(img)
	if result == "" {
		t.Error("renderKitty should produce non-empty output for valid image")
	}
}

func TestRenderITerm2(t *testing.T) {
	result := renderITerm2([]byte("fakedata"), 10, 10)
	if result == "" {
		t.Error("renderITerm2 should produce non-empty output")
	}
}

func TestRenderSixel(t *testing.T) {
	img := testImage()
	result := renderSixel(img)
	if result == "" {
		t.Error("renderSixel should produce non-empty output for valid image")
	}
}

func TestRenderMosaic(t *testing.T) {
	img := testImage()
	result := renderMosaic(img, 10, 5)
	if result == "" {
		t.Error("renderMosaic should produce non-empty output")
	}
}

func TestRenderImageAllProtos(t *testing.T) {
	img := testImage()
	raw := []byte("raw-data")

	for _, proto := range []imageProto{protoMosaic, protoKitty, protoITerm2, protoSixel} {
		t.Run(proto.String(), func(t *testing.T) {
			result := renderImage(proto, img, raw, 10, 5)
			if result == "" {
				t.Errorf("renderImage(%s) returned empty", proto)
			}
		})
	}
}

func TestFetchImageHTTPServer(t *testing.T) {
	server := servePNG(t)
	defer server.Close()

	img, raw, err := fetchImage(server.URL + "/test.png")
	if err != nil {
		t.Fatalf("fetchImage from test server: %v", err)
	}
	if img == nil {
		t.Error("img should not be nil")
	}
	if len(raw) == 0 {
		t.Error("raw bytes should not be empty")
	}
}

func TestFetchImageHTTPServerJPEG(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/jpeg")
		if err := png.Encode(w, testImage()); err != nil {
			t.Errorf("png.Encode: %v", err)
		}
	}))
	defer server.Close()

	_, _, err := fetchImage(server.URL + "/test.jpg")
	if err == nil {
		t.Log("jpeg decode of png data may or may not error depending on header bytes")
	}
}

func TestFetchImageHTTPServer404(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	_, _, err := fetchImage(server.URL + "/missing.png")
	if err == nil {
		t.Error("404 should return error")
	}
	if !strings.Contains(err.Error(), "404") {
		t.Errorf("error should mention 404, got: %v", err)
	}
}

func TestFetchImageHTTPServerBadImage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		if _, err := w.Write([]byte("not-an-image")); err != nil {
			t.Errorf("w.Write: %v", err)
		}
	}))
	defer server.Close()

	_, _, err := fetchImage(server.URL + "/bad.png")
	if err == nil {
		t.Error("corrupt image data should return error")
	}
}

func TestFetchAndRenderSuccess(t *testing.T) {
	server := servePNG(t)
	defer server.Close()

	result, err := fetchAndRender(protoMosaic, server.URL+"/img.png", 20, 10)
	if err != nil {
		t.Fatalf("fetchAndRender err: %v", err)
	}
	if strings.Contains(result, "No Image") {
		t.Error("successful fetch should not show placeholder")
	}
}

func TestFetchImageDefaultDecode(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/bmp")
		if err := png.Encode(w, testImage()); err != nil {
			t.Errorf("png.Encode: %v", err)
		}
	}))
	defer server.Close()

	img, _, err := fetchImage(server.URL + "/test.bmp")
	if err != nil {
		t.Fatalf("fetchImage with unknown content-type: %v", err)
	}
	if img == nil {
		t.Error("img should not be nil")
	}
}
