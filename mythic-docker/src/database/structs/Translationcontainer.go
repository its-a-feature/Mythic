package databaseStructs

import authz "github.com/its-a-feature/Mythic/authorization"

type Translationcontainer struct {
	ID               int    `db:"id"`
	Name             string `db:"name"`
	Description      string `db:"description"`
	Author           string `db:"author"`
	Deleted          bool   `db:"deleted"`
	ContainerRunning bool   `db:"container_running"`
	SemVer           string `db:"semver"`
}

// AuthorizationPolicy keeps translationcontainer permissions beside its database model.
func (Translationcontainer) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table: authz.TableRef{Schema: "public", Name: "translationcontainer"},
		Read:  authz.Rule{Public: true},
		Write: authz.Rule{Permission: authz.SCOPE_MYTHIC_WRITE},
	}
}
