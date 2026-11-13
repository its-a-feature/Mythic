package databaseStructs

import authz "github.com/its-a-feature/Mythic/authorization"

type Staginginfo struct {
	ID          int     `db:"id"`
	SessionID   string  `db:"session_id"`
	EncKey      *[]byte `db:"enc_key"`
	DecKey      *[]byte `db:"dec_key"`
	CryptoType  string  `db:"crypto_type"`
	StagingUuID string  `db:"staging_uuid"`
	PayloadID   int     `db:"payload_id"`
	Payload     Payload `db:"payload"`
}

// AuthorizationPolicy keeps staginginfo permissions beside its database model.
func (Staginginfo) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "staginginfo"},
		OperationPath: []string{"payload", "operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_PAYLOAD_READ},
	}
}
