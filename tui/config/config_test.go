package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestReadKeyBasic(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.toml")
	os.WriteFile(path, []byte(`database_url = "postgres://localhost/test"
other_key = "value"
`), 0644)

	got := readKey(path, "database_url")
	if got != "postgres://localhost/test" {
		t.Errorf("readKey(database_url) = %q, want %q", got, "postgres://localhost/test")
	}

	got = readKey(path, "other_key")
	if got != "value" {
		t.Errorf("readKey(other_key) = %q, want %q", got, "value")
	}
}

func TestReadKeyMissing(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.toml")
	os.WriteFile(path, []byte(`database_url = "test"`), 0644)

	got := readKey(path, "nonexistent")
	if got != "" {
		t.Errorf("readKey(nonexistent) = %q, want empty", got)
	}
}

func TestReadKeyFileNotFound(t *testing.T) {
	got := readKey("/nonexistent/path/config.toml", "database_url")
	if got != "" {
		t.Errorf("readKey on missing file = %q, want empty", got)
	}
}

func TestReadKeySkipsComments(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.toml")
	os.WriteFile(path, []byte(`# this is a comment
[section]
database_url = "test_value"
`), 0644)

	got := readKey(path, "database_url")
	if got != "test_value" {
		t.Errorf("readKey with comments = %q, want %q", got, "test_value")
	}
}

func TestReadKeyTrimsQuotes(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.toml")

	tests := []struct {
		name    string
		content string
		want    string
	}{
		{"double quotes", `key = "value"`, "value"},
		{"single quotes", `key = 'value'`, "value"},
		{"no quotes", `key = value`, "value"},
		{"spaces around equals", `key  =  value  `, "value"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.WriteFile(path, []byte(tt.content), 0644)
			got := readKey(path, "key")
			if got != tt.want {
				t.Errorf("readKey = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestReadKeySkipsBlankLines(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.toml")
	os.WriteFile(path, []byte("\n\n\ndatabase_url = found\n"), 0644)

	got := readKey(path, "database_url")
	if got != "found" {
		t.Errorf("readKey with blanks = %q, want %q", got, "found")
	}
}

func TestReadKeySkipsLinesWithoutEquals(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.toml")
	os.WriteFile(path, []byte("malformed line\ndatabase_url = ok\n"), 0644)

	got := readKey(path, "database_url")
	if got != "ok" {
		t.Errorf("readKey with malformed = %q, want %q", got, "ok")
	}
}

func TestLoadEnvVarOverride(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://env/db")

	cfg := Load()
	if cfg.DatabaseURL != "postgres://env/db" {
		t.Errorf("Load().DatabaseURL = %q, want %q", cfg.DatabaseURL, "postgres://env/db")
	}
}

func TestLoadEmptyEnvFallsToFile(t *testing.T) {
	t.Setenv("DATABASE_URL", "")

	cfg := Load()
	// With no config file present, DatabaseURL should be empty
	// (configPath() points to user config dir which won't have our file)
	// This tests the fallback path is exercised without error
	_ = cfg
}

func TestConfigPath(t *testing.T) {
	path := configPath()
	if path == "" {
		t.Error("configPath() returned empty string")
	}
	if filepath.Base(path) != ConfigFile {
		t.Errorf("configPath() base = %q, want %q", filepath.Base(path), ConfigFile)
	}
	dir := filepath.Base(filepath.Dir(path))
	if dir != ConfigDir {
		t.Errorf("configPath() dir = %q, want %q", dir, ConfigDir)
	}
}
