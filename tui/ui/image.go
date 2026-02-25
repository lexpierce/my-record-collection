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

type cachedImage struct {
	render   string
	transmit string
}

type imageCache struct {
	cache map[string]cachedImage
}

func newImageCache() *imageCache {
	return &imageCache{
		cache: make(map[string]cachedImage),
	}
}

func (c *imageCache) get(url string) (cachedImage, bool) {
	v, ok := c.cache[url]
	return v, ok
}

func (c *imageCache) set(url string, entry cachedImage) {
	c.cache[url] = entry
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

type kittyResult struct {
	transmit    string
	placeholder string
}

var kittyImageIDCounter int

func renderImage(proto imageProto, img image.Image, raw []byte, width, height int) string {
	switch proto {
	case protoKitty:
		return renderKitty(img).placeholder
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

func renderKitty(img image.Image) kittyResult {
	kittyImageIDCounter++
	imgID := kittyImageIDCounter

	bounds := img.Bounds()
	var buf bytes.Buffer
	if err := kitty.EncodeGraphics(&buf, img, &kitty.Options{
		Action:           kitty.TransmitAndPut,
		Transmission:     kitty.Direct,
		Format:           kitty.RGBA,
		ImageWidth:       bounds.Dx(),
		ImageHeight:      bounds.Dy(),
		ID:               imgID,
		VirtualPlacement: true,
		Columns:          30,
		Rows:             15,
		Chunk:            true,
		Quite:            2,
	}); err != nil {
		return kittyResult{}
	}

	placeholder := kittyPlaceholder(imgID, 30, 15)
	return kittyResult{
		transmit:    buf.String(),
		placeholder: placeholder,
	}
}

func kittyPlaceholder(imgID, cols, rows int) string {
	var b strings.Builder
	fg := fmt.Sprintf("\033[38;5;%dm", imgID)
	reset := "\033[39m"
	b.WriteString(fg)
	for row := range rows {
		for col := range cols {
			b.WriteRune(kitty.Placeholder)
			b.WriteRune(kitty.Diacritic(row))
			b.WriteRune(kitty.Diacritic(col))
		}
		if row < rows-1 {
			b.WriteByte('\n')
		}
	}
	b.WriteString(reset)
	return b.String()
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

type fetchResult struct {
	render   string
	transmit string
}

func fetchAndRender(proto imageProto, url string, width, height int) (fetchResult, error) {
	if url == "" {
		return fetchResult{render: renderPlaceholder(width, height)}, nil
	}

	img, raw, err := fetchImage(url)
	if err != nil {
		return fetchResult{render: renderPlaceholder(width, height)}, nil
	}

	if proto == protoKitty {
		kr := renderKitty(img)
		if kr.placeholder == "" {
			return fetchResult{render: renderPlaceholder(width, height)}, nil
		}
		return fetchResult{render: kr.placeholder, transmit: kr.transmit}, nil
	}

	rendered := renderImage(proto, img, raw, width, height)
	if rendered == "" {
		return fetchResult{render: renderPlaceholder(width, height)}, nil
	}
	return fetchResult{render: rendered}, nil
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
