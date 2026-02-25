package db

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(databaseURL string) (*pgxpool.Pool, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("database_url not configured — set it in ~/.config/myrecords/config.toml or DATABASE_URL env var")
	}

	databaseURL = ensureSSL(databaseURL)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping: %w", err)
	}

	return pool, nil
}

func ensureSSL(url string) string {
	if strings.Contains(url, "sslmode=") {
		return url
	}
	if strings.Contains(url, "?") {
		return url + "&sslmode=require"
	}
	return url + "?sslmode=require"
}
