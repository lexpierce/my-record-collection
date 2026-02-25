package ui

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	_ "image/gif"
	"image/jpeg"
	"image/png"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/charmbracelet/x/ansi"
	"github.com/charmbracelet/x/ansi/iterm2"
	"github.com/charmbracelet/x/ansi/kitty"
	"github.com/charmbracelet/x/ansi/sixel"
	"github.com/charmbracelet/x/mosaic"
)

type imageProto int

const (
	protoMosaic imageProto = iota
	protoKitty
	protoITerm2
	protoSixel
)

func (p imageProto) String() string {
	switch p {
	case protoKitty:
		return "kitty"
	case protoITerm2:
		return "iterm2"
	case protoSixel:
		return "sixel"
	default:
		return "mosaic"
	}
}

func detectImageProto() imageProto {
	term := os.Getenv("TERM_PROGRAM")
	termName := strings.ToLower(term)

	switch {
	case termName == "kitty" || termName == "ghostty":
		return protoKitty
	case strings.Contains(termName, "iterm") || strings.Contains(termName, "wezterm"):
		return protoITerm2
	}

	termVal := strings.ToLower(os.Getenv("TERM"))
	if strings.Contains(termVal, "xterm-kitty") || strings.Contains(termVal, "xterm-ghostty") {
		return protoKitty
	}

	if os.Getenv("KITTY_WINDOW_ID") != "" {
		return protoKitty
	}

	return protoMosaic
}

type imageCache struct {
	cache map[string]string
}

func newImageCache() *imageCache {
	return &imageCache{
		cache: make(map[string]string),
	}
}

func (c *imageCache) get(url string) (string, bool) {
	v, ok := c.cache[url]
	return v, ok
}

func (c *imageCache) set(url string, rendered string) {
	c.cache[url] = rendered
}

func fetchImage(url string) (image.Image, []byte, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	var buf bytes.Buffer
	_, _ = buf.ReadFrom(resp.Body)
	raw := buf.Bytes()

	ct := resp.Header.Get("Content-Type")
	var img image.Image

	reader := bytes.NewReader(raw)
	switch {
	case strings.Contains(ct, "jpeg"), strings.Contains(ct, "jpg"):
		img, err = jpeg.Decode(reader)
	case strings.Contains(ct, "png"):
		img, err = png.Decode(reader)
	default:
		img, _, err = image.Decode(reader)
	}
	if err != nil {
		return nil, nil, err
	}

	return img, raw, nil
}

func renderImage(proto imageProto, img image.Image, raw []byte, width, height int) string {
	switch proto {
	case protoKitty:
		return renderKitty(img)
	case protoITerm2:
		return renderITerm2(raw, width, height)
	case protoSixel:
		return renderSixel(img)
	default:
		return renderMosaic(img, width, height)
	}
}

func renderMosaic(img image.Image, width, height int) string {
	m := mosaic.New().Width(width).Height(height)
	return m.Render(img)
}

func renderKitty(img image.Image) string {
	bounds := img.Bounds()
	var buf bytes.Buffer
	if err := kitty.EncodeGraphics(&buf, img, &kitty.Options{
		Action:       kitty.TransmitAndPut,
		Transmission: kitty.Direct,
		Format:       kitty.RGBA,
		ImageWidth:   bounds.Dx(),
		ImageHeight:  bounds.Dy(),
		Chunk:        true,
		Quite:        2,
	}); err != nil {
		return ""
	}
	return buf.String()
}

func renderITerm2(raw []byte, width, height int) string {
	b64 := base64.StdEncoding.EncodeToString(raw)
	return ansi.ITerm2(iterm2.File{
		Name:    "cover.jpg",
		Width:   iterm2.Cells(width),
		Height:  iterm2.Cells(height),
		Content: []byte(b64),
		Inline:  true,
	})
}

func renderSixel(img image.Image) string {
	var enc sixel.Encoder
	var buf bytes.Buffer
	if err := enc.Encode(&buf, img); err != nil {
		return ""
	}
	return ansi.SixelGraphics(0, 1, 0, buf.Bytes())
}

func fetchAndRender(proto imageProto, url string, width, height int) (string, error) {
	if url == "" {
		return renderPlaceholder(width, height), nil
	}

	img, raw, err := fetchImage(url)
	if err != nil {
		return renderPlaceholder(width, height), nil
	}

	rendered := renderImage(proto, img, raw, width, height)
	if rendered == "" {
		return renderPlaceholder(width, height), nil
	}
	return rendered, nil
}

func renderPlaceholder(width, height int) string {
	top := "┌" + strings.Repeat("─", width-2) + "┐"
	mid := "│" + strings.Repeat(" ", width-2) + "│"
	bot := "└" + strings.Repeat("─", width-2) + "┘"

	labelLine := fmt.Sprintf("│%s│", centerText("No Image", width-2))

	var lines []string
	lines = append(lines, top)
	midCount := height - 2
	labelPos := midCount / 2
	for i := range midCount {
		if i == labelPos {
			lines = append(lines, labelLine)
		} else {
			lines = append(lines, mid)
		}
	}
	lines = append(lines, bot)
	return strings.Join(lines, "\n")
}

func centerText(s string, width int) string {
	if len(s) >= width {
		return s[:width]
	}
	pad := (width - len(s)) / 2
	return strings.Repeat(" ", pad) + s + strings.Repeat(" ", width-len(s)-pad)
}
