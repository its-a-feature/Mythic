package database

import (
	"fmt"
	"sort"
	"strings"

	"github.com/its-a-feature/Mythic/authorization"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/lib/pq"
)

type APITokenScopesOperationIDAndOperator struct {
	OperatorID int            `db:"operator_id"`
	Scopes     pq.StringArray `db:"scopes"`
	Role       string         `db:"view_mode"`
	Admin      bool           `db:"admin"`
}

// GetAPITokenScopesWithOperationID is shared by background work and RPC boundaries, where
// there is no bearer value to hash again. It never relies on selected operation.
func GetAPITokenScopesWithOperationID(tokenID, operationID int) (APITokenScopesOperationIDAndOperator, error) {
	var authority APITokenScopesOperationIDAndOperator
	if DB == nil {
		return authority, fmt.Errorf("database connection not initialized")
	}
	err := DB.Get(&authority, `SELECT 
    	t.operator_id,
    	t.scopes,
    	o.admin,
    	COALESCE(m.view_mode,'') view_mode
	 	FROM apitokens t 
	 	    JOIN operator o ON o.id=t.operator_id
	 	LEFT JOIN operatoroperation m ON m.operator_id=o.id AND m.operation_id=t.operation_id
	 	WHERE t.id=$1 AND 
	 	      t.operation_id=$2 AND 
	 	      t.active AND 
	 	      NOT t.deleted AND 
	 	      o.active AND 
	 	      NOT o.deleted AND 
	 	      (o.admin OR m.id IS NOT NULL)`, tokenID, operationID)
	return authority, err
}

// CreateAPIToken is the issuance boundary shared by HTTP, RPC, eventing, and
// container startup. Cleanup and expansion happen once here, before storage.
func CreateAPIToken(token *databaseStructs.Apitokens, requested []string, ceiling map[string]bool, sourceOperation int) (string, error) {
	if token.OperationID <= 0 || token.OperationID != sourceOperation {
		return "", fmt.Errorf("operation_id is required and must match the issuing token's operation")
	}
	catalog := authorization.ScopeDefinitions()
	definitions := map[string]authorization.ScopeDefinition{}
	for _, definition := range catalog {
		definitions[definition.Name] = definition
	}
	requestedPermissions := map[string]bool{}
	// try to match all requested scopes to real permissions that we can approve/deny
	for _, raw := range requested {
		requestedScope := strings.ToLower(strings.TrimSpace(raw))
		if requestedScope == "" {
			continue
		}
		matched := false
		for _, definition := range catalog {
			if requestedScope != definition.Name &&
				requestedScope != authorization.SCOPE_ALL &&
				requestedScope != definition.Resource+".*" {
				continue
			}
			matched = true
			requestedPermissions[definition.Name] = true
		}
		if !matched {
			return "", fmt.Errorf("unknown API token scope %q", requestedScope)
		}
	}
	if len(requestedPermissions) == 0 {
		return "", fmt.Errorf("API token creation requires an explicit nonempty scopes list")
	}
	// Follow implications once per newly discovered grant, including future
	// multi-level implications. Cycles cannot cause repeated processing.
	pending := []string{} // slice of actual permission names to grant
	for permission := range requestedPermissions {
		pending = append(pending, permission)
	}
	for i := 0; i < len(pending); i++ {
		for _, included := range definitions[pending[i]].Includes {
			if _, known := definitions[included]; !known {
				return "", fmt.Errorf("unknown implied API token scope %q", included)
			}
			// add an implied permission, like task.write implies task.read even if it wasn't explicitly requested
			if !requestedPermissions[included] {
				requestedPermissions[included] = true
				pending = append(pending, included)
			}
		}
	}
	token.Scopes = pq.StringArray{}
	for permission := range requestedPermissions {
		if !ceiling[authorization.SCOPE_ALL] && !ceiling[permission] {
			return "", fmt.Errorf("cannot grant API token scope %q without already having it", permission)
		}
		token.Scopes = append(token.Scopes, permission)
	}
	sort.Strings(token.Scopes)
	plain, hash, err := authorization.GenerateOpaqueAPIToken()
	if err != nil {
		return "", err
	}
	token.TokenValue = hash
	transaction, err := DB.Beginx()
	if err != nil {
		return "", err
	}
	defer transaction.Rollback()
	// Serialize issuance with owner disablement and membership removal. The
	// revocation triggers then see any token committed before those changes.
	var owner struct {
		Admin bool `db:"admin"`
	}
	if err = transaction.Get(&owner, `SELECT admin 
		FROM operator 
		WHERE id=$1 AND active=true AND deleted=false FOR SHARE`, token.OperatorID); err != nil {
		return "", fmt.Errorf("token owner is unavailable: %w", err)
	}
	var operation int
	if err = transaction.Get(&operation, `SELECT id 
		FROM operation WHERE id=$1 FOR KEY SHARE`, token.OperationID); err != nil {
		return "", fmt.Errorf("token operation is unavailable: %w", err)
	}
	if !owner.Admin {
		// verify operator is a member of the target operation or an admin
		var membership int
		if err = transaction.Get(&membership, `SELECT id 
			FROM operatoroperation 
			WHERE operator_id=$1 AND operation_id=$2 FOR SHARE`, token.OperatorID, token.OperationID); err != nil {
			return "", fmt.Errorf("token owner is not a member of operation %d", token.OperationID)
		}
	}
	statement, err := transaction.PrepareNamed(`INSERT INTO apitokens
		(token_value,operator_id,operation_id,token_type,active,name,scopes,created_by,eventstepinstance_id,task_id,callback_id,payload_id,chat_channel_id)
		VALUES (:token_value,:operator_id,:operation_id,:token_type,true,:name,:scopes,:created_by,:eventstepinstance_id,:task_id,:callback_id,:payload_id,:chat_channel_id)
		RETURNING id,creation_time`)
	if err != nil {
		return "", err
	}
	defer statement.Close()
	if err = statement.Get(token, token); err != nil {
		return "", err
	}
	if err = transaction.Commit(); err != nil {
		return "", err
	}
	return plain, nil
}
