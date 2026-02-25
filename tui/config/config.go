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
	dir, err := os.UserConfigDir()
	if err != nil {
		dir = filepath.Join(os.Getenv("HOME"), ".config")
	}
	return filepath.Join(dir, ConfigDir, ConfigFile)
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
	defer f.Close()

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
