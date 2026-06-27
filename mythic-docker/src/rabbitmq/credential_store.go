package rabbitmq

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
)

type CredentialUpsertInput struct {
	Realm              string
	Account            string
	Credential         string
	Comment            string
	CredentialType     string
	CredentialSubtype  string
	CustomDisplay      string
	Metadata           map[string]interface{}
	CredentialIdentity map[string]interface{}
	OperationID        int
	OperatorID         int
	TaskID             *int
	APITokensID        *int
}

type CredentialUpsertResult struct {
	Credential databaseStructs.Credential
	Created    bool
}

func NormalizeCredentialType(credentialType string) string {
	credentialType = strings.ToLower(strings.TrimSpace(credentialType))
	if utils.SliceContains(ValidCredentialTypesList, credentialType) {
		return credentialType
	}
	return "plaintext"
}

func NormalizeCredentialSubtype(credentialSubtype string) string {
	return strings.ToLower(strings.TrimSpace(credentialSubtype))
}

func ProcessCredentialForStorage(credential *databaseStructs.Credential, suppliedMetadata map[string]interface{}, suppliedIdentity map[string]interface{}) ParsedCredentialData {
	credential.Type = NormalizeCredentialType(credential.Type)
	credential.Subtype = NormalizeCredentialSubtype(credential.Subtype)
	parserMetadata, parserIdentity := stripCredentialParserData(suppliedMetadata, suppliedIdentity)
	parsedCredential := ParseCredential(credential.Type, credential.Credential, parserMetadata, parserIdentity)
	if parsedCredential.Subtype != "" {
		credential.Subtype = parsedCredential.Subtype
	}
	credential.Account, credential.Realm = PopulateCredentialAccountRealmFromIdentity(
		credential.Account,
		credential.Realm,
		parsedCredential.Metadata,
		parsedCredential.Identity,
	)
	credential.Metadata = GetMythicJSONTextFromStruct(parsedCredential.Metadata)
	credential.Identity = GetMythicJSONTextFromStruct(parsedCredential.Identity)
	return parsedCredential
}

func UpsertCredential(input CredentialUpsertInput) (CredentialUpsertResult, error) {
	databaseCred := databaseStructs.Credential{
		Realm:         input.Realm,
		Account:       input.Account,
		OperationID:   input.OperationID,
		Credential:    input.Credential,
		Deleted:       false,
		Comment:       input.Comment,
		OperatorID:    input.OperatorID,
		Type:          input.CredentialType,
		Subtype:       input.CredentialSubtype,
		CustomDisplay: input.CustomDisplay,
	}
	if input.TaskID != nil {
		databaseCred.TaskID.Valid = true
		databaseCred.TaskID.Int64 = int64(*input.TaskID)
	}
	if input.APITokensID != nil {
		databaseCred.APITokensID.Valid = true
		databaseCred.APITokensID.Int64 = int64(*input.APITokensID)
	}
	parsedCredential := ProcessCredentialForStorage(&databaseCred, input.Metadata, input.CredentialIdentity)
	if databaseCred.Realm == "" && databaseCred.Account == "" && len(parsedCredential.Identity) == 0 {
		return CredentialUpsertResult{}, errors.New("must supply an account, realm, or credential identity")
	}

	newCredential := databaseCred
	existingCredential := databaseStructs.Credential{}
	err := database.DB.Get(&existingCredential, `SELECT * FROM credential WHERE
		account=$1 AND realm=$2 AND credential=$3 AND operation_id=$4 AND "type"=$5 AND subtype=$6 AND credential_identity=$7`,
		newCredential.Account,
		newCredential.Realm,
		newCredential.Credential,
		newCredential.OperationID,
		newCredential.Type,
		newCredential.Subtype,
		newCredential.Identity,
	)
	if errors.Is(err, sql.ErrNoRows) {
		statement, err := database.DB.PrepareNamed(`INSERT INTO credential
			(realm, account, operation_id, credential, deleted, comment, metadata, credential_identity, custom_display, task_id, "type", subtype, operator_id, apitokens_id)
			VALUES (:realm, :account, :operation_id, :credential, :deleted, :comment, :metadata, :credential_identity, :custom_display, :task_id, :type, :subtype, :operator_id, :apitokens_id)
			RETURNING *`)
		if err != nil {
			return CredentialUpsertResult{}, err
		}
		err = statement.Get(&databaseCred, newCredential)
		if err != nil {
			return CredentialUpsertResult{}, err
		}
		go EmitCredentialLog(databaseCred.ID)
		go RefreshCredentialValidity(databaseCred.ID)
		return CredentialUpsertResult{Credential: databaseCred, Created: true}, nil
	}
	if err != nil {
		logging.LogError(err, "Failed to check if credential already exists")
		return CredentialUpsertResult{}, err
	}

	err = database.DB.Get(&databaseCred, `UPDATE credential SET
		deleted=false,
		metadata=$2,
		credential_identity=$3,
		custom_display=CASE WHEN $4::text <> '' THEN $4::text ELSE custom_display END,
		comment=CASE WHEN comment = '' THEN $5::text ELSE comment END,
		operator_id=$6
		WHERE id=$1
		RETURNING *`,
		existingCredential.ID,
		newCredential.Metadata,
		newCredential.Identity,
		input.CustomDisplay,
		input.Comment,
		input.OperatorID,
	)
	if err != nil {
		return CredentialUpsertResult{}, err
	}
	go RefreshCredentialValidity(databaseCred.ID)
	return CredentialUpsertResult{Credential: databaseCred, Created: false}, nil
}
