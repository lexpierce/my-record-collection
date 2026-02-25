package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

const (
	ConfigDir  = "myrecords"
	ConfigFile = "config.toml"
)

type Config struct {
	DatabaseURL string
}

func configPath() string {
	candidates := configPaths()
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	// Return the first candidate so error messages reference a real path.
	if len(candidates) > 0 {
		return candidates[0]
	}
	return ""
}

func configPaths() []string {
	var paths []string
	if dir, err := os.UserConfigDir(); err == nil {
		paths = append(paths, filepath.Join(dir, ConfigDir, ConfigFile))
	}
	home := os.Getenv("HOME")
	if home != "" {
		xdg := filepath.Join(home, ".config", ConfigDir, ConfigFile)
		// Avoid duplicates when UserConfigDir already returns ~/.config.
		if len(paths) == 0 || paths[0] != xdg {
			paths = append(paths, xdg)
		}
	}
	return paths
}

func Load() Config {
	var cfg Config

	if v := os.Getenv("DATABASE_URL"); v != "" {
		cfg.DatabaseURL = v
		return cfg
	}

	cfg.DatabaseURL = readKey(configPath(), "database_url")
	return cfg
}

func readKey(path, key string) string {
	f, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer func() { _ = f.Close() }()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "[") {
			continue
		}
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		k = strings.TrimSpace(k)
		v = strings.TrimSpace(v)
		v = strings.Trim(v, `"'`)
		if k == key {
			return v
		}
	}
	return ""
}
