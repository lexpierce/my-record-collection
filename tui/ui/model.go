package ui

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	tea "charm.land/bubbletea/v2"
	lipgloss "charm.land/lipgloss/v2"
	"my-record-collection-tui/db"
)

type view int

const (
	listView view = iota
	detailView
	addDiscogsView
	addManualView
)

const maxSearchRunes = 200

var sqlInjectionPattern = regexp.MustCompile(`(?i)(--|/\*|\*/|;|\b(select|union|drop|delete|insert|update|alter|truncate|create)\b)`)

type Model struct {
	store                db.Store
	records              []db.Record
	filtered             []db.Record
	cursor               int
	offset               int
	width                int
	height               int
	view                 view
	search               string
	searching            bool
	err                  error
	loading              bool
	imgCache             *imageCache
	imgProto             imageProto
	artRender            string
	artLoading           bool
	deleteConfirm        bool
	deleteErr            string
	deleting             bool
	discogsSearchMethod  discogsSearchMethod
	discogsArtist        string
	discogsTitle         string
	discogsCatalogNumber string
	discogsUPC           string
	discogsCursor        int
	discogsResults       []discogsSearchResult
	discogsResultCursor  int
	discogsResultsFocus  bool
	discogsErr           string
	discogsSearching     bool
	discogsSaving        bool
	successMsg           string

	syncing              bool
	syncPhase            string
	syncPulled           int
	syncPushed           int
	syncSkipped          int
	syncTotal            int
	syncErrors           []string

	manualArtist         string
	manualAlbum          string
	manualYear           string
	manualLabel          string
	manualCatalog        string
	manualGenres         string
	manualSize           string
	manualColor          string
	manualCursor         int
	manualSaving         bool
	manualErr            string
}

func NewModel(store db.Store) Model {
	return Model{
		store:               store,
		loading:             true,
		imgCache:            newImageCache(),
		imgProto:            detectImageProto(),
		discogsSearchMethod: discogsSearchArtistTitle,
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

type recordDeletedMsg struct {
	err error
}

type discogsSearchResultsMsg struct {
	results []discogsSearchResult
	err     error
}

type discogsRecordAddedMsg struct {
	err error
}

type manualRecordAddedMsg struct {
	err error
}

type syncProgressMsg struct {
	progress syncProgress
}

type syncDoneMsg struct {
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

func deleteRecord(store db.Store, id string) tea.Cmd {
	return func() tea.Msg {
		err := store.Delete(context.Background(), id)
		return recordDeletedMsg{err: err}
	}
}

func runDiscogsSearch(query discogsSearchQuery) tea.Cmd {
	return func() tea.Msg {
		results, err := searchDiscogs(query)
		return discogsSearchResultsMsg{results: results, err: err}
	}
}

func addDiscogsRecord(store db.Store, releaseID int) tea.Cmd {
	return func() tea.Msg {
		err := addDiscogsReleaseToStore(store, releaseID)
		return discogsRecordAddedMsg{err: err}
	}
}

func addManualRecord(store db.Store, r db.Record) tea.Cmd {
	return func() tea.Msg {
		err := store.Create(context.Background(), r)
		return manualRecordAddedMsg{err: err}
	}
}

func runSync(store db.Store) tea.Cmd {
	return func() tea.Msg {
		var lastProgress syncProgress
		err := executeSync(store, func(p syncProgress) {
			lastProgress = p
		})
		_ = lastProgress
		return syncDoneMsg{err: err}
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
		m.deleteConfirm = false
		m.deleting = false
		m.deleteErr = ""
		return m, nil

	case tea.KeyPressMsg:
		if m.successMsg != "" {
			m.successMsg = ""
		}
		if m.syncPhase == "done" {
			m.syncPhase = ""
			m.syncErrors = nil
		}
		return m.handleKey(msg)

	case imageLoadedMsg:
		m.imgCache.set(msg.url, cachedImage{render: msg.render, transmit: msg.transmit})
		m.artRender = msg.render
		m.artLoading = false
		if msg.transmit != "" {
			return m, tea.Raw(msg.transmit)
		}
		return m, nil

	case recordDeletedMsg:
		m.deleting = false
		m.deleteConfirm = false
		if msg.err != nil {
			m.deleteErr = msg.err.Error()
			return m, nil
		}
		m.deleteErr = ""
		m.loading = true
		return m, loadRecords(m.store)

	case discogsSearchResultsMsg:
		m.discogsSearching = false
		if msg.err != nil {
			m.discogsErr = msg.err.Error()
			return m, nil
		}
		m.discogsErr = ""
		m.discogsResults = msg.results
		m.discogsResultCursor = 0
		m.discogsResultsFocus = len(msg.results) > 0
		if len(msg.results) == 0 {
			m.discogsErr = "No results found. Try a different search."
		}
		return m, nil

	case discogsRecordAddedMsg:
		m.discogsSaving = false
		if msg.err != nil {
			m.discogsErr = msg.err.Error()
			return m, nil
		}
		m.discogsErr = ""
		m.successMsg = "Record added successfully."
		m.resetDiscogsAddState()
		m.view = listView
		m.loading = true
		return m, loadRecords(m.store)

	case manualRecordAddedMsg:
		m.manualSaving = false
		if msg.err != nil {
			m.manualErr = msg.err.Error()
			return m, nil
		}
		m.manualErr = ""
		m.successMsg = "Record added successfully."
		m.resetManualAddState()
		m.view = listView
		m.loading = true
		return m, loadRecords(m.store)

	case syncProgressMsg:
		p := msg.progress
		m.syncPhase = p.Phase
		m.syncPulled = p.Pulled
		m.syncPushed = p.Pushed
		m.syncSkipped = p.Skipped
		m.syncTotal = p.TotalDiscogsItems
		m.syncErrors = p.Errors
		return m, nil

	case syncDoneMsg:
		m.syncing = false
		m.syncPhase = "done"
		if msg.err != nil {
			m.syncErrors = append(m.syncErrors, msg.err.Error())
			return m, nil
		}
		m.loading = true
		return m, loadRecords(m.store)

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
	case addDiscogsView:
		return m.handleAddDiscogsKey(key)
	case addManualView:
		return m.handleAddManualKey(key)
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
		r, ok := inputKeyRune(key)
		if ok && utf8.RuneCountInString(m.search) < maxSearchRunes {
			m.search += string(r)
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
		m.deleteConfirm = false
	case "down", "j":
		if m.cursor < len(m.filtered)-1 {
			m.cursor++
			visible := m.listVisibleRows()
			if m.cursor >= m.offset+visible {
				m.offset = m.cursor - visible + 1
			}
		}
		m.deleteConfirm = false
	case "home", "g":
		m.cursor = 0
		m.offset = 0
		m.deleteConfirm = false
	case "end", "G":
		m.cursor = max(0, len(m.filtered)-1)
		visible := m.listVisibleRows()
		m.offset = max(0, m.cursor-visible+1)
		m.deleteConfirm = false
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
		m.deleteConfirm = false
	case "a":
		m.view = addDiscogsView
		m.resetDiscogsAddState()
	case "M":
		m.view = addManualView
		m.resetManualAddState()
	case "d", "y":
		if len(m.filtered) == 0 || m.deleting {
			return m, nil
		}
		if !m.deleteConfirm {
			m.deleteConfirm = true
			m.deleteErr = ""
			return m, nil
		}
		m.deleting = true
		recordID := m.filtered[m.cursor].RecordID
		return m, deleteRecord(m.store, recordID)
	case "esc", "n":
		m.deleteConfirm = false
	case "r":
		m.loading = true
		m.deleteConfirm = false
		m.deleteErr = ""
		return m, loadRecords(m.store)
	case "s":
		if m.syncing {
			return m, nil
		}
		m.syncing = true
		m.syncPhase = "pull"
		m.syncPulled = 0
		m.syncPushed = 0
		m.syncSkipped = 0
		m.syncTotal = 0
		m.syncErrors = nil
		m.deleteConfirm = false
		return m, runSync(m.store)
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

func (m Model) handleAddDiscogsKey(key string) (tea.Model, tea.Cmd) {
	switch key {
	case "ctrl+c":
		return m, tea.Quit
	case "esc":
		m.view = listView
		m.discogsErr = ""
		m.discogsSearching = false
		m.discogsSaving = false
		return m, nil
	case "1":
		m.discogsSearchMethod = discogsSearchArtistTitle
		m.discogsCursor = 0
		m.discogsResultsFocus = false
		m.discogsErr = ""
		return m, nil
	case "2":
		m.discogsSearchMethod = discogsSearchCatalog
		m.discogsCursor = 0
		m.discogsResultsFocus = false
		m.discogsErr = ""
		return m, nil
	case "3":
		m.discogsSearchMethod = discogsSearchUPC
		m.discogsCursor = 0
		m.discogsResultsFocus = false
		m.discogsErr = ""
		return m, nil
	}

	if m.discogsResultsFocus {
		switch key {
		case "up", "k":
			if m.discogsResultCursor > 0 {
				m.discogsResultCursor--
			}
			return m, nil
		case "down", "j":
			if m.discogsResultCursor < len(m.discogsResults)-1 {
				m.discogsResultCursor++
			}
			return m, nil
		case "tab", "shift+tab":
			m.discogsResultsFocus = false
			return m, nil
		case "enter":
			if m.discogsSaving || m.discogsSearching || len(m.discogsResults) == 0 {
				return m, nil
			}
			m.discogsSaving = true
			m.discogsErr = ""
			releaseID := m.discogsResults[m.discogsResultCursor].ID
			return m, addDiscogsRecord(m.store, releaseID)
		}
	}

	switch key {
	case "up", "k":
		if m.discogsCursor > 0 {
			m.discogsCursor--
		}
		return m, nil
	case "down", "j", "tab":
		if m.discogsCursor < m.discogsFieldCount()-1 {
			m.discogsCursor++
		} else if len(m.discogsResults) > 0 {
			m.discogsResultsFocus = true
		}
		return m, nil
	case "shift+tab":
		if m.discogsCursor > 0 {
			m.discogsCursor--
		}
		return m, nil
	case "backspace":
		if m.discogsSearching || m.discogsSaving {
			return m, nil
		}
		field := m.activeDiscogsField()
		runes := []rune(*field)
		if len(runes) > 0 {
			*field = string(runes[:len(runes)-1])
		}
		return m, nil
	case "enter":
		if m.discogsSearching || m.discogsSaving {
			return m, nil
		}
		query, errMsg := m.discogsQueryFromState()
		if errMsg != "" {
			m.discogsErr = errMsg
			return m, nil
		}
		m.discogsErr = ""
		m.discogsResults = nil
		m.discogsResultCursor = 0
		m.discogsResultsFocus = false
		m.discogsSearching = true
		return m, runDiscogsSearch(query)
	default:
		if m.discogsSearching || m.discogsSaving {
			return m, nil
		}
		r, ok := inputKeyRune(key)
		if !ok {
			return m, nil
		}
		field := m.activeDiscogsField()
		if utf8.RuneCountInString(*field) < maxSearchRunes {
			*field += string(r)
		}
		return m, nil
	}
}

func (m *Model) resetDiscogsAddState() {
	m.discogsSearchMethod = discogsSearchArtistTitle
	m.discogsArtist = ""
	m.discogsTitle = ""
	m.discogsCatalogNumber = ""
	m.discogsUPC = ""
	m.discogsCursor = 0
	m.discogsResults = nil
	m.discogsResultCursor = 0
	m.discogsResultsFocus = false
	m.discogsErr = ""
	m.discogsSearching = false
	m.discogsSaving = false
}

func (m Model) discogsFieldCount() int {
	if m.discogsSearchMethod == discogsSearchArtistTitle {
		return 2
	}
	return 1
}

func (m *Model) activeDiscogsField() *string {
	if m.discogsSearchMethod == discogsSearchArtistTitle {
		if m.discogsCursor == 0 {
			return &m.discogsArtist
		}
		return &m.discogsTitle
	}
	if m.discogsSearchMethod == discogsSearchCatalog {
		return &m.discogsCatalogNumber
	}
	return &m.discogsUPC
}

func (m Model) discogsQueryFromState() (discogsSearchQuery, string) {
	switch m.discogsSearchMethod {
	case discogsSearchCatalog:
		catalog := strings.TrimSpace(m.discogsCatalogNumber)
		if catalog == "" {
			return discogsSearchQuery{}, "catalog number is required"
		}
		if utf8.RuneCountInString(catalog) > maxSearchRunes {
			return discogsSearchQuery{}, fmt.Sprintf("catalog number is too long (max %d chars)", maxSearchRunes)
		}
		if sqlInjectionPattern.MatchString(catalog) {
			return discogsSearchQuery{}, "catalog number contains blocked SQL patterns"
		}
		return discogsSearchQuery{Method: discogsSearchCatalog, Catalog: catalog}, ""
	case discogsSearchUPC:
		upc := strings.TrimSpace(m.discogsUPC)
		if upc == "" {
			return discogsSearchQuery{}, "upc is required"
		}
		if utf8.RuneCountInString(upc) > maxSearchRunes {
			return discogsSearchQuery{}, fmt.Sprintf("upc is too long (max %d chars)", maxSearchRunes)
		}
		if sqlInjectionPattern.MatchString(upc) {
			return discogsSearchQuery{}, "upc contains blocked SQL patterns"
		}
		return discogsSearchQuery{Method: discogsSearchUPC, UPC: upc}, ""
	default:
		artist := strings.TrimSpace(m.discogsArtist)
		title := strings.TrimSpace(m.discogsTitle)
		if artist == "" || title == "" {
			return discogsSearchQuery{}, "artist and album are required"
		}
		if utf8.RuneCountInString(artist) > maxSearchRunes {
			return discogsSearchQuery{}, fmt.Sprintf("artist is too long (max %d chars)", maxSearchRunes)
		}
		if utf8.RuneCountInString(title) > maxSearchRunes {
			return discogsSearchQuery{}, fmt.Sprintf("album is too long (max %d chars)", maxSearchRunes)
		}
		if sqlInjectionPattern.MatchString(artist) {
			return discogsSearchQuery{}, "artist contains blocked SQL patterns"
		}
		if sqlInjectionPattern.MatchString(title) {
			return discogsSearchQuery{}, "album contains blocked SQL patterns"
		}
		return discogsSearchQuery{Method: discogsSearchArtistTitle, Artist: artist, Title: title}, ""
	}
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
	case addDiscogsView:
		s = m.renderAddDiscogs()
	case addManualView:
		s = m.renderAddManual()
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
		if m.deleteErr != "" {
			b.WriteString(errorStyle.Render("  "+m.deleteErr) + "\n")
		}
		b.WriteString(m.renderHelp())
		return b.String()
	}

	colW := m.columnWidths()
	header := headerStyle.Render(
		truncPad("Artist", colW[0])+" "+
			truncPad("Album", colW[1])+" "+
			truncPad("Year", colW[2])+" "+
			truncPad("Label", colW[3])+" "+
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

	if m.successMsg != "" {
		b.WriteString(successStyle.Render("  "+m.successMsg) + "\n")
	}
	if m.syncing {
		syncStatus := fmt.Sprintf("  Syncing... [%s] pulled:%d pushed:%d skipped:%d", m.syncPhase, m.syncPulled, m.syncPushed, m.syncSkipped)
		if m.syncTotal > 0 {
			syncStatus += fmt.Sprintf(" (%d/%d)", m.syncPulled+m.syncSkipped, m.syncTotal)
		}
		b.WriteString(statusBarStyle.Render(syncStatus) + "\n")
	} else if m.syncPhase == "done" && (m.syncPulled > 0 || m.syncPushed > 0 || m.syncSkipped > 0 || len(m.syncErrors) > 0) {
		summary := fmt.Sprintf("  Sync complete — pulled:%d pushed:%d skipped:%d", m.syncPulled, m.syncPushed, m.syncSkipped)
		b.WriteString(successStyle.Render(summary) + "\n")
	}
	for _, syncErr := range m.syncErrors {
		b.WriteString(errorStyle.Render("  sync error: "+syncErr) + "\n")
	}
	if m.deleteErr != "" {
		b.WriteString(errorStyle.Render("  "+m.deleteErr) + "\n")
	}
	if m.deleteConfirm {
		b.WriteString(errorStyle.Render("  delete selected record? press d again (or y) to confirm, esc/n to cancel") + "\n")
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

func (m Model) renderAddDiscogs() string {
	var b strings.Builder
	title := titleStyle.Render("♫ Add Record")
	status := statusBarStyle.Render("discogs search")
	b.WriteString(lipgloss.JoinHorizontal(lipgloss.Center, title, "  ", status))
	b.WriteString("\n\n")

	methodLine := "  Methods: "
	if m.discogsSearchMethod == discogsSearchArtistTitle {
		methodLine += selectedRowStyle.Render("1 Artist+Album") + "  2 Catalog #  3 UPC"
	} else if m.discogsSearchMethod == discogsSearchCatalog {
		methodLine += "1 Artist+Album  " + selectedRowStyle.Render("2 Catalog #") + "  3 UPC"
	} else {
		methodLine += "1 Artist+Album  2 Catalog #  " + selectedRowStyle.Render("3 UPC")
	}
	b.WriteString(methodLine)
	b.WriteString("\n\n")

	if m.discogsSearchMethod == discogsSearchArtistTitle {
		artist := m.discogsArtist
		titleValue := m.discogsTitle
		if !m.discogsResultsFocus && m.discogsCursor == 0 && !m.discogsSearching && !m.discogsSaving {
			artist += "█"
		}
		if !m.discogsResultsFocus && m.discogsCursor == 1 && !m.discogsSearching && !m.discogsSaving {
			titleValue += "█"
		}
		artistLine := "  Artist: " + artist
		titleLine := "  Album: " + titleValue
		if !m.discogsResultsFocus && m.discogsCursor == 0 {
			artistLine = selectedRowStyle.Render("→ " + strings.TrimPrefix(artistLine, "  "))
		}
		if !m.discogsResultsFocus && m.discogsCursor == 1 {
			titleLine = selectedRowStyle.Render("→ " + strings.TrimPrefix(titleLine, "  "))
		}
		b.WriteString(artistLine + "\n")
		b.WriteString(titleLine + "\n")
	} else if m.discogsSearchMethod == discogsSearchCatalog {
		catalog := m.discogsCatalogNumber
		if !m.discogsResultsFocus && !m.discogsSearching && !m.discogsSaving {
			catalog += "█"
		}
		line := "  Catalog #: " + catalog
		if !m.discogsResultsFocus {
			line = selectedRowStyle.Render("→ " + strings.TrimPrefix(line, "  "))
		}
		b.WriteString(line + "\n")
	} else {
		upc := m.discogsUPC
		if !m.discogsResultsFocus && !m.discogsSearching && !m.discogsSaving {
			upc += "█"
		}
		line := "  UPC: " + upc
		if !m.discogsResultsFocus {
			line = selectedRowStyle.Render("→ " + strings.TrimPrefix(line, "  "))
		}
		b.WriteString(line + "\n")
	}

	if m.discogsSearching {
		b.WriteString("\n")
		b.WriteString(statusBarStyle.Render("Searching Discogs..."))
		b.WriteString("\n")
	}
	if m.discogsSaving {
		b.WriteString("\n")
		b.WriteString(statusBarStyle.Render("Adding selected release..."))
		b.WriteString("\n")
	}
	if m.discogsErr != "" {
		b.WriteString("\n")
		b.WriteString(errorStyle.Render("  " + m.discogsErr))
		b.WriteString("\n")
	}

	if len(m.discogsResults) > 0 {
		b.WriteString("\n")
		b.WriteString(statusBarStyle.Render(fmt.Sprintf("Results (%d)", len(m.discogsResults))))
		b.WriteString("\n")
		for i, result := range m.discogsResults {
			prefix := "  "
			if m.discogsResultsFocus && i == m.discogsResultCursor {
				prefix = "→ "
			}
			parts := []string{result.Title}
			if result.Year != "" {
				parts = append(parts, result.Year)
			}
			if result.CatNo != "" {
				parts = append(parts, "Cat#: "+result.CatNo)
			}
			if result.RecordSize != "" {
				parts = append(parts, result.RecordSize)
			}
			if result.VinylColor != "" {
				parts = append(parts, result.VinylColor)
			}
			if result.IsShapedVinyl {
				parts = append(parts, "Picture Disc")
			}
			line := prefix + strings.Join(parts, " • ")
			if m.discogsResultsFocus && i == m.discogsResultCursor {
				b.WriteString(selectedRowStyle.Render(line))
			} else {
				b.WriteString(normalRowStyle.Render(line))
			}
			b.WriteString("\n")
		}
	}

	b.WriteString("\n")
	b.WriteString(helpStyle.Render("  enter search/add  tab switch fields/results  1/2/3 method  esc cancel  ctrl+c quit"))

	return b.String()
}

func (m Model) renderHelp() string {
	if m.searching {
		return helpStyle.Render("  enter confirm  esc cancel")
	}
	return helpStyle.Render("  ↑/k up  ↓/j down  enter detail  a add discogs  M add manual  d delete  / search  s sync  r reload  q quit")
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

func inputKeyRune(key string) (rune, bool) {
	if key == "space" {
		return ' ', true
	}
	if utf8.RuneCountInString(key) != 1 {
		return 0, false
	}
	r, _ := utf8.DecodeRuneInString(key)
	if r == utf8.RuneError {
		return 0, false
	}
	return r, true
}

// manualFields returns ordered label+pointer pairs for the manual add form.
var manualFieldLabels = []string{
	"Artist *",
	"Album  *",
	"Year",
	"Label",
	"Catalog #",
	"Genres",
	"Size",
	"Color",
}

const manualFieldCount = 8

func (m *Model) activeManualField() *string {
	switch m.manualCursor {
	case 0:
		return &m.manualArtist
	case 1:
		return &m.manualAlbum
	case 2:
		return &m.manualYear
	case 3:
		return &m.manualLabel
	case 4:
		return &m.manualCatalog
	case 5:
		return &m.manualGenres
	case 6:
		return &m.manualSize
	default:
		return &m.manualColor
	}
}

func (m *Model) resetManualAddState() {
	m.manualArtist = ""
	m.manualAlbum = ""
	m.manualYear = ""
	m.manualLabel = ""
	m.manualCatalog = ""
	m.manualGenres = ""
	m.manualSize = ""
	m.manualColor = ""
	m.manualCursor = 0
	m.manualSaving = false
	m.manualErr = ""
}

func (m Model) handleAddManualKey(key string) (tea.Model, tea.Cmd) {
	switch key {
	case "ctrl+c":
		return m, tea.Quit
	case "esc":
		m.view = listView
		m.manualErr = ""
		m.manualSaving = false
		return m, nil
	case "up", "k":
		if m.manualCursor > 0 {
			m.manualCursor--
		}
		return m, nil
	case "down", "j", "tab":
		if m.manualCursor < manualFieldCount-1 {
			m.manualCursor++
		}
		return m, nil
	case "shift+tab":
		if m.manualCursor > 0 {
			m.manualCursor--
		}
		return m, nil
	case "backspace":
		if m.manualSaving {
			return m, nil
		}
		field := m.activeManualField()
		runes := []rune(*field)
		if len(runes) > 0 {
			*field = string(runes[:len(runes)-1])
		}
		return m, nil
	case "enter":
		if m.manualSaving {
			return m, nil
		}
		artist := strings.TrimSpace(m.manualArtist)
		album := strings.TrimSpace(m.manualAlbum)
		if artist == "" || album == "" {
			m.manualErr = "artist and album are required"
			return m, nil
		}
		rec := db.Record{
			ArtistName: artist,
			AlbumTitle: album,
			DataSource: "manual",
		}
		if y := strings.TrimSpace(m.manualYear); y != "" {
			parsed, err := strconv.Atoi(y)
			if err != nil || parsed < 1 || parsed > 9999 {
				m.manualErr = "year must be a valid 4-digit number"
				return m, nil
			}
			rec.YearReleased = &parsed
		}
		if v := strings.TrimSpace(m.manualLabel); v != "" {
			rec.LabelName = &v
		}
		if v := strings.TrimSpace(m.manualCatalog); v != "" {
			rec.CatalogNumber = &v
		}
		if v := strings.TrimSpace(m.manualGenres); v != "" {
			parts := strings.Split(v, ",")
			var genres []string
			for _, p := range parts {
				if g := strings.TrimSpace(p); g != "" {
					genres = append(genres, g)
				}
			}
			rec.Genres = genres
		}
		if v := strings.TrimSpace(m.manualSize); v != "" {
			rec.RecordSize = &v
		}
		if v := strings.TrimSpace(m.manualColor); v != "" {
			rec.VinylColor = &v
		}
		m.manualErr = ""
		m.manualSaving = true
		return m, addManualRecord(m.store, rec)
	default:
		if m.manualSaving {
			return m, nil
		}
		r, ok := inputKeyRune(key)
		if !ok {
			return m, nil
		}
		field := m.activeManualField()
		if utf8.RuneCountInString(*field) < maxSearchRunes {
			*field += string(r)
		}
		return m, nil
	}
}

func (m Model) renderAddManual() string {
	var b strings.Builder
	title := titleStyle.Render("♫ Add Record")
	status := statusBarStyle.Render("manual entry")
	b.WriteString(lipgloss.JoinHorizontal(lipgloss.Center, title, "  ", status))
	b.WriteString("\n\n")

	fields := []string{
		m.manualArtist,
		m.manualAlbum,
		m.manualYear,
		m.manualLabel,
		m.manualCatalog,
		m.manualGenres,
		m.manualSize,
		m.manualColor,
	}

	for i, label := range manualFieldLabels {
		val := fields[i]
		active := !m.manualSaving && i == m.manualCursor
		if active {
			val += "█"
		}
		line := fmt.Sprintf("  %-12s %s", label+":", val)
		if active {
			b.WriteString(selectedRowStyle.Render("→ "+strings.TrimPrefix(line, "  ")))
		} else {
			b.WriteString(normalRowStyle.Render(line))
		}
		b.WriteString("\n")
	}

	if m.manualSaving {
		b.WriteString("\n")
		b.WriteString(statusBarStyle.Render("Saving..."))
		b.WriteString("\n")
	}
	if m.manualErr != "" {
		b.WriteString("\n")
		b.WriteString(errorStyle.Render("  "+m.manualErr))
		b.WriteString("\n")
	}

	b.WriteString("\n")
	b.WriteString(helpStyle.Render("  * required  enter save  tab/↑↓ navigate  esc cancel  ctrl+c quit"))
	return b.String()
}
