package rabbitmq

import (
	"fmt"
	"sort"
	"strconv"
	"strings"

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
	registerTaskReferenceProvider(credentialTaskReferenceProvider{})
}

func (credentialTaskReferenceProvider) Keyword() string {
	return taskReferenceCredentialKeyword
}

func (credentialTaskReferenceProvider) StructuredParameterTypes() []string {
	return []string{COMMAND_PARAMETER_TYPE_CREDENTIAL}
}

func (credentialTaskReferenceProvider) ParseReferenceBody(body string, _ string) (taskReference, error) {
	selector := strings.TrimSpace(body)
	field := ""
	if fieldSeparatorIndex := strings.LastIndex(selector, "."); fieldSeparatorIndex >= 0 {
		field = strings.ToLower(strings.TrimSpace(selector[fieldSeparatorIndex+1:]))
		selector = strings.TrimSpace(selector[:fieldSeparatorIndex])
	}
	return taskReference{
		Selector: selector,
		Field:    field,
	}, nil
}

func (provider credentialTaskReferenceProvider) ValidateReference(reference taskReference, structured bool) error {
	if _, err := credentialReferenceSelectorID(reference.Selector); err != nil {
		return fmt.Errorf("invalid credential reference selector %q: %w", reference.Selector, err)
	}
	if reference.Field == "" {
		return nil
	}
	if structured {
		return fmt.Errorf("credential parameters require @cred:<id> task references")
	}
	if err := provider.ValidateField(reference.Field); err != nil {
		return fmt.Errorf("invalid credential reference field %q: %w", reference.Field, err)
	}
	return nil
}

func (credentialTaskReferenceProvider) ValidateField(field string) error {
	switch field {
	case "credential", "account", "realm", "type", "subtype", "comment", "id", "custom_display", "credential_identity", "metadata":
		return nil
	default:
		return fmt.Errorf("supported credential fields are credential, account, realm, type, subtype, comment, id, custom_display, credential_identity, and metadata")
	}
}

func (credentialTaskReferenceProvider) BatchResolveTaskReferences(context taskReferenceResolveContext, references []taskReference) (map[taskReference]taskReferenceResolvedValue, error) {
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
		return map[taskReference]taskReferenceResolvedValue{}, nil
	}

	credentials := []databaseStructs.Credential{}
	query, args, err := sqlx.In(`SELECT
		c.id, c."type", c.subtype, c.account, c.realm, c.comment, c.custom_display, credential_credentials(c) AS credential, c.metadata, c.credential_identity
		FROM credential c
		WHERE c.operation_id=? AND c.deleted=false AND c.id IN (?)`,
		context.OperationID, credentialIDs)
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

	resolved := make(map[taskReference]taskReferenceResolvedValue, len(references))
	for _, reference := range references {
		credentialID := credentialIDsBySelector[reference.Selector]
		credential, ok := credentialsByID[credentialID]
		if !ok {
			return nil, fmt.Errorf("credential reference @cred:%s was not found in this operation or was deleted", reference.Selector)
		}
		if reference.Field == "" {
			resolved[reference] = taskReferenceResolvedValue{
				Structured: credentialTaskReferenceStructuredValue(credential),
			}
			continue
		}
		scalar, err := credentialTaskReferenceScalarValue(credential, reference.Field)
		if err != nil {
			return nil, err
		}
		resolved[reference] = taskReferenceResolvedValue{Scalar: scalar}
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
		"id":                  credential.ID,
		"account":             credential.Account,
		"realm":               credential.Realm,
		"type":                credential.Type,
		"subtype":             credential.Subtype,
		"comment":             credential.Comment,
		"credential":          credential.Credential,
		"metadata":            credential.Metadata.StructValue(),
		"credential_identity": credential.Identity.StructValue(),
		"custom_display":      credential.CustomDisplay,
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
	case "subtype":
		return credential.Subtype, nil
	case "comment":
		return credential.Comment, nil
	case "custom_display":
		return credential.CustomDisplay, nil
	case "metadata":
		return credential.Metadata.String(), nil
	case "credential_identity":
		return credential.Identity.String(), nil
	case "id":
		return strconv.Itoa(credential.ID), nil
	default:
		return "", fmt.Errorf("unsupported credential reference field %q", field)
	}
}
