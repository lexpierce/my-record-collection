package ui

import (
	"encoding/json"
	"testing"
)

func TestDiscogsYearUnmarshalAcceptsString(t *testing.T) {
	var year discogsYear
	if err := json.Unmarshal([]byte(`"1999"`), &year); err != nil {
		t.Fatalf("expected string year to unmarshal: %v", err)
	}
	if int(year) != 1999 {
		t.Fatalf("year = %d, want 1999", int(year))
	}
}

func TestDiscogsYearUnmarshalAcceptsNumber(t *testing.T) {
	var year discogsYear
	if err := json.Unmarshal([]byte(`2001`), &year); err != nil {
		t.Fatalf("expected numeric year to unmarshal: %v", err)
	}
	if int(year) != 2001 {
		t.Fatalf("year = %d, want 2001", int(year))
	}
}

func TestDiscogsSearchResponseUnmarshalMixedYearTypes(t *testing.T) {
	payload := []byte(`{"results":[{"id":1,"title":"A","year":"1984","catno":"CAT-1"},{"id":2,"title":"B","year":1985,"catno":"CAT-2"}]}`)

	var response discogsSearchResponse
	if err := json.Unmarshal(payload, &response); err != nil {
		t.Fatalf("expected mixed year types to decode: %v", err)
	}
	if len(response.Results) != 2 {
		t.Fatalf("results length = %d, want 2", len(response.Results))
	}
	if int(response.Results[0].Year) != 1984 {
		t.Fatalf("first year = %d, want 1984", int(response.Results[0].Year))
	}
	if int(response.Results[1].Year) != 1985 {
		t.Fatalf("second year = %d, want 1985", int(response.Results[1].Year))
	}
}
