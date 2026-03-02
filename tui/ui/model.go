package ui

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	tea "charm.land/bubbletea/v2"
	lipgloss "charm.land/lipgloss/v2"
	"my-record-collection-tui/db"
)

type view int

const (
	listView view = iota
	detailView
	addView
)

const (
	maxArtistRunes = 200
	maxAlbumRunes  = 200
	maxLabelRunes  = 120
	maxSizeRunes   = 40
	maxColorRunes  = 80
	maxSearchRunes = 200
	minReleaseYear = 1850
)

var sqlInjectionPattern = regexp.MustCompile(`(?i)(--|/\*|\*/|;|\b(select|union|drop|delete|insert|update|alter|truncate|create)\b)`)

type Model struct {
	store      db.Store
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
	addFields  []addField
	addCursor  int
	addErr     string
	addSaving  bool
}

type addField struct {
	label    string
	value    string
	required bool
}

func NewModel(store db.Store) Model {
	return Model{
		store:     store,
		loading:   true,
		imgCache:  newImageCache(),
		imgProto:  detectImageProto(),
		addFields: defaultAddFields(),
	}
}

func defaultAddFields() []addField {
	return []addField{
		{label: "Artist", required: true},
		{label: "Album", required: true},
		{label: "Year"},
		{label: "Label"},
		{label: "Size"},
		{label: "Color"},
	}
}

type recordsLoadedMsg struct {
	records []db.Record
	err     error
}

type imageLoadedMsg struct {
	url      string
	render   string
	transmit string
}

type recordCreatedMsg struct {
	err error
}

func loadRecords(store db.Store) tea.Cmd {
	return func() tea.Msg {
		records, err := store.List(context.Background())
		return recordsLoadedMsg{records: records, err: err}
	}
}

func searchRecords(store db.Store, query string) tea.Cmd {
	return func() tea.Msg {
		records, err := store.Search(context.Background(), query)
		return recordsLoadedMsg{records: records, err: err}
	}
}

func loadImage(proto imageProto, url string, width, height int) tea.Cmd {
	return func() tea.Msg {
		result, _ := fetchAndRender(proto, url, width, height)
		return imageLoadedMsg{url: url, render: result.render, transmit: result.transmit}
	}
}

func createRecord(store db.Store, r db.Record) tea.Cmd {
	return func() tea.Msg {
		err := store.Create(context.Background(), r)
		return recordCreatedMsg{err: err}
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
		m.err = nil
		m.records = msg.records
		m.filtered = msg.records
		m.cursor = 0
		m.offset = 0
		return m, nil

	case imageLoadedMsg:
		m.imgCache.set(msg.url, cachedImage{render: msg.render, transmit: msg.transmit})
		m.artRender = msg.render
		m.artLoading = false
		if msg.transmit != "" {
			return m, tea.Raw(msg.transmit)
		}
		return m, nil

	case recordCreatedMsg:
		m.addSaving = false
		if msg.err != nil {
			m.addErr = msg.err.Error()
			return m, nil
		}
		m.view = listView
		m.addFields = defaultAddFields()
		m.addCursor = 0
		m.addErr = ""
		m.loading = true
		return m, loadRecords(m.store)

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
	case addView:
		return m.handleAddKey(key)
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
			runes := []rune(m.search)
			m.search = string(runes[:len(runes)-1])
		}
		return m, nil
	default:
		if len(key) == 1 && utf8.RuneCountInString(m.search) < maxSearchRunes {
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
				m.artRender = cached.render
				m.artLoading = false
				if cached.transmit != "" {
					return m, tea.Raw(cached.transmit)
				}
				return m, nil
			}
			return m, loadImage(m.imgProto, url, 30, 15)
		}
	case "/":
		m.searching = true
		m.search = ""
	case "a":
		m.view = addView
		m.addFields = defaultAddFields()
		m.addCursor = 0
		m.addErr = ""
		m.addSaving = false
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

func (m Model) handleAddKey(key string) (tea.Model, tea.Cmd) {
	switch key {
	case "ctrl+c":
		return m, tea.Quit
	case "esc":
		m.view = listView
		m.addErr = ""
		m.addSaving = false
		return m, nil
	case "up", "k":
		if m.addCursor > 0 {
			m.addCursor--
		}
		return m, nil
	case "down", "j", "tab":
		if m.addCursor < len(m.addFields)-1 {
			m.addCursor++
		}
		return m, nil
	case "shift+tab":
		if m.addCursor > 0 {
			m.addCursor--
		}
		return m, nil
	case "backspace":
		if m.addSaving || len(m.addFields) == 0 {
			return m, nil
		}
		field := &m.addFields[m.addCursor]
		if len(field.value) > 0 {
			runes := []rune(field.value)
			field.value = string(runes[:len(runes)-1])
		}
		return m, nil
	case "enter":
		if m.addSaving {
			return m, nil
		}
		rec, validationErr := m.addRecordFromFields()
		if validationErr != "" {
			m.addErr = validationErr
			return m, nil
		}
		m.addErr = ""
		m.addSaving = true
		return m, createRecord(m.store, rec)
	default:
		if m.addSaving || len(m.addFields) == 0 {
			return m, nil
		}
		if len(key) == 1 {
			field := &m.addFields[m.addCursor]
			if utf8.RuneCountInString(field.value) < maxFieldLength(m.addCursor) {
				field.value += key
			}
		}
		return m, nil
	}
}

func (m Model) addRecordFromFields() (db.Record, string) {
	if len(m.addFields) < 2 {
		return db.Record{}, "add form is not initialized"
	}

	artist, errMsg := validateTextField(m.addFields[0].value, "artist", true, maxArtistRunes)
	if errMsg != "" {
		return db.Record{}, errMsg
	}
	album, errMsg := validateTextField(m.addFields[1].value, "album", true, maxAlbumRunes)
	if errMsg != "" {
		return db.Record{}, errMsg
	}

	rec := db.Record{
		ArtistName: artist,
		AlbumTitle: album,
	}

	yearText := strings.TrimSpace(m.addFields[2].value)
	if yearText != "" {
		year, err := strconv.Atoi(yearText)
		if err != nil {
			return db.Record{}, "year must be a number"
		}
		if year < minReleaseYear || year > time.Now().Year()+1 {
			return db.Record{}, fmt.Sprintf("year must be between %d and %d", minReleaseYear, time.Now().Year()+1)
		}
		rec.YearReleased = &year
	}

	label, errMsg := validateTextField(m.addFields[3].value, "label", false, maxLabelRunes)
	if errMsg != "" {
		return db.Record{}, errMsg
	}
	if label != "" {
		rec.LabelName = &label
	}

	size, errMsg := validateTextField(m.addFields[4].value, "size", false, maxSizeRunes)
	if errMsg != "" {
		return db.Record{}, errMsg
	}
	if size != "" {
		rec.RecordSize = &size
	}

	color, errMsg := validateTextField(m.addFields[5].value, "color", false, maxColorRunes)
	if errMsg != "" {
		return db.Record{}, errMsg
	}
	if color != "" {
		rec.VinylColor = &color
	}

	return rec, ""
}

func maxFieldLength(fieldIndex int) int {
	switch fieldIndex {
	case 0:
		return maxArtistRunes
	case 1:
		return maxAlbumRunes
	case 2:
		return 4
	case 3:
		return maxLabelRunes
	case 4:
		return maxSizeRunes
	case 5:
		return maxColorRunes
	default:
		return maxArtistRunes
	}
}

func validateTextField(input, name string, required bool, maxRunes int) (string, string) {
	value := strings.TrimSpace(input)
	if required && value == "" {
		return "", "artist and album are required"
	}
	if value == "" {
		return "", ""
	}
	if utf8.RuneCountInString(value) > maxRunes {
		return "", fmt.Sprintf("%s is too long (max %d chars)", name, maxRunes)
	}
	if sqlInjectionPattern.MatchString(value) {
		return "", fmt.Sprintf("%s contains blocked SQL patterns", name)
	}
	return value, ""
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
	case addView:
		s = m.renderAdd()
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
		b.WriteString(searchStyle.Render("Search: "+m.search+"█") + "\n")
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

func (m Model) renderAdd() string {
	var b strings.Builder

	title := titleStyle.Render("♫ Add Record")
	status := statusBarStyle.Render("manual entry")
	b.WriteString(lipgloss.JoinHorizontal(lipgloss.Center, title, "  ", status))
	b.WriteString("\n\n")

	for i, field := range m.addFields {
		prefix := "  "
		if i == m.addCursor {
			prefix = "→ "
		}

		name := field.label
		if field.required {
			name += "*"
		}

		value := field.value
		if i == m.addCursor && !m.addSaving {
			value += "█"
		}

		line := fmt.Sprintf("%s%s: %s", prefix, name, value)
		if i == m.addCursor {
			b.WriteString(selectedRowStyle.Render(line))
		} else {
			b.WriteString(normalRowStyle.Render(line))
		}
		b.WriteString("\n")
	}

	if m.addErr != "" {
		b.WriteString("\n")
		b.WriteString(errorStyle.Render("  " + m.addErr))
		b.WriteString("\n")
	}

	if m.addSaving {
		b.WriteString("\n")
		b.WriteString(statusBarStyle.Render("Saving..."))
		b.WriteString("\n")
	}

	b.WriteString("\n")
	b.WriteString(helpStyle.Render("  enter save  tab/down next  shift+tab/up prev  esc cancel  ctrl+c quit"))

	return b.String()
}

func (m Model) renderHelp() string {
	if m.searching {
		return helpStyle.Render("  enter confirm  esc cancel")
	}
	return helpStyle.Render("  ↑/k up  ↓/j down  enter detail  a add  / search  r reload  q quit")
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
