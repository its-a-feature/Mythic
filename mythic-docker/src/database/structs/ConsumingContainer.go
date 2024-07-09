package databaseStructs

import "time"

type ConsumingContainer struct {
	ID               int             `db:"id" json:"id" toml:"id" yaml:"id"`
	Name             string          `db:"name" json:"name" toml:"name" yaml:"name"`
	Description      string          `db:"description" json:"description" toml:"description" yaml:"description"`
	Type             string          `db:"type" json:"type" toml:"type" yaml:"type"`
	Subscriptions    MythicJSONArray `db:"subscriptions" json:"subscriptions" toml:"subscriptions" yaml:"subscriptions"`
	Deleted          bool            `db:"deleted" json:"deleted" toml:"deleted" yaml:"deleted"`
	ContainerRunning bool            `db:"container_running" json:"container_running" toml:"container_running" yaml:"container_running"`
	UpdatedAt        time.Time       `db:"updated_at" json:"updated_at"`
	CreatedAt        time.Time       `db:"created_at" json:"created_at"`
}
