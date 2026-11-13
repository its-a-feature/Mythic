package databaseStructs

import (
	"time"

	authz "github.com/its-a-feature/Mythic/authorization"
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
	SemVer           string    `db:"semver"`
	HasLogo          bool      `db:"has_logo"`
}

// AuthorizationPolicy keeps c2profile permissions beside its database model.
func (C2profile) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table: authz.TableRef{Schema: "public", Name: "c2profile"},
		Read:  authz.Rule{Public: true},
		Write: authz.Rule{Permission: authz.SCOPE_MYTHIC_WRITE},
	}
}
