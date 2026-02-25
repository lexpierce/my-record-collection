package db

import (
	"testing"
)

//go:fix inline
func strPtr(s string) *string { return new(s) }

//go:fix inline
func intPtr(i int) *int { return new(i) }

func TestYearString(t *testing.T) {
	tests := []struct {
		name string
		year *int
		want string
	}{
		{"with year", new(1977), "1977"},
		{"nil year", nil, "—"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := Record{YearReleased: tt.year}
			if got := r.YearString(); got != tt.want {
				t.Errorf("YearString() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestLabelString(t *testing.T) {
	tests := []struct {
		name  string
		label *string
		want  string
	}{
		{"with label", new("Blue Note"), "Blue Note"},
		{"nil label", nil, "—"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := Record{LabelName: tt.label}
			if got := r.LabelString(); got != tt.want {
				t.Errorf("LabelString() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestGenresString(t *testing.T) {
	tests := []struct {
		name   string
		genres []string
		want   string
	}{
		{"multiple", []string{"Rock", "Jazz"}, "Rock, Jazz"},
		{"single", []string{"Electronic"}, "Electronic"},
		{"empty", nil, "—"},
		{"empty slice", []string{}, "—"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := Record{Genres: tt.genres}
			if got := r.GenresString(); got != tt.want {
				t.Errorf("GenresString() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestStylesString(t *testing.T) {
	tests := []struct {
		name   string
		styles []string
		want   string
	}{
		{"multiple", []string{"Hard Bop", "Post-Punk"}, "Hard Bop, Post-Punk"},
		{"empty", nil, "—"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := Record{Styles: tt.styles}
			if got := r.StylesString(); got != tt.want {
				t.Errorf("StylesString() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestSizeString(t *testing.T) {
	tests := []struct {
		name string
		size *string
		want string
	}{
		{"12 inch", new("12\""), "12\""},
		{"nil", nil, "—"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := Record{RecordSize: tt.size}
			if got := r.SizeString(); got != tt.want {
				t.Errorf("SizeString() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestColorString(t *testing.T) {
	tests := []struct {
		name  string
		color *string
		want  string
	}{
		{"red vinyl", new("Red"), "Red"},
		{"nil", nil, "—"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := Record{VinylColor: tt.color}
			if got := r.ColorString(); got != tt.want {
				t.Errorf("ColorString() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestImageURL(t *testing.T) {
	tests := []struct {
		name      string
		cover     *string
		thumbnail *string
		want      string
	}{
		{"cover preferred", new("https://cover.jpg"), new("https://thumb.jpg"), "https://cover.jpg"},
		{"thumbnail fallback", nil, new("https://thumb.jpg"), "https://thumb.jpg"},
		{"both nil", nil, nil, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := Record{CoverImageURL: tt.cover, ThumbnailURL: tt.thumbnail}
			if got := r.ImageURL(); got != tt.want {
				t.Errorf("ImageURL() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestConnectEmptyURL(t *testing.T) {
	_, err := Connect("")
	if err == nil {
		t.Fatal("Connect(\"\") should return error")
	}
	want := "database_url not configured"
	if got := err.Error(); got[:len(want)] != want {
		t.Errorf("Connect error = %q, want prefix %q", got, want)
	}
}

func TestNewRecordStore(t *testing.T) {
	store := NewRecordStore(nil)
	if store == nil {
		t.Fatal("NewRecordStore returned nil")
	}
}

func TestStoreInterfaceCompliance(t *testing.T) {
	var _ Store = (*RecordStore)(nil)
}
