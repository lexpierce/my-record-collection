package ui

import (
	lipgloss "charm.land/lipgloss/v2"
)

// Catppuccin Mocha palette
// https://github.com/catppuccin/catppuccin
var (
	base      = lipgloss.Color("#1e1e2e")
	surface0  = lipgloss.Color("#313244")
	surface1  = lipgloss.Color("#45475a")
	overlay0  = lipgloss.Color("#6c7086")
	subtext0  = lipgloss.Color("#a6adc8")
	text      = lipgloss.Color("#cdd6f4")
	lavender  = lipgloss.Color("#b4befe")
	mauve     = lipgloss.Color("#cba6f7")
	red       = lipgloss.Color("#f38ba8")
	green     = lipgloss.Color("#a6e3a1")
	peach     = lipgloss.Color("#fab387")
	rosewater = lipgloss.Color("#f5e0dc")

	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(mauve).
			Padding(0, 1)

	statusBarStyle = lipgloss.NewStyle().
			Foreground(overlay0).
			Padding(0, 1)

	headerStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(base).
			Background(mauve).
			Padding(0, 1)

	selectedRowStyle = lipgloss.NewStyle().
				Bold(true).
				Foreground(text).
				Background(surface1)

	normalRowStyle = lipgloss.NewStyle().
			Foreground(subtext0)

	detailBoxStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lavender).
			Padding(1, 2)

	labelStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lavender).
			Width(16)

	valueStyle = lipgloss.NewStyle().
			Foreground(text)

	syncedStyle = lipgloss.NewStyle().
			Foreground(green)

	notSyncedStyle = lipgloss.NewStyle().
			Foreground(red)

	searchStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(mauve).
			Padding(0, 1)

	helpStyle = lipgloss.NewStyle().
			Foreground(overlay0)
)
