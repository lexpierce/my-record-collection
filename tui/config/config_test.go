package config

import (
	"os"
	"path/filepath"
	"testing"
)

func writeFile(t *testing.T, path string, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}
}

func TestReadKeyBasic(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.toml")
	writeFile(t, path, "database_url = \"postgres://localhost/test\"\nother_key = \"value\"\n")

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
	writeFile(t, path, `database_url = "test"`)

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
	writeFile(t, path, "# this is a comment\n[section]\ndatabase_url = \"test_value\"\n")

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
			writeFile(t, path, tt.content)
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
	writeFile(t, path, "\n\n\ndatabase_url = found\n")

	got := readKey(path, "database_url")
	if got != "found" {
		t.Errorf("readKey with blanks = %q, want %q", got, "found")
	}
}

func TestReadKeySkipsLinesWithoutEquals(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.toml")
	writeFile(t, path, "malformed line\ndatabase_url = ok\n")

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

func TestConfigPathFallbackToXDG(t *testing.T) {
	// Create a temp dir that simulates ~/.config layout.
	tmp := t.TempDir()
	xdgDir := filepath.Join(tmp, ".config", ConfigDir)
	if err := os.MkdirAll(xdgDir, 0755); err != nil {
		t.Fatal(err)
	}
	writeFile(t, filepath.Join(xdgDir, ConfigFile), `database_url = "from_xdg"`)

	t.Setenv("HOME", tmp)

	// configPaths should include the XDG path.
	paths := configPaths()
	found := false
	for _, p := range paths {
		if p == filepath.Join(xdgDir, ConfigFile) {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("configPaths() = %v, want XDG path %q", paths, filepath.Join(xdgDir, ConfigFile))
	}

	// configPath should resolve to the XDG file when the platform dir doesn't exist.
	got := configPath()
	if got != filepath.Join(xdgDir, ConfigFile) {
		t.Errorf("configPath() = %q, want %q", got, filepath.Join(xdgDir, ConfigFile))
	}
}

func TestLoadFallbackXDGConfig(t *testing.T) {
	t.Setenv("DATABASE_URL", "")

	tmp := t.TempDir()
	xdgDir := filepath.Join(tmp, ".config", ConfigDir)
	if err := os.MkdirAll(xdgDir, 0755); err != nil {
		t.Fatal(err)
	}
	writeFile(t, filepath.Join(xdgDir, ConfigFile), `database_url = "postgres://xdg/db"`)

	t.Setenv("HOME", tmp)

	cfg := Load()
	if cfg.DatabaseURL != "postgres://xdg/db" {
		t.Errorf("Load().DatabaseURL = %q, want %q", cfg.DatabaseURL, "postgres://xdg/db")
	}
}
