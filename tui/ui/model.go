package ui

import (
	"context"
	"fmt"
	"strings"

	tea "charm.land/bubbletea/v2"
	lipgloss "charm.land/lipgloss/v2"
	"my-record-collection-tui/db"
)

type view int

const (
	listView view = iota
	detailView
)

type Model struct {
	store      *db.RecordStore
	records    []db.Record
	filtered   []db.Record
	cursor     int
	offset     int
	width      int
	height     int
	view       view
	search     string
	searching  bool
	err        error
	loading    bool
	imgCache   *imageCache
	imgProto   imageProto
	artRender  string
	artLoading bool
}

func NewModel(store *db.RecordStore) Model {
	return Model{
		store:    store,
		loading:  true,
		imgCache: newImageCache(),
		imgProto: detectImageProto(),
	}
}

type recordsLoadedMsg struct {
	records []db.Record
	err     error
}

type imageLoadedMsg struct {
	url    string
	render string
}

func loadRecords(store *db.RecordStore) tea.Cmd {
	return func() tea.Msg {
		records, err := store.List(context.Background())
		return recordsLoadedMsg{records: records, err: err}
	}
}

func searchRecords(store *db.RecordStore, query string) tea.Cmd {
	return func() tea.Msg {
		records, err := store.Search(context.Background(), query)
		return recordsLoadedMsg{records: records, err: err}
	}
}

func loadImage(proto imageProto, url string, width, height int) tea.Cmd {
	return func() tea.Msg {
		rendered, _ := fetchAndRender(proto, url, width, height)
		return imageLoadedMsg{url: url, render: rendered}
	}
}

func (m Model) Init() tea.Cmd {
	return loadRecords(m.store)
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case recordsLoadedMsg:
		m.loading = false
		if msg.err != nil {
			m.err = msg.err
			return m, nil
		}
		m.records = msg.records
		m.filtered = msg.records
		m.cursor = 0
		m.offset = 0
		return m, nil

	case imageLoadedMsg:
		m.imgCache.set(msg.url, msg.render)
		m.artRender = msg.render
		m.artLoading = false
		return m, nil

	case tea.KeyPressMsg:
		return m.handleKey(msg)
	}

	return m, nil
}

func (m Model) handleKey(msg tea.KeyPressMsg) (tea.Model, tea.Cmd) {
	key := msg.String()

	if m.searching {
		return m.handleSearchKey(key)
	}

	switch m.view {
	case listView:
		return m.handleListKey(key)
	case detailView:
		return m.handleDetailKey(key)
	}

	return m, nil
}

func (m Model) handleSearchKey(key string) (tea.Model, tea.Cmd) {
	switch key {
	case "esc":
		m.searching = false
		m.search = ""
		m.filtered = m.records
		return m, nil
	case "enter":
		m.searching = false
		if m.search == "" {
			m.filtered = m.records
			return m, nil
		}
		return m, searchRecords(m.store, m.search)
	case "backspace":
		if len(m.search) > 0 {
			m.search = m.search[:len(m.search)-1]
		}
		return m, nil
	default:
		if len(key) == 1 {
			m.search += key
		}
		return m, nil
	}
}

func (m Model) handleListKey(key string) (tea.Model, tea.Cmd) {
	switch key {
	case "q", "ctrl+c":
		return m, tea.Quit
	case "up", "k":
		if m.cursor > 0 {
			m.cursor--
			if m.cursor < m.offset {
				m.offset = m.cursor
			}
		}
	case "down", "j":
		if m.cursor < len(m.filtered)-1 {
			m.cursor++
			visible := m.listVisibleRows()
			if m.cursor >= m.offset+visible {
				m.offset = m.cursor - visible + 1
			}
		}
	case "home", "g":
		m.cursor = 0
		m.offset = 0
	case "end", "G":
		m.cursor = max(0, len(m.filtered)-1)
		visible := m.listVisibleRows()
		m.offset = max(0, m.cursor-visible+1)
	case "enter":
		if len(m.filtered) > 0 {
			m.view = detailView
			m.artRender = ""
			m.artLoading = true
			rec := m.filtered[m.cursor]
			url := rec.ImageURL()
			if cached, ok := m.imgCache.get(url); ok {
				m.artRender = cached
				m.artLoading = false
				return m, nil
			}
			return m, loadImage(m.imgProto, url, 30, 15)
		}
	case "/":
		m.searching = true
		m.search = ""
	case "r":
		m.loading = true
		return m, loadRecords(m.store)
	}
	return m, nil
}

func (m Model) handleDetailKey(key string) (tea.Model, tea.Cmd) {
	switch key {
	case "q", "esc", "backspace":
		m.view = listView
		m.artRender = ""
	case "ctrl+c":
		return m, tea.Quit
	}
	return m, nil
}

func (m Model) listVisibleRows() int {
	return max(1, m.height-6)
}

func (m Model) View() tea.View {
	if m.width == 0 {
		return tea.NewView("Loading...")
	}

	var s string
	switch m.view {
	case listView:
		s = m.renderList()
	case detailView:
		s = m.renderDetail()
	}

	return tea.NewView(s)
}

func (m Model) renderList() string {
	var b strings.Builder

	title := titleStyle.Render("♫ Record Collection")
	count := statusBarStyle.Render(fmt.Sprintf("%d records", len(m.filtered)))
	titleLine := lipgloss.JoinHorizontal(lipgloss.Center, title, "  ", count)
	b.WriteString(titleLine + "\n")

	if m.searching {
		b.WriteString(searchStyle.Render("Search: " + m.search + "█") + "\n")
	} else {
		b.WriteString("\n")
	}

	if m.loading {
		b.WriteString("\n  Loading records...\n")
		return b.String()
	}
	if m.err != nil {
		fmt.Fprintf(&b, "\n  Error: %v\n", m.err)
		return b.String()
	}
	if len(m.filtered) == 0 {
		b.WriteString("\n  No records found.\n")
		b.WriteString(m.renderHelp())
		return b.String()
	}

	colW := m.columnWidths()
	header := headerStyle.Render(
		truncPad("Artist", colW[0]) + " " +
			truncPad("Album", colW[1]) + " " +
			truncPad("Year", colW[2]) + " " +
			truncPad("Label", colW[3]) + " " +
			truncPad("Genres", colW[4]))
	b.WriteString(header + "\n")

	visible := m.listVisibleRows()
	end := min(m.offset+visible, len(m.filtered))
	for i := m.offset; i < end; i++ {
		rec := m.filtered[i]
		row := truncPad(rec.ArtistName, colW[0]) + " " +
			truncPad(rec.AlbumTitle, colW[1]) + " " +
			truncPad(rec.YearString(), colW[2]) + " " +
			truncPad(rec.LabelString(), colW[3]) + " " +
			truncPad(rec.GenresString(), colW[4])

		if i == m.cursor {
			b.WriteString(selectedRowStyle.Render(row))
		} else {
			b.WriteString(normalRowStyle.Render(row))
		}
		b.WriteString("\n")
	}

	if len(m.filtered) > visible {
		scrollInfo := fmt.Sprintf(" %d-%d of %d ", m.offset+1, end, len(m.filtered))
		b.WriteString(statusBarStyle.Render(scrollInfo) + "\n")
	}

	b.WriteString(m.renderHelp())
	return b.String()
}

func (m Model) renderDetail() string {
	if m.cursor >= len(m.filtered) {
		return "No record selected"
	}
	rec := m.filtered[m.cursor]

	var b strings.Builder

	title := titleStyle.Render(fmt.Sprintf("♫ %s — %s", rec.ArtistName, rec.AlbumTitle))
	b.WriteString(title + "\n\n")

	var artBlock string
	if m.artLoading {
		artBlock = renderPlaceholder(30, 15)
		artBlock = strings.Replace(artBlock, "No Image", "Loading…", 1)
	} else if m.artRender != "" {
		artBlock = m.artRender
	} else {
		artBlock = renderPlaceholder(30, 15)
	}

	fields := []struct{ label, value string }{
		{"Artist", rec.ArtistName},
		{"Album", rec.AlbumTitle},
		{"Year", rec.YearString()},
		{"Label", rec.LabelString()},
		{"Genres", rec.GenresString()},
		{"Styles", rec.StylesString()},
		{"Size", rec.SizeString()},
		{"Color", rec.ColorString()},
		{"Source", rec.DataSource},
	}

	if rec.CatalogNumber != nil {
		fields = append(fields, struct{ label, value string }{"Catalog #", *rec.CatalogNumber})
	}
	if rec.UPCCode != nil {
		fields = append(fields, struct{ label, value string }{"UPC", *rec.UPCCode})
	}

	syncLabel := "Synced"
	var syncValue string
	if rec.IsSyncedWithDiscogs {
		syncValue = syncedStyle.Render("✓ Yes")
	} else {
		syncValue = notSyncedStyle.Render("✗ No")
	}
	fields = append(fields, struct{ label, value string }{syncLabel, syncValue})

	var infoLines []string
	for _, f := range fields {
		infoLines = append(infoLines,
			labelStyle.Render(f.label)+valueStyle.Render(f.value))
	}
	infoBlock := strings.Join(infoLines, "\n")

	if m.imgProto == protoMosaic {
		content := lipgloss.JoinHorizontal(lipgloss.Top, artBlock, "  ", infoBlock)
		b.WriteString(detailBoxStyle.Render(content))
	} else {
		b.WriteString(detailBoxStyle.Render(infoBlock))
		b.WriteString("\n")
		b.WriteString(artBlock)
	}
	b.WriteString("\n\n")

	protoLabel := helpStyle.Render(fmt.Sprintf("  [image: %s]", m.imgProto))
	b.WriteString(helpStyle.Render("  esc/q back") + protoLabel)

	return b.String()
}

func (m Model) renderHelp() string {
	if m.searching {
		return helpStyle.Render("  enter confirm  esc cancel")
	}
	return helpStyle.Render("  ↑/k up  ↓/j down  enter detail  / search  r reload  q quit")
}

func (m Model) columnWidths() [5]int {
	w := max(m.width-5, 40)
	return [5]int{
		w * 25 / 100,
		w * 30 / 100,
		6,
		w * 18 / 100,
		w * 18 / 100,
	}
}

func truncPad(s string, width int) string {
	if width <= 0 {
		return ""
	}
	runes := []rune(s)
	if len(runes) > width {
		if width > 1 {
			return string(runes[:width-1]) + "…"
		}
		return string(runes[:width])
	}
	return s + strings.Repeat(" ", width-len(runes))
}
