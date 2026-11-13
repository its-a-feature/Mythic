package databaseStructs

import authz "github.com/its-a-feature/Mythic/authorization"

// MigrationTracking describes the internal catalog table for policy discovery.
type MigrationTracking struct {
}

// AuthorizationPolicy keeps mythic_server_migration_tracking permissions beside its database model.
func (MigrationTracking) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table: authz.TableRef{Schema: "public", Name: "mythic_server_migration_tracking"},
		Read:  authz.Rule{Public: true},
	}
}
