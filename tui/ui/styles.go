package ui

import (
	lipgloss "charm.land/lipgloss/v2"
)

var (
	purple  = lipgloss.Color("#AD8CFF")
	subtle  = lipgloss.Color("#aaaaaa")
	red     = lipgloss.Color("#FF6347")
	green   = lipgloss.Color("#6BCB77")
	white   = lipgloss.Color("#ffffff")
	dimText = lipgloss.Color("#dddddd")
	darkBg  = lipgloss.Color("#5A3DAA")

	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(purple).
			Padding(0, 1)

	statusBarStyle = lipgloss.NewStyle().
			Foreground(subtle).
			Padding(0, 1)

	headerStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(white).
			Background(purple).
			Padding(0, 1)

	selectedRowStyle = lipgloss.NewStyle().
				Bold(true).
				Foreground(white).
				Background(darkBg)

	normalRowStyle = lipgloss.NewStyle()

	detailBoxStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(purple).
			Padding(1, 2)

	labelStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(purple).
			Width(16)

	valueStyle = lipgloss.NewStyle().
			Foreground(dimText)

	syncedStyle = lipgloss.NewStyle().
			Foreground(green)

	notSyncedStyle = lipgloss.NewStyle().
			Foreground(red)

	searchStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(purple).
			Padding(0, 1)

	helpStyle = lipgloss.NewStyle().
			Foreground(subtle)
)
