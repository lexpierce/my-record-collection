package ui

import (
	"context"
	"encoding/json"
	"errors"
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

type discogsConfig struct {
	token     string
	userAgent string
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

func searchDiscogs(dcfg discogsConfig, query discogsSearchQuery) ([]discogsSearchResult, error) {
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
	if err := discogsGetJSON(dcfg, baseURL, "/database/search?"+params.Encode(), &searchResp); err != nil {
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

		release, err := fetchDiscogsRelease(dcfg, item.ID)
		if err == nil {
			result.RecordSize = extractRecordSize(release)
			result.VinylColor = extractVinylColor(release)
			result.IsShapedVinyl = isShapedVinyl(release)
		}

		results = append(results, result)
	}

	return results, nil
}

func addDiscogsReleaseToStore(store db.Store, releaseID int, username string, dcfg discogsConfig) error {
	release, err := fetchDiscogsRelease(dcfg, releaseID)
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

	if username != "" {
		err = addToDiscogsCollection(dcfg, username, releaseID)
		if err == nil {
			rec.IsSyncedWithDiscogs = true
		} else {
			if statusErr, ok := errors.AsType[discogsHTTPError](err); ok && statusErr.status == http.StatusConflict {
				rec.IsSyncedWithDiscogs = true
			}
		}
	}

	if err := store.Create(context.Background(), rec); err != nil {
		return err
	}
	return nil
}

func fetchDiscogsRelease(dcfg discogsConfig, releaseID int) (discogsRelease, error) {
	baseURL := os.Getenv("DISCOGS_BASE_URL")
	if strings.TrimSpace(baseURL) == "" {
		baseURL = "https://api.discogs.com"
	}
	var release discogsRelease
	err := discogsGetJSON(dcfg, baseURL, "/releases/"+strconv.Itoa(releaseID), &release)
	return release, err
}

func addToDiscogsCollection(dcfg discogsConfig, username string, releaseID int) error {
	baseURL := os.Getenv("DISCOGS_BASE_URL")
	if strings.TrimSpace(baseURL) == "" {
		baseURL = "https://api.discogs.com"
	}

	endpoint := "/users/" + url.PathEscape(username) + "/collection/folders/1/releases/" + strconv.Itoa(releaseID)
	_, err := discogsRequest(dcfg, http.MethodPost, baseURL, endpoint)
	return err
}

type discogsCollectionBasicInfo struct {
	ID           int         `json:"id"`
	Title        string      `json:"title"`
	Year         discogsYear `json:"year"`
	Thumb        string      `json:"thumb"`
	CoverImage   string      `json:"cover_image"`
	ResourceURL  string      `json:"resource_url"`
	Formats      []struct {
		Name         string   `json:"name"`
		Descriptions []string `json:"descriptions"`
		Text         string   `json:"text"`
	} `json:"formats"`
	Labels  []struct {
		Name  string `json:"name"`
		CatNo string `json:"catno"`
	} `json:"labels"`
	Genres  []string `json:"genres"`
	Styles  []string `json:"styles"`
	Artists []struct {
		Name string `json:"name"`
	} `json:"artists"`
}

type discogsCollectionRelease struct {
	BasicInformation discogsCollectionBasicInfo `json:"basic_information"`
}

type discogsCollectionResponse struct {
	Pagination struct {
		Page    int `json:"page"`
		Pages   int `json:"pages"`
		PerPage int `json:"per_page"`
		Items   int `json:"items"`
	} `json:"pagination"`
	Releases []discogsCollectionRelease `json:"releases"`
}

type syncProgress struct {
	Phase             string
	Pulled            int
	Pushed            int
	Skipped           int
	Errors            []string
	TotalDiscogsItems int
}

func getUserCollection(dcfg discogsConfig, username string, page int) (discogsCollectionResponse, error) {
	baseURL := os.Getenv("DISCOGS_BASE_URL")
	if strings.TrimSpace(baseURL) == "" {
		baseURL = "https://api.discogs.com"
	}

	endpoint := fmt.Sprintf(
		"/users/%s/collection/folders/0/releases?page=%d&per_page=100&sort=added&sort_order=desc",
		url.PathEscape(username), page,
	)

	var response discogsCollectionResponse
	if err := discogsGetJSON(dcfg, baseURL, endpoint, &response); err != nil {
		return discogsCollectionResponse{}, err
	}
	return response, nil
}

func collectionReleaseToRecord(info discogsCollectionBasicInfo) db.Record {
	release := discogsRelease{
		ID:         info.ID,
		Title:      info.Title,
		Year:       info.Year,
		Thumb:      info.Thumb,
		CoverImage: info.CoverImage,
		URI:        info.ResourceURL,
		Genres:     info.Genres,
		Styles:     info.Styles,
	}
	for _, a := range info.Artists {
		release.Artists = append(release.Artists, struct {
			Name string `json:"name"`
		}{Name: a.Name})
	}
	for _, l := range info.Labels {
		release.Labels = append(release.Labels, struct {
			Name  string `json:"name"`
			CatNo string `json:"catno"`
		}{Name: l.Name, CatNo: l.CatNo})
	}
	for _, f := range info.Formats {
		release.Formats = append(release.Formats, struct {
			Name         string   `json:"name"`
			Descriptions []string `json:"descriptions"`
			Text         string   `json:"text"`
		}{Name: f.Name, Descriptions: f.Descriptions, Text: f.Text})
	}

	discogsIDStr := strconv.Itoa(info.ID)
	return db.Record{
		ArtistName:          firstArtist(release),
		AlbumTitle:          release.Title,
		YearReleased:        yearPointer(int(release.Year)),
		LabelName:           firstLabel(release),
		CatalogNumber:       firstCatalogNumber(release),
		DiscogsID:           stringPointer(discogsIDStr),
		DiscogsURI:          nonEmptyPointer(release.URI),
		ThumbnailURL:        nonEmptyPointer(release.Thumb),
		CoverImageURL:       nonEmptyPointer(release.CoverImage),
		Genres:              release.Genres,
		Styles:              release.Styles,
		RecordSize:          nonEmptyPointer(extractRecordSize(release)),
		VinylColor:          nonEmptyPointer(extractVinylColor(release)),
		IsShapedVinyl:       boolPointer(isShapedVinyl(release)),
		DataSource:          "discogs",
		IsSyncedWithDiscogs: true,
	}
}

func executeSync(store db.Store, username string, dcfg discogsConfig, onProgress func(syncProgress)) error {
	if username == "" {
		return fmt.Errorf("discogs_username is required for sync")
	}
	if dcfg.token == "" {
		return fmt.Errorf("discogs_token is required for sync")
	}

	ctx := context.Background()
	progress := syncProgress{Phase: "pull"}
	onProgress(progress)

	existingIDs, err := store.ListDiscogsIDs(ctx)
	if err != nil {
		return fmt.Errorf("list discogs ids: %w", err)
	}

	discogsCollectionIDs := make(map[string]struct{})
	page := 1
	totalPages := 1

	for page <= totalPages {
		response, err := getUserCollection(dcfg, username, page)
		if err != nil {
			return fmt.Errorf("fetch discogs collection page %d: %w", page, err)
		}
		totalPages = response.Pagination.Pages
		progress.TotalDiscogsItems = response.Pagination.Items

		for _, release := range response.Releases {
			info := release.BasicInformation
			discogsID := strconv.Itoa(info.ID)
			discogsCollectionIDs[discogsID] = struct{}{}

			if _, exists := existingIDs[discogsID]; exists {
				progress.Skipped++
				continue
			}

			rec := collectionReleaseToRecord(info)
			if createErr := store.Create(ctx, rec); createErr != nil {
				msg := createErr.Error()
				if strings.Contains(msg, "unique") || strings.Contains(msg, "duplicate") {
					progress.Skipped++
				} else {
					progress.Errors = append(progress.Errors, fmt.Sprintf("pull %s: %s", discogsID, msg))
				}
			} else {
				progress.Pulled++
				existingIDs[discogsID] = struct{}{}
			}
		}

		onProgress(progress)
		page++
	}

	idsToMark := make([]string, 0, len(discogsCollectionIDs))
	for id := range discogsCollectionIDs {
		idsToMark = append(idsToMark, id)
	}
	if len(idsToMark) > 0 {
		if markErr := store.MarkSyncedWithDiscogs(ctx, idsToMark); markErr != nil {
			progress.Errors = append(progress.Errors, fmt.Sprintf("mark synced: %s", markErr.Error()))
		}
	}

	progress.Phase = "push"
	onProgress(progress)

	unsyncedRecords, err := store.ListUnsyncedDiscogsRecords(ctx)
	if err != nil {
		return fmt.Errorf("list unsynced records: %w", err)
	}

	for _, rec := range unsyncedRecords {
		if rec.DiscogsID == nil {
			continue
		}
		discogsID := *rec.DiscogsID
		if _, inCollection := discogsCollectionIDs[discogsID]; inCollection {
			if markErr := store.MarkSyncedWithDiscogs(ctx, []string{discogsID}); markErr != nil {
				progress.Errors = append(progress.Errors, fmt.Sprintf("mark synced %s: %s", discogsID, markErr.Error()))
			} else {
				progress.Pushed++
			}
			onProgress(progress)
			continue
		}

		releaseID, parseErr := strconv.Atoi(discogsID)
		if parseErr != nil || releaseID <= 0 {
			progress.Errors = append(progress.Errors, fmt.Sprintf("push %s: invalid discogs id", discogsID))
			onProgress(progress)
			continue
		}

		pushErr := addToDiscogsCollection(dcfg, username, releaseID)
		if pushErr == nil {
			if markErr := store.MarkSyncedWithDiscogs(ctx, []string{discogsID}); markErr != nil {
				progress.Errors = append(progress.Errors, fmt.Sprintf("mark synced %s: %s", discogsID, markErr.Error()))
			} else {
				progress.Pushed++
			}
		} else {
			if statusErr, ok := errors.AsType[discogsHTTPError](pushErr); ok && statusErr.status == http.StatusConflict { //nolint
				if markErr := store.MarkSyncedWithDiscogs(ctx, []string{discogsID}); markErr != nil {
					progress.Errors = append(progress.Errors, fmt.Sprintf("mark synced %s: %s", discogsID, markErr.Error()))
				} else {
					progress.Pushed++
				}
			} else {
				progress.Errors = append(progress.Errors, fmt.Sprintf("push %s: %s", discogsID, pushErr.Error()))
			}
		}
		onProgress(progress)
	}

	progress.Phase = "done"
	onProgress(progress)
	return nil
}

func discogsGetJSON(dcfg discogsConfig, baseURL, endpoint string, destination any) error {
	body, err := discogsRequest(dcfg, http.MethodGet, baseURL, endpoint)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(body, destination); err != nil {
		return fmt.Errorf("decode discogs response: %w", err)
	}
	return nil
}

func discogsRequest(dcfg discogsConfig, method, baseURL, endpoint string) ([]byte, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	request, err := http.NewRequest(method, strings.TrimRight(baseURL, "/")+endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("build discogs request: %w", err)
	}

	userAgent := strings.TrimSpace(dcfg.userAgent)
	if userAgent == "" {
		userAgent = "MyRecordCollectionTUI/1.0"
	}
	request.Header.Set("User-Agent", userAgent)

	if t := strings.TrimSpace(dcfg.token); t != "" {
		request.Header.Set("Authorization", "Discogs token="+t)
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
		if value != ""	{
			return new(value)
		}
	}
	return nil
}

func yearPointer(year int) *int {
	if year <= 0 {
		return nil
	}
	return new(year)
}

func nonEmptyPointer(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return new(trimmed)
}

func stringPointer(value string) *string {
	return new(value)
}

func boolPointer(value bool) *bool {
	return new(value)
}

func yearString(year int) string {
	if year <= 0 {
		return ""
	}
	return strconv.Itoa(year)
}
