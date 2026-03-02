package ui

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"my-record-collection-tui/db"
)

type discogsSearchMethod int

const (
	discogsSearchArtistTitle discogsSearchMethod = iota
	discogsSearchCatalog
	discogsSearchUPC
)

type discogsSearchQuery struct {
	Method discogsSearchMethod
	Artist string
	Title  string
	Catalog string
	UPC    string
}

type discogsSearchResult struct {
	ID            int
	Title         string
	Year          string
	CatNo         string
	RecordSize    string
	VinylColor    string
	IsShapedVinyl bool
}

type discogsYear int

func (y *discogsYear) UnmarshalJSON(data []byte) error {
	trimmed := strings.TrimSpace(string(data))
	if trimmed == "" || trimmed == "null" {
		*y = 0
		return nil
	}

	var number int
	if err := json.Unmarshal(data, &number); err == nil {
		*y = discogsYear(number)
		return nil
	}

	var asString string
	if err := json.Unmarshal(data, &asString); err == nil {
		asString = strings.TrimSpace(asString)
		if asString == "" {
			*y = 0
			return nil
		}
		parsed, err := strconv.Atoi(asString)
		if err != nil {
			return fmt.Errorf("invalid year value %q", asString)
		}
		*y = discogsYear(parsed)
		return nil
	}

	return fmt.Errorf("invalid year value %s", trimmed)
}

type discogsSearchResponse struct {
	Results []struct {
		ID    int         `json:"id"`
		Title string      `json:"title"`
		Year  discogsYear `json:"year"`
		CatNo string      `json:"catno"`
	} `json:"results"`
}

type discogsRelease struct {
	ID         int         `json:"id"`
	Title      string      `json:"title"`
	URI        string      `json:"uri"`
	Year       discogsYear `json:"year"`
	Thumb      string      `json:"thumb"`
	CoverImage string `json:"cover_image"`
	Genres     []string `json:"genres"`
	Styles     []string `json:"styles"`
	Artists    []struct {
		Name string `json:"name"`
	} `json:"artists"`
	Labels []struct {
		Name  string `json:"name"`
		CatNo string `json:"catno"`
	} `json:"labels"`
	Formats []struct {
		Name         string   `json:"name"`
		Descriptions []string `json:"descriptions"`
		Text         string   `json:"text"`
	} `json:"formats"`
	Identifiers []struct {
		Type  string `json:"type"`
		Value string `json:"value"`
	} `json:"identifiers"`
}

type discogsHTTPError struct {
	status int
	err    error
}

func (e discogsHTTPError) Error() string {
	if e.err != nil {
		return e.err.Error()
	}
	return fmt.Sprintf("discogs request failed with status %d", e.status)
}

func searchDiscogs(query discogsSearchQuery) ([]discogsSearchResult, error) {
	baseURL := os.Getenv("DISCOGS_BASE_URL")
	if strings.TrimSpace(baseURL) == "" {
		baseURL = "https://api.discogs.com"
	}

	params := url.Values{}
	params.Set("type", "release")
	params.Set("format", "Vinyl")

	switch query.Method {
	case discogsSearchCatalog:
		if strings.TrimSpace(query.Catalog) == "" {
			return nil, fmt.Errorf("catalog number is required")
		}
		params.Set("catno", strings.TrimSpace(query.Catalog))
	case discogsSearchUPC:
		if strings.TrimSpace(query.UPC) == "" {
			return nil, fmt.Errorf("upc is required")
		}
		params.Set("barcode", strings.TrimSpace(query.UPC))
	default:
		if strings.TrimSpace(query.Artist) == "" || strings.TrimSpace(query.Title) == "" {
			return nil, fmt.Errorf("artist and album are required")
		}
		params.Set("artist", strings.TrimSpace(query.Artist))
		params.Set("title", strings.TrimSpace(query.Title))
	}

	var searchResp discogsSearchResponse
	if err := discogsGetJSON(baseURL, "/database/search?"+params.Encode(), &searchResp); err != nil {
		return nil, err
	}

	maxResults := min(10, len(searchResp.Results))
	results := make([]discogsSearchResult, 0, maxResults)
	for _, item := range searchResp.Results[:maxResults] {
		result := discogsSearchResult{
			ID:    item.ID,
			Title: item.Title,
			Year:  yearString(int(item.Year)),
			CatNo: strings.TrimSpace(item.CatNo),
		}

		release, err := fetchDiscogsRelease(item.ID)
		if err == nil {
			result.RecordSize = extractRecordSize(release)
			result.VinylColor = extractVinylColor(release)
			result.IsShapedVinyl = isShapedVinyl(release)
		}

		results = append(results, result)
	}

	return results, nil
}

func addDiscogsReleaseToStore(store db.Store, releaseID int) error {
	release, err := fetchDiscogsRelease(releaseID)
	if err != nil {
		return err
	}

	rec := db.Record{
		ArtistName:          firstArtist(release),
		AlbumTitle:          release.Title,
		YearReleased:        yearPointer(int(release.Year)),
		LabelName:           firstLabel(release),
		CatalogNumber:       firstCatalogNumber(release),
		DiscogsID:           stringPointer(strconv.Itoa(release.ID)),
		DiscogsURI:          nonEmptyPointer(release.URI),
		ThumbnailURL:        nonEmptyPointer(release.Thumb),
		CoverImageURL:       nonEmptyPointer(release.CoverImage),
		Genres:              release.Genres,
		Styles:              release.Styles,
		UPCCode:             releaseUPC(release),
		RecordSize:          nonEmptyPointer(extractRecordSize(release)),
		VinylColor:          nonEmptyPointer(extractVinylColor(release)),
		IsShapedVinyl:       boolPointer(isShapedVinyl(release)),
		DataSource:          "discogs",
		IsSyncedWithDiscogs: false,
	}

	username := strings.TrimSpace(os.Getenv("DISCOGS_USERNAME"))
	if username != "" {
		err = addToDiscogsCollection(username, releaseID)
		if err == nil {
			rec.IsSyncedWithDiscogs = true
		} else {
			var statusErr discogsHTTPError
			if errorsAs(err, &statusErr) && statusErr.status == http.StatusConflict {
				rec.IsSyncedWithDiscogs = true
			}
		}
	}

	if err := store.Create(context.Background(), rec); err != nil {
		return err
	}
	return nil
}

func fetchDiscogsRelease(releaseID int) (discogsRelease, error) {
	baseURL := os.Getenv("DISCOGS_BASE_URL")
	if strings.TrimSpace(baseURL) == "" {
		baseURL = "https://api.discogs.com"
	}
	var release discogsRelease
	err := discogsGetJSON(baseURL, "/releases/"+strconv.Itoa(releaseID), &release)
	return release, err
}

func addToDiscogsCollection(username string, releaseID int) error {
	baseURL := os.Getenv("DISCOGS_BASE_URL")
	if strings.TrimSpace(baseURL) == "" {
		baseURL = "https://api.discogs.com"
	}

	endpoint := "/users/" + url.PathEscape(username) + "/collection/folders/1/releases/" + strconv.Itoa(releaseID)
	_, err := discogsRequest(http.MethodPost, baseURL, endpoint)
	return err
}

func discogsGetJSON(baseURL, endpoint string, destination any) error {
	body, err := discogsRequest(http.MethodGet, baseURL, endpoint)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(body, destination); err != nil {
		return fmt.Errorf("decode discogs response: %w", err)
	}
	return nil
}

func discogsRequest(method, baseURL, endpoint string) ([]byte, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	request, err := http.NewRequest(method, strings.TrimRight(baseURL, "/")+endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("build discogs request: %w", err)
	}

	userAgent := strings.TrimSpace(os.Getenv("DISCOGS_USER_AGENT"))
	if userAgent == "" {
		userAgent = "MyRecordCollectionTUI/1.0"
	}
	request.Header.Set("User-Agent", userAgent)

	token := strings.TrimSpace(os.Getenv("DISCOGS_TOKEN"))
	if token != "" {
		request.Header.Set("Authorization", "Discogs token="+token)
	}

	response, err := client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("discogs request failed: %w", err)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("read discogs response: %w", err)
	}

	if response.StatusCode < 200 || response.StatusCode > 299 {
		return nil, discogsHTTPError{
			status: response.StatusCode,
			err:    fmt.Errorf("discogs request failed: %s", response.Status),
		}
	}

	return body, nil
}

func extractRecordSize(release discogsRelease) string {
	for _, format := range release.Formats {
		if !strings.EqualFold(format.Name, "Vinyl") {
			continue
		}
		for _, desc := range format.Descriptions {
			trimmed := strings.TrimSpace(desc)
			if strings.Contains(trimmed, "\"") || strings.Contains(strings.ToLower(trimmed), "inch") {
				return trimmed
			}
		}
	}
	return ""
}

func extractVinylColor(release discogsRelease) string {
	keywords := []string{"colored", "clear", "transparent", "marble", "splatter", "white", "black", "red", "blue", "green", "yellow", "purple", "pink", "orange", "grey", "gray"}
	for _, format := range release.Formats {
		if !strings.EqualFold(format.Name, "Vinyl") {
			continue
		}
		for _, desc := range format.Descriptions {
			lower := strings.ToLower(desc)
			for _, keyword := range keywords {
				if strings.Contains(lower, keyword) {
					return strings.TrimSpace(desc)
				}
			}
		}
		if format.Text != "" {
			lower := strings.ToLower(format.Text)
			for _, keyword := range keywords {
				if strings.Contains(lower, keyword) {
					return strings.TrimSpace(format.Text)
				}
			}
		}
	}
	return ""
}

func isShapedVinyl(release discogsRelease) bool {
	keywords := []string{"picture disc", "shaped", "shape"}
	for _, format := range release.Formats {
		if !strings.EqualFold(format.Name, "Vinyl") {
			continue
		}
		for _, desc := range format.Descriptions {
			lower := strings.ToLower(desc)
			for _, keyword := range keywords {
				if strings.Contains(lower, keyword) {
					return true
				}
			}
		}
	}
	return false
}

func firstArtist(release discogsRelease) string {
	if len(release.Artists) == 0 || strings.TrimSpace(release.Artists[0].Name) == "" {
		return "Unknown Artist"
	}
	return strings.TrimSpace(release.Artists[0].Name)
}

func firstLabel(release discogsRelease) *string {
	if len(release.Labels) == 0 {
		return nil
	}
	return nonEmptyPointer(release.Labels[0].Name)
}

func firstCatalogNumber(release discogsRelease) *string {
	if len(release.Labels) == 0 {
		return nil
	}
	return nonEmptyPointer(release.Labels[0].CatNo)
}

func releaseUPC(release discogsRelease) *string {
	for _, identifier := range release.Identifiers {
		if !strings.EqualFold(strings.TrimSpace(identifier.Type), "Barcode") {
			continue
		}
		value := strings.TrimSpace(strings.ReplaceAll(identifier.Value, " ", ""))
		if value != "" {
			return &value
		}
	}
	return nil
}

func yearPointer(year int) *int {
	if year <= 0 {
		return nil
	}
	return &year
}

func nonEmptyPointer(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func stringPointer(value string) *string {
	return &value
}

func boolPointer(value bool) *bool {
	return &value
}

func yearString(year int) string {
	if year <= 0 {
		return ""
	}
	return strconv.Itoa(year)
}

func errorsAs(err error, target any) bool {
	switch typed := target.(type) {
	case *discogsHTTPError:
		e, ok := err.(discogsHTTPError)
		if !ok {
			return false
		}
		*typed = e
		return true
	default:
		return false
	}
}
