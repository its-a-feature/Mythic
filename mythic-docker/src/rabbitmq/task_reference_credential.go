package rabbitmq

import (
	"fmt"
	"sort"
	"strconv"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/jmoiron/sqlx"
)

var maxCredentialReferenceInt = int64(int(^uint(0) >> 1))

const (
	taskReferenceCredentialKeyword = "cred"
)

type credentialTaskReferenceProvider struct{}

func init() {
	registerTaskReferenceKeywordProvider(credentialTaskReferenceProvider{})
}

func (credentialTaskReferenceProvider) Keyword() string {
	return taskReferenceCredentialKeyword
}

func (credentialTaskReferenceProvider) ParameterType() string {
	return COMMAND_PARAMETER_TYPE_CREDENTIAL
}

func (credentialTaskReferenceProvider) ValidateSelector(selector string) error {
	_, err := credentialReferenceSelectorID(selector)
	return err
}

func (credentialTaskReferenceProvider) ValidateField(field string) error {
	switch field {
	case "credential", "account", "realm", "type", "comment", "id":
		return nil
	default:
		return fmt.Errorf("supported credential fields are credential, account, realm, type, comment, and id")
	}
}

func (credentialTaskReferenceProvider) BatchResolveTaskReferences(operationID int, references []taskReferenceKeyword) (map[taskReferenceKeyword]taskReferenceKeywordResolvedValue, error) {
	credentialIDsBySelector := make(map[string]int)
	for _, reference := range references {
		id, err := credentialReferenceSelectorID(reference.Selector)
		if err != nil {
			return nil, err
		}
		credentialIDsBySelector[reference.Selector] = id
	}
	credentialIDs := make([]int, 0, len(credentialIDsBySelector))
	for _, id := range credentialIDsBySelector {
		credentialIDs = append(credentialIDs, id)
	}
	sort.Ints(credentialIDs)
	if len(credentialIDs) == 0 {
		return map[taskReferenceKeyword]taskReferenceKeywordResolvedValue{}, nil
	}

	credentials := []databaseStructs.Credential{}
	query, args, err := sqlx.In(`SELECT
		c.id, c."type", c.account, c.realm, c.comment, credential_credentials(c) AS credential, c.metadata
		FROM credential c
		WHERE c.operation_id=? AND c.deleted=false AND c.id IN (?)`,
		operationID, credentialIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to build credential reference query: %w", err)
	}
	query = database.DB.Rebind(query)
	err = database.DB.Select(&credentials, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve credential references: %w", err)
	}
	credentialsByID := make(map[int]databaseStructs.Credential, len(credentials))
	for _, credential := range credentials {
		credentialsByID[credential.ID] = credential
	}

	resolved := make(map[taskReferenceKeyword]taskReferenceKeywordResolvedValue, len(references))
	for _, reference := range references {
		credentialID := credentialIDsBySelector[reference.Selector]
		credential, ok := credentialsByID[credentialID]
		if !ok {
			return nil, fmt.Errorf("credential reference @cred:%s was not found in this operation or was deleted", reference.Selector)
		}
		if reference.Field == "" {
			resolved[reference] = taskReferenceKeywordResolvedValue{
				Structured: credentialTaskReferenceStructuredValue(credential),
			}
			continue
		}
		scalar, err := credentialTaskReferenceScalarValue(credential, reference.Field)
		if err != nil {
			return nil, err
		}
		resolved[reference] = taskReferenceKeywordResolvedValue{Scalar: scalar}
	}
	return resolved, nil
}

func credentialReferenceSelectorID(selector string) (int, error) {
	id, err := strconv.ParseInt(selector, 10, 64)
	if err != nil || id <= 0 || id > maxCredentialReferenceInt {
		return 0, fmt.Errorf("credential selector must be a positive integer")
	}
	return int(id), nil
}

func credentialTaskReferenceStructuredValue(credential databaseStructs.Credential) map[string]interface{} {
	return map[string]interface{}{
		"id":         credential.ID,
		"account":    credential.Account,
		"realm":      credential.Realm,
		"type":       credential.Type,
		"comment":    credential.Comment,
		"credential": credential.Credential,
		"metadata":   credential.Metadata.StructValue(),
	}
}

func credentialTaskReferenceScalarValue(credential databaseStructs.Credential, field string) (string, error) {
	switch field {
	case "credential":
		return credential.Credential, nil
	case "account":
		return credential.Account, nil
	case "realm":
		return credential.Realm, nil
	case "type":
		return credential.Type, nil
	case "comment":
		return credential.Comment, nil
	case "id":
		return strconv.Itoa(credential.ID), nil
	default:
		return "", fmt.Errorf("unsupported credential reference field %q", field)
	}
}
