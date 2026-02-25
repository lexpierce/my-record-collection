package db

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Record struct {
	RecordID            string
	ArtistName          string
	AlbumTitle          string
	YearReleased        *int
	LabelName           *string
	CatalogNumber       *string
	DiscogsID           *string
	DiscogsURI          *string
	IsSyncedWithDiscogs bool
	ThumbnailURL        *string
	CoverImageURL       *string
	Genres              []string
	Styles              []string
	UPCCode             *string
	RecordSize          *string
	VinylColor          *string
	IsShapedVinyl       *bool
	DataSource          string
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

func (r Record) YearString() string {
	if r.YearReleased != nil {
		return fmt.Sprintf("%d", *r.YearReleased)
	}
	return "—"
}

func (r Record) LabelString() string {
	if r.LabelName != nil {
		return *r.LabelName
	}
	return "—"
}

func (r Record) GenresString() string {
	if len(r.Genres) > 0 {
		return strings.Join(r.Genres, ", ")
	}
	return "—"
}

func (r Record) StylesString() string {
	if len(r.Styles) > 0 {
		return strings.Join(r.Styles, ", ")
	}
	return "—"
}

func (r Record) SizeString() string {
	if r.RecordSize != nil {
		return *r.RecordSize
	}
	return "—"
}

func (r Record) ColorString() string {
	if r.VinylColor != nil {
		return *r.VinylColor
	}
	return "—"
}

func (r Record) ImageURL() string {
	if r.CoverImageURL != nil {
		return *r.CoverImageURL
	}
	if r.ThumbnailURL != nil {
		return *r.ThumbnailURL
	}
	return ""
}

type Store interface {
	List(ctx context.Context) ([]Record, error)
	Search(ctx context.Context, query string) ([]Record, error)
	Delete(ctx context.Context, id string) error
	Create(ctx context.Context, r Record) error
}

type RecordStore struct {
	pool *pgxpool.Pool
}

func NewRecordStore(pool *pgxpool.Pool) *RecordStore {
	return &RecordStore{pool: pool}
}

func (s *RecordStore) List(ctx context.Context) ([]Record, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT record_id, artist_name, album_title, year_released, label_name,
			catalog_number, discogs_id, discogs_uri, is_synced_with_discogs,
			thumbnail_url, cover_image_url, genres, styles, upc_code,
			record_size, vinyl_color, is_shaped_vinyl, data_source,
			created_at, updated_at
		FROM records
		ORDER BY artist_name, album_title
	`)
	if err != nil {
		return nil, fmt.Errorf("query records: %w", err)
	}
	defer rows.Close()

	var records []Record
	for rows.Next() {
		var r Record
		err := rows.Scan(
			&r.RecordID, &r.ArtistName, &r.AlbumTitle, &r.YearReleased,
			&r.LabelName, &r.CatalogNumber, &r.DiscogsID, &r.DiscogsURI,
			&r.IsSyncedWithDiscogs, &r.ThumbnailURL, &r.CoverImageURL,
			&r.Genres, &r.Styles, &r.UPCCode, &r.RecordSize, &r.VinylColor,
			&r.IsShapedVinyl, &r.DataSource, &r.CreatedAt, &r.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan record: %w", err)
		}
		records = append(records, r)
	}
	return records, rows.Err()
}

func (s *RecordStore) Search(ctx context.Context, query string) ([]Record, error) {
	q := "%" + strings.ToLower(query) + "%"
	rows, err := s.pool.Query(ctx, `
		SELECT record_id, artist_name, album_title, year_released, label_name,
			catalog_number, discogs_id, discogs_uri, is_synced_with_discogs,
			thumbnail_url, cover_image_url, genres, styles, upc_code,
			record_size, vinyl_color, is_shaped_vinyl, data_source,
			created_at, updated_at
		FROM records
		WHERE LOWER(artist_name) LIKE $1 OR LOWER(album_title) LIKE $1
		ORDER BY artist_name, album_title
	`, q)
	if err != nil {
		return nil, fmt.Errorf("search records: %w", err)
	}
	defer rows.Close()

	var records []Record
	for rows.Next() {
		var r Record
		err := rows.Scan(
			&r.RecordID, &r.ArtistName, &r.AlbumTitle, &r.YearReleased,
			&r.LabelName, &r.CatalogNumber, &r.DiscogsID, &r.DiscogsURI,
			&r.IsSyncedWithDiscogs, &r.ThumbnailURL, &r.CoverImageURL,
			&r.Genres, &r.Styles, &r.UPCCode, &r.RecordSize, &r.VinylColor,
			&r.IsShapedVinyl, &r.DataSource, &r.CreatedAt, &r.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan record: %w", err)
		}
		records = append(records, r)
	}
	return records, rows.Err()
}

func (s *RecordStore) Delete(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM records WHERE record_id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete record: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("record not found: %s", id)
	}
	return nil
}

func (s *RecordStore) Create(ctx context.Context, r Record) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO records (artist_name, album_title, year_released, label_name,
			record_size, vinyl_color, data_source)
		VALUES ($1, $2, $3, $4, $5, $6, 'manual')
	`, r.ArtistName, r.AlbumTitle, r.YearReleased, r.LabelName,
		r.RecordSize, r.VinylColor)
	if err != nil {
		return fmt.Errorf("insert record: %w", err)
	}
	return nil
}
