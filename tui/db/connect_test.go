package db

import (
	"testing"
)

func TestConnectInvalidURL(t *testing.T) {
	_, err := Connect("not-a-valid-postgres-url")
	if err == nil {
		t.Fatal("Connect with invalid URL should return error")
	}
}

func TestEnsureSSL(t *testing.T) {
	tests := []struct {
		name string
		url  string
		want string
	}{
		{"bare URL", "postgres://u:p@host/db", "postgres://u:p@host/db?sslmode=require"},
		{"existing query param", "postgres://u:p@host/db?connect_timeout=5", "postgres://u:p@host/db?connect_timeout=5&sslmode=require"},
		{"already has sslmode", "postgres://u:p@host/db?sslmode=disable", "postgres://u:p@host/db?sslmode=disable"},
		{"sslmode in multi params", "postgres://u:p@host/db?sslmode=verify-full&timeout=5", "postgres://u:p@host/db?sslmode=verify-full&timeout=5"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ensureSSL(tt.url)
			if got != tt.want {
				t.Errorf("ensureSSL(%q) = %q, want %q", tt.url, got, tt.want)
			}
		})
	}
}
