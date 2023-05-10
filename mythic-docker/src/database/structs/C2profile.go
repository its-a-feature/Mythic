package databaseStructs

import (
	"time"
)

type C2profile struct {
	ID               int       `db:"id"`
	Name             string    `db:"name"`
	Description      string    `db:"description"`
	CreationTime     time.Time `db:"creation_time"`
	Running          bool      `db:"running"`
	ContainerRunning bool      `db:"container_running"`
	Author           string    `db:"author"`
	IsP2p            bool      `db:"is_p2p"`
	IsServerRouted   bool      `db:"is_server_routed"`
	Deleted          bool      `db:"deleted"`
}
