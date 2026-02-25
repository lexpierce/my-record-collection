package ui

import (
	"context"
	"errors"
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"
	"my-record-collection-tui/db"
)

type mockStore struct {
	records []db.Record
	err     error
}

func (m *mockStore) List(_ context.Context) ([]db.Record, error) {
	return m.records, m.err
}

func (m *mockStore) Search(_ context.Context, query string) ([]db.Record, error) {
	if m.err != nil {
		return nil, m.err
	}
	var results []db.Record
	for _, r := range m.records {
		if strings.Contains(strings.ToLower(r.ArtistName), strings.ToLower(query)) ||
			strings.Contains(strings.ToLower(r.AlbumTitle), strings.ToLower(query)) {
			results = append(results, r)
		}
	}
	return results, nil
}

func (m *mockStore) Delete(_ context.Context, _ string) error    { return m.err }
func (m *mockStore) Create(_ context.Context, _ db.Record) error { return m.err }

func testRecords() []db.Record {
	return []db.Record{
		{RecordID: "1", ArtistName: "Miles Davis", AlbumTitle: "Kind of Blue"},
		{RecordID: "2", ArtistName: "John Coltrane", AlbumTitle: "A Love Supreme"},
		{RecordID: "3", ArtistName: "Thelonious Monk", AlbumTitle: "Brilliant Corners"},
	}
}

func newTestModel(records []db.Record) Model {
	store := &mockStore{records: records}
	m := NewModel(store)
	m.width = 120
	m.height = 40
	m.loading = false
	m.records = records
	m.filtered = records
	return m
}

func TestNewModel(t *testing.T) {
	store := &mockStore{}
	m := NewModel(store)
	if !m.loading {
		t.Error("new model should be loading")
	}
	if m.imgCache == nil {
		t.Error("imgCache should be initialized")
	}
}

func TestModelInit(t *testing.T) {
	store := &mockStore{records: testRecords()}
	m := NewModel(store)
	cmd := m.Init()
	if cmd == nil {
		t.Error("Init should return a command")
	}
}

func TestModelUpdateWindowSize(t *testing.T) {
	m := newTestModel(testRecords())
	updated, _ := m.Update(tea.WindowSizeMsg{Width: 200, Height: 50})
	model := updated.(Model)
	if model.width != 200 || model.height != 50 {
		t.Errorf("size = %dx%d, want 200x50", model.width, model.height)
	}
}

func TestModelUpdateRecordsLoaded(t *testing.T) {
	m := newTestModel(nil)
	m.loading = true
	records := testRecords()
	updated, _ := m.Update(recordsLoadedMsg{records: records})
	model := updated.(Model)
	if model.loading {
		t.Error("should not be loading after records loaded")
	}
	if len(model.records) != 3 {
		t.Errorf("records count = %d, want 3", len(model.records))
	}
	if model.cursor != 0 {
		t.Errorf("cursor = %d, want 0", model.cursor)
	}
}

func TestModelUpdateRecordsError(t *testing.T) {
	m := newTestModel(nil)
	m.loading = true
	updated, _ := m.Update(recordsLoadedMsg{err: errors.New("db error")})
	model := updated.(Model)
	if model.err == nil {
		t.Error("err should be set on error msg")
	}
}

func TestModelUpdateImageLoaded(t *testing.T) {
	m := newTestModel(testRecords())
	m.artLoading = true
	updated, _ := m.Update(imageLoadedMsg{url: "http://img.jpg", render: "rendered"})
	model := updated.(Model)
	if model.artLoading {
		t.Error("artLoading should be false")
	}
	if model.artRender != "rendered" {
		t.Errorf("artRender = %q, want %q", model.artRender, "rendered")
	}
	cached, ok := model.imgCache.get("http://img.jpg")
	if !ok || cached.render != "rendered" {
		t.Error("image should be cached")
	}
}

func TestListNavigation(t *testing.T) {
	m := newTestModel(testRecords())

	// Move down
	updated, _ := m.Update(tea.KeyPressMsg{Code: tea.KeyDown})
	model := updated.(Model)
	if model.cursor != 1 {
		t.Errorf("cursor after down = %d, want 1", model.cursor)
	}

	// Move down again
	updated, _ = model.Update(tea.KeyPressMsg{Code: tea.KeyDown})
	model = updated.(Model)
	if model.cursor != 2 {
		t.Errorf("cursor after 2x down = %d, want 2", model.cursor)
	}

	// Move down at bottom (should stay)
	updated, _ = model.Update(tea.KeyPressMsg{Code: tea.KeyDown})
	model = updated.(Model)
	if model.cursor != 2 {
		t.Errorf("cursor at bottom = %d, want 2", model.cursor)
	}

	// Move up
	updated, _ = model.Update(tea.KeyPressMsg{Code: tea.KeyUp})
	model = updated.(Model)
	if model.cursor != 1 {
		t.Errorf("cursor after up = %d, want 1", model.cursor)
	}
}

func TestListNavigationJK(t *testing.T) {
	m := newTestModel(testRecords())

	updated, _ := m.Update(keyMsg("j"))
	model := updated.(Model)
	if model.cursor != 1 {
		t.Errorf("cursor after j = %d, want 1", model.cursor)
	}

	updated, _ = model.Update(keyMsg("k"))
	model = updated.(Model)
	if model.cursor != 0 {
		t.Errorf("cursor after k = %d, want 0", model.cursor)
	}
}

func TestListNavigationHomeEnd(t *testing.T) {
	m := newTestModel(testRecords())
	m.cursor = 1

	updated, _ := m.Update(tea.KeyPressMsg{Code: tea.KeyEnd})
	model := updated.(Model)
	if model.cursor != 2 {
		t.Errorf("cursor after End = %d, want 2", model.cursor)
	}

	updated, _ = model.Update(tea.KeyPressMsg{Code: tea.KeyHome})
	model = updated.(Model)
	if model.cursor != 0 {
		t.Errorf("cursor after Home = %d, want 0", model.cursor)
	}
}

func TestListNavigationGShift(t *testing.T) {
	m := newTestModel(testRecords())

	updated, _ := m.Update(keyMsg("G"))
	model := updated.(Model)
	if model.cursor != 2 {
		t.Errorf("cursor after G = %d, want 2", model.cursor)
	}

	updated, _ = model.Update(keyMsg("g"))
	model = updated.(Model)
	if model.cursor != 0 {
		t.Errorf("cursor after g = %d, want 0", model.cursor)
	}
}

func TestEnterDetailView(t *testing.T) {
	m := newTestModel(testRecords())
	// Pre-cache an image to test the cached path
	m.imgCache.set("", cachedImage{render: "cached-placeholder"})

	updated, cmd := m.Update(tea.KeyPressMsg{Code: tea.KeyEnter})
	model := updated.(Model)
	if model.view != detailView {
		t.Error("enter should switch to detail view")
	}
	if model.artRender != "cached-placeholder" {
		// Image was cached, so artLoading should be false
		if model.artLoading {
			t.Error("artLoading should be false when cached")
		}
	}
	_ = cmd
}

func TestEnterDetailViewUncached(t *testing.T) {
	m := newTestModel(testRecords())
	// Don't pre-cache — should trigger load command
	updated, cmd := m.Update(tea.KeyPressMsg{Code: tea.KeyEnter})
	model := updated.(Model)
	if model.view != detailView {
		t.Error("enter should switch to detail view")
	}
	if !model.artLoading {
		t.Error("artLoading should be true when not cached")
	}
	if cmd == nil {
		t.Error("should return image load command")
	}
}

func TestDetailViewBack(t *testing.T) {
	m := newTestModel(testRecords())
	m.view = detailView

	for _, key := range []string{"q", "esc", "backspace"} {
		m.view = detailView
		updated, _ := m.Update(keyMsg(key))
		model := updated.(Model)
		if model.view != listView {
			t.Errorf("key %q should return to list view", key)
		}
	}
}

func TestDetailViewQuit(t *testing.T) {
	m := newTestModel(testRecords())
	m.view = detailView
	_, cmd := m.Update(keyMsg("ctrl+c"))
	if cmd == nil {
		t.Error("ctrl+c in detail should return quit cmd")
	}
}

func TestSearchMode(t *testing.T) {
	m := newTestModel(testRecords())

	// Enter search mode
	updated, _ := m.Update(keyMsg("/"))
	model := updated.(Model)
	if !model.searching {
		t.Error("/ should enter search mode")
	}

	// Type characters
	updated, _ = model.Update(keyMsg("m"))
	model = updated.(Model)
	if model.search != "m" {
		t.Errorf("search = %q, want %q", model.search, "m")
	}

	updated, _ = model.Update(keyMsg("i"))
	model = updated.(Model)
	if model.search != "mi" {
		t.Errorf("search = %q, want %q", model.search, "mi")
	}

	// Backspace
	updated, _ = model.Update(keyMsg("backspace"))
	model = updated.(Model)
	if model.search != "m" {
		t.Errorf("search after backspace = %q, want %q", model.search, "m")
	}
}

func TestSearchBackspaceEmpty(t *testing.T) {
	m := newTestModel(testRecords())
	m.searching = true
	m.search = ""

	updated, _ := m.Update(keyMsg("backspace"))
	model := updated.(Model)
	if model.search != "" {
		t.Error("backspace on empty search should stay empty")
	}
}

func TestSearchEscCancel(t *testing.T) {
	m := newTestModel(testRecords())
	m.searching = true
	m.search = "test"

	updated, _ := m.Update(keyMsg("esc"))
	model := updated.(Model)
	if model.searching {
		t.Error("esc should cancel search")
	}
	if model.search != "" {
		t.Error("esc should clear search text")
	}
	if len(model.filtered) != len(model.records) {
		t.Error("esc should restore all records")
	}
}

func TestSearchEnterEmpty(t *testing.T) {
	m := newTestModel(testRecords())
	m.searching = true
	m.search = ""

	updated, _ := m.Update(keyMsg("enter"))
	model := updated.(Model)
	if model.searching {
		t.Error("enter should exit search mode")
	}
	if len(model.filtered) != len(model.records) {
		t.Error("empty search should show all records")
	}
}

func TestSearchEnterWithQuery(t *testing.T) {
	m := newTestModel(testRecords())
	m.searching = true
	m.search = "miles"

	_, cmd := m.Update(keyMsg("enter"))
	if cmd == nil {
		t.Error("search with query should return search command")
	}
}

func TestSearchIgnoresMultiCharKeys(t *testing.T) {
	m := newTestModel(testRecords())
	m.searching = true
	m.search = ""

	// Multi-char key string should be ignored
	updated, _ := m.Update(keyMsg("tab"))
	model := updated.(Model)
	if model.search != "" {
		t.Errorf("multi-char key should not add to search, got %q", model.search)
	}
}

func TestQuit(t *testing.T) {
	m := newTestModel(testRecords())

	_, cmd := m.Update(keyMsg("q"))
	if cmd == nil {
		t.Error("q should return quit command")
	}
}

func TestCtrlCQuit(t *testing.T) {
	m := newTestModel(testRecords())

	_, cmd := m.Update(keyMsg("ctrl+c"))
	if cmd == nil {
		t.Error("ctrl+c should return quit command")
	}
}

func TestReload(t *testing.T) {
	m := newTestModel(testRecords())

	updated, cmd := m.Update(keyMsg("r"))
	model := updated.(Model)
	if !model.loading {
		t.Error("r should set loading")
	}
	if cmd == nil {
		t.Error("r should return load command")
	}
}

func TestViewZeroWidth(t *testing.T) {
	m := newTestModel(testRecords())
	m.width = 0
	v := m.View()
	if v.Content != "Loading..." {
		t.Errorf("zero width view = %q, want %q", v.Content, "Loading...")
	}
}

func TestViewListRendering(t *testing.T) {
	m := newTestModel(testRecords())
	v := m.View()
	body := v.Content
	if !strings.Contains(body, "Record Collection") {
		t.Error("list view should contain title")
	}
	if !strings.Contains(body, "3 records") {
		t.Error("list view should show record count")
	}
	if !strings.Contains(body, "Miles Davis") {
		t.Error("list view should contain artist name")
	}
}

func TestViewListLoading(t *testing.T) {
	m := newTestModel(nil)
	m.loading = true
	v := m.View()
	if !strings.Contains(v.Content, "Loading") {
		t.Error("loading view should say Loading")
	}
}

func TestViewListError(t *testing.T) {
	m := newTestModel(nil)
	m.err = errors.New("connection failed")
	v := m.View()
	if !strings.Contains(v.Content, "connection failed") {
		t.Error("error view should show error message")
	}
}

func TestViewListEmpty(t *testing.T) {
	m := newTestModel([]db.Record{})
	v := m.View()
	if !strings.Contains(v.Content, "No records") {
		t.Error("empty view should say 'No records'")
	}
}

func TestViewDetailRendering(t *testing.T) {
	m := newTestModel(testRecords())
	m.view = detailView
	m.artRender = "fake-art"
	v := m.View()
	body := v.Content
	if !strings.Contains(body, "Miles Davis") {
		t.Error("detail should show artist")
	}
	if !strings.Contains(body, "Kind of Blue") {
		t.Error("detail should show album")
	}
}

func TestViewDetailNoRecord(t *testing.T) {
	m := newTestModel([]db.Record{})
	m.view = detailView
	m.cursor = 5
	v := m.View()
	if !strings.Contains(v.Content, "No record selected") {
		t.Error("out of range cursor should show 'No record selected'")
	}
}

func TestViewSearchMode(t *testing.T) {
	m := newTestModel(testRecords())
	m.searching = true
	m.search = "test"
	v := m.View()
	if !strings.Contains(v.Content, "Search:") {
		t.Error("search mode should show search prompt")
	}
}

func TestRenderHelp(t *testing.T) {
	m := newTestModel(testRecords())

	help := m.renderHelp()
	if !strings.Contains(help, "quit") {
		t.Error("list help should mention quit")
	}

	m.searching = true
	help = m.renderHelp()
	if !strings.Contains(help, "cancel") {
		t.Error("search help should mention cancel")
	}
}

func TestColumnWidths(t *testing.T) {
	m := newTestModel(testRecords())
	m.width = 120
	cols := m.columnWidths()
	total := cols[0] + cols[1] + cols[2] + cols[3] + cols[4]
	if total <= 0 {
		t.Error("column widths should be positive")
	}
	if cols[2] != 6 {
		t.Errorf("year column = %d, want 6", cols[2])
	}
}

func TestColumnWidthsNarrow(t *testing.T) {
	m := newTestModel(testRecords())
	m.width = 10
	cols := m.columnWidths()
	for i, c := range cols {
		if c < 0 {
			t.Errorf("column %d width = %d, should not be negative", i, c)
		}
	}
}

func TestTruncPad(t *testing.T) {
	tests := []struct {
		name  string
		s     string
		width int
		want  string
	}{
		{"short string padded", "hi", 5, "hi   "},
		{"exact fit", "test", 4, "test"},
		{"truncated with ellipsis", "toolongstring", 5, "tool…"},
		{"zero width", "test", 0, ""},
		{"width 1 truncation", "long", 1, "l"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := truncPad(tt.s, tt.width)
			if got != tt.want {
				t.Errorf("truncPad(%q, %d) = %q, want %q", tt.s, tt.width, got, tt.want)
			}
		})
	}
}

func TestListVisibleRows(t *testing.T) {
	m := newTestModel(testRecords())
	m.height = 40
	rows := m.listVisibleRows()
	if rows != 34 {
		t.Errorf("listVisibleRows() = %d, want 34", rows)
	}
}

func TestListVisibleRowsSmall(t *testing.T) {
	m := newTestModel(testRecords())
	m.height = 3
	rows := m.listVisibleRows()
	if rows != 1 {
		t.Errorf("listVisibleRows() with small height = %d, want 1", rows)
	}
}

func TestScrolling(t *testing.T) {
	records := make([]db.Record, 50)
	for i := range records {
		records[i] = db.Record{ArtistName: "Artist", AlbumTitle: "Album"}
	}
	m := newTestModel(records)
	m.height = 10

	// Move down past visible area
	for range 8 {
		updated, _ := m.Update(tea.KeyPressMsg{Code: tea.KeyDown})
		m = updated.(Model)
	}
	if m.cursor != 8 {
		t.Errorf("cursor = %d, want 8", m.cursor)
	}
	if m.offset <= 0 {
		t.Error("offset should have increased for scrolling")
	}
}

func TestScrollUpAdjustsOffset(t *testing.T) {
	records := make([]db.Record, 50)
	for i := range records {
		records[i] = db.Record{ArtistName: "Artist", AlbumTitle: "Album"}
	}
	m := newTestModel(records)
	m.height = 10
	m.cursor = 10
	m.offset = 10

	// Move up — should adjust offset
	updated, _ := m.Update(tea.KeyPressMsg{Code: tea.KeyUp})
	model := updated.(Model)
	if model.cursor != 9 {
		t.Errorf("cursor = %d, want 9", model.cursor)
	}
	if model.offset > model.cursor {
		t.Error("offset should not be greater than cursor")
	}
}

func TestEnterEmptyList(t *testing.T) {
	m := newTestModel([]db.Record{})
	updated, _ := m.Update(tea.KeyPressMsg{Code: tea.KeyEnter})
	model := updated.(Model)
	if model.view != listView {
		t.Error("enter on empty list should stay in list view")
	}
}

func TestUnknownMsgType(t *testing.T) {
	m := newTestModel(testRecords())
	type unknownMsg struct{}
	updated, cmd := m.Update(unknownMsg{})
	model := updated.(Model)
	if model.cursor != m.cursor {
		t.Error("unknown msg should not change state")
	}
	if cmd != nil {
		t.Error("unknown msg should not return command")
	}
}

func TestDetailViewRecordFields(t *testing.T) {
	catalog := "CAT-001"
	upc := "123456789"
	records := []db.Record{{
		ArtistName:          "Test Artist",
		AlbumTitle:          "Test Album",
		IsSyncedWithDiscogs: true,
		CatalogNumber:       &catalog,
		UPCCode:             &upc,
	}}
	m := newTestModel(records)
	m.view = detailView
	v := m.View()
	body := v.Content
	if !strings.Contains(body, "CAT-001") {
		t.Error("detail should show catalog number")
	}
	if !strings.Contains(body, "123456789") {
		t.Error("detail should show UPC")
	}
	if !strings.Contains(body, "✓") {
		t.Error("synced record should show checkmark")
	}
}

func TestDetailViewNotSynced(t *testing.T) {
	records := []db.Record{{
		ArtistName:          "Test",
		AlbumTitle:          "Album",
		IsSyncedWithDiscogs: false,
	}}
	m := newTestModel(records)
	m.view = detailView
	v := m.View()
	if !strings.Contains(v.Content, "✗") {
		t.Error("not synced should show ✗")
	}
}

func TestDetailMosaicLayout(t *testing.T) {
	m := newTestModel(testRecords())
	m.view = detailView
	m.imgProto = protoMosaic
	m.artRender = "mosaic-art"
	v := m.View()
	if !strings.Contains(v.Content, "mosaic-art") {
		t.Error("mosaic layout should include art inline")
	}
}

func TestDetailNativeLayout(t *testing.T) {
	m := newTestModel(testRecords())
	m.view = detailView
	m.imgProto = protoKitty
	m.artRender = "kitty-art"
	v := m.View()
	if !strings.Contains(v.Content, "kitty-art") {
		t.Error("native layout should include art")
	}
}

func TestDetailArtLoading(t *testing.T) {
	m := newTestModel(testRecords())
	m.view = detailView
	m.artLoading = true
	m.artRender = ""
	v := m.View()
	if !strings.Contains(v.Content, "Loading") {
		t.Error("loading art should show Loading placeholder")
	}
}

func TestDetailNoArt(t *testing.T) {
	m := newTestModel(testRecords())
	m.view = detailView
	m.artLoading = false
	m.artRender = ""
	v := m.View()
	if !strings.Contains(v.Content, "No Image") {
		t.Error("no art should show placeholder")
	}
}

func TestScrollInfoShown(t *testing.T) {
	records := make([]db.Record, 100)
	for i := range records {
		records[i] = db.Record{ArtistName: "A", AlbumTitle: "B"}
	}
	m := newTestModel(records)
	m.height = 10
	v := m.View()
	if !strings.Contains(v.Content, "of 100") {
		t.Error("scroll info should show total count")
	}
}

func TestLoadRecordsCmd(t *testing.T) {
	store := &mockStore{records: testRecords()}
	cmd := loadRecords(store)
	if cmd == nil {
		t.Fatal("loadRecords should return a command")
	}
	msg := cmd()
	loaded, ok := msg.(recordsLoadedMsg)
	if !ok {
		t.Fatal("command should produce recordsLoadedMsg")
	}
	if len(loaded.records) != 3 {
		t.Errorf("loaded %d records, want 3", len(loaded.records))
	}
}

func TestSearchRecordsCmd(t *testing.T) {
	store := &mockStore{records: testRecords()}
	cmd := searchRecords(store, "miles")
	if cmd == nil {
		t.Fatal("searchRecords should return a command")
	}
	msg := cmd()
	loaded, ok := msg.(recordsLoadedMsg)
	if !ok {
		t.Fatal("command should produce recordsLoadedMsg")
	}
	if len(loaded.records) != 1 {
		t.Errorf("search returned %d records, want 1", len(loaded.records))
	}
}

func TestLoadImageCmd(t *testing.T) {
	cmd := loadImage(protoMosaic, "", 20, 10)
	if cmd == nil {
		t.Fatal("loadImage should return a command")
	}
	msg := cmd()
	imgMsg, ok := msg.(imageLoadedMsg)
	if !ok {
		t.Fatal("command should produce imageLoadedMsg")
	}
	if imgMsg.url != "" {
		t.Errorf("url = %q, want empty", imgMsg.url)
	}
}

func TestDetailProtoLabel(t *testing.T) {
	m := newTestModel(testRecords())
	m.view = detailView
	m.imgProto = protoSixel
	v := m.View()
	if !strings.Contains(v.Content, "sixel") {
		t.Error("detail should show image protocol label")
	}
}

// keyMsg creates a tea.KeyPressMsg from a string representation.
func keyMsg(key string) tea.KeyPressMsg {
	switch key {
	case "ctrl+c":
		return tea.KeyPressMsg{Code: 'c', Mod: tea.ModCtrl}
	case "esc":
		return tea.KeyPressMsg{Code: tea.KeyEscape}
	case "enter":
		return tea.KeyPressMsg{Code: tea.KeyEnter}
	case "backspace":
		return tea.KeyPressMsg{Code: tea.KeyBackspace}
	case "tab":
		return tea.KeyPressMsg{Code: tea.KeyTab}
	default:
		if len(key) == 1 {
			return tea.KeyPressMsg{Code: rune(key[0])}
		}
		return tea.KeyPressMsg{}
	}
}
