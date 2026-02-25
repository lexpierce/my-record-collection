package main

import (
	"fmt"
	"os"

	tea "charm.land/bubbletea/v2"
	"my-record-collection-tui/config"
	"my-record-collection-tui/db"
	"my-record-collection-tui/ui"
)

func main() {
	cfg := config.Load()

	pool, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "database connection failed: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	store := db.NewRecordStore(pool)
	m := ui.NewModel(store)

	p := tea.NewProgram(m)
	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}
