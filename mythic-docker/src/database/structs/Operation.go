package databaseStructs

import (
	authz "github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/utils/structs"
	"time"
)

type Operation struct {
	ID          int               `db:"id"`
	Name        string            `db:"name"`
	AdminID     int               `db:"admin_id"`
	Complete    bool              `db:"complete"`
	Webhook     string            `db:"webhook"`
	Channel     string            `db:"channel"`
	Deleted     bool              `db:"deleted"`
	AlertCount  int               `db:"alert_count"`
	UpdatedAt   time.Time         `db:"updated_at"`
	BannerText  string            `db:"banner_text"`
	BannerColor string            `db:"banner_color"`
	APITokensID structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
}

// AuthorizationPolicy keeps operation permissions beside its database model.
func (Operation) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "operation"},
		OperationPath: []string{"id"},
		Read:          authz.Rule{Permission: authz.SCOPE_OPERATION_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_OPERATION_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "admin", Target: Operator{}},
			{Name: "apitoken", Target: Apitokens{}},
		},
	}
}
