package rabbitmq

import (
	"database/sql"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/jmoiron/sqlx"
)

const (
	taskReferenceLinkKeyword = "link"

	taskReferenceLinkKindCallback = "callback"
	taskReferenceLinkKindPayload  = "payload"
	taskReferenceLinkKindEdge     = "edge"
)

type linkTaskReferenceProvider struct{}

type linkTaskReferenceC2Profile struct {
	ID    int    `db:"id"`
	Name  string `db:"name"`
	IsP2P bool   `db:"is_p2p"`
}

type linkTaskReferenceC2Parameter struct {
	Name         string         `db:"name"`
	Value        string         `db:"value"`
	IsCryptoType bool           `db:"crypto_type"`
	EncKeyBase64 sql.NullString `db:"enc_key_base64"`
	DecKeyBase64 sql.NullString `db:"dec_key_base64"`
}

type linkTaskReferenceCallback struct {
	ID              int    `db:"id"`
	DisplayID       int    `db:"display_id"`
	Host            string `db:"host"`
	AgentCallbackID string `db:"agent_callback_id"`
	PayloadUUID     string `db:"payload_uuid"`
}

type linkTaskReferencePayload struct {
	ID   int    `db:"id"`
	UUID string `db:"uuid"`
}

type linkTaskReferenceEdge struct {
	ID                         int    `db:"id"`
	SourceID                   int    `db:"source_id"`
	DestinationID              int    `db:"destination_id"`
	C2ProfileID                int    `db:"c2_profile_id"`
	C2ProfileName              string `db:"c2profile_name"`
	C2ProfileIsP2P             bool   `db:"c2profile_is_p2p"`
	SourceHost                 string `db:"source_host"`
	SourceAgentCallbackID      string `db:"source_agent_callback_id"`
	SourcePayloadUUID          string `db:"source_payload_uuid"`
	DestinationHost            string `db:"destination_host"`
	DestinationAgentCallbackID string `db:"destination_agent_callback_id"`
	DestinationPayloadUUID     string `db:"destination_payload_uuid"`
}

func init() {
	registerTaskReferenceProvider(linkTaskReferenceProvider{})
}

func (linkTaskReferenceProvider) Keyword() string {
	return taskReferenceLinkKeyword
}

func (linkTaskReferenceProvider) StructuredParameterTypes() []string {
	return []string{COMMAND_PARAMETER_TYPE_CONNECTION_INFO, COMMAND_PARAMETER_TYPE_LINK_INFO}
}

func (linkTaskReferenceProvider) ParseReferenceBody(body string, _ string) (taskReference, error) {
	args, err := parseLinkTaskReferenceArguments(body)
	if err != nil {
		return taskReference{}, err
	}
	return taskReference{
		Selector: canonicalLinkTaskReferenceSelector(args),
	}, nil
}

func (linkTaskReferenceProvider) ValidateReference(reference taskReference, structured bool) error {
	if !structured {
		return fmt.Errorf("@link references are only supported as structured AgentConnect or LinkInfo parameter values")
	}
	if reference.Field != "" {
		return fmt.Errorf("@link references do not support scalar fields")
	}
	args, err := parseLinkTaskReferenceArguments(reference.Selector)
	if err != nil {
		return err
	}
	referenceKind, err := linkTaskReferenceKind(args)
	if err != nil {
		return err
	}
	switch reference.ParameterType {
	case COMMAND_PARAMETER_TYPE_CONNECTION_INFO:
		switch referenceKind {
		case taskReferenceLinkKindCallback:
			_, err = linkTaskReferencePositiveInt(args[taskReferenceLinkKindCallback], "callback")
		case taskReferenceLinkKindPayload:
			err = validateLinkTaskReferencePayloadArguments(args)
		case taskReferenceLinkKindEdge:
			err = fmt.Errorf("AgentConnect parameters require @link callback or payload references")
		}
	case COMMAND_PARAMETER_TYPE_LINK_INFO:
		if referenceKind != taskReferenceLinkKindEdge {
			err = fmt.Errorf("LinkInfo parameters require @link:edge=<callbackgraphedge_id> references")
		} else {
			_, err = linkTaskReferencePositiveInt(args[taskReferenceLinkKindEdge], "edge")
		}
	default:
		err = fmt.Errorf("@link references must be used with AgentConnect or LinkInfo parameters")
	}
	if err != nil {
		return err
	}
	return nil
}

func (provider linkTaskReferenceProvider) BatchResolveTaskReferences(context taskReferenceResolveContext, references []taskReference) (map[taskReference]taskReferenceResolvedValue, error) {
	resolved := make(map[taskReference]taskReferenceResolvedValue, len(references))
	for _, reference := range references {
		args, err := parseLinkTaskReferenceArguments(reference.Selector)
		if err != nil {
			return nil, err
		}
		referenceKind, err := linkTaskReferenceKind(args)
		if err != nil {
			return nil, err
		}
		switch referenceKind {
		case taskReferenceLinkKindCallback:
			resolvedValue, err := provider.resolveCallbackReference(context, reference, args)
			if err != nil {
				return nil, err
			}
			resolved[reference] = resolvedValue
		case taskReferenceLinkKindPayload:
			resolvedValue, err := provider.resolvePayloadReference(context, reference, args)
			if err != nil {
				return nil, err
			}
			resolved[reference] = resolvedValue
		case taskReferenceLinkKindEdge:
			resolvedValue, err := provider.resolveEdgeReference(context, reference, args)
			if err != nil {
				return nil, err
			}
			resolved[reference] = resolvedValue
		}
	}
	return resolved, nil
}

func (linkTaskReferenceProvider) resolveCallbackReference(context taskReferenceResolveContext, reference taskReference, args map[string]string) (taskReferenceResolvedValue, error) {
	callbackDisplayID, err := linkTaskReferencePositiveInt(args[taskReferenceLinkKindCallback], "callback")
	if err != nil {
		return taskReferenceResolvedValue{}, err
	}
	callback := linkTaskReferenceCallback{}
	err = database.DB.Get(&callback, `SELECT
		callback.id,
		callback.display_id,
		callback.host,
		callback.agent_callback_id,
		payload.uuid payload_uuid
		FROM callback
		JOIN payload ON callback.registered_payload_id = payload.id
		WHERE callback.display_id=$1 AND callback.operation_id=$2 AND callback.active=true`,
		callbackDisplayID, context.OperationID)
	if err != nil {
		if err == sql.ErrNoRows {
			return taskReferenceResolvedValue{}, fmt.Errorf("callback reference %s was not found in this operation or is not active", reference.Raw)
		}
		return taskReferenceResolvedValue{}, fmt.Errorf("failed to resolve callback reference %s: %w", reference.Raw, err)
	}
	c2Profile, err := getLinkTaskReferenceCallbackC2Profile(callback.ID, args["c2"])
	if err != nil {
		return taskReferenceResolvedValue{}, err
	}
	parameters, err := getLinkTaskReferenceC2ParametersForCallback(callback.ID, c2Profile.ID)
	if err != nil {
		return taskReferenceResolvedValue{}, err
	}
	return taskReferenceResolvedValue{
		Structured: linkTaskReferenceAgentConnectValue(callback.Host, callback.PayloadUUID, callback.AgentCallbackID, c2Profile.Name, parameters),
	}, nil
}

func (linkTaskReferenceProvider) resolvePayloadReference(context taskReferenceResolveContext, reference taskReference, args map[string]string) (taskReferenceResolvedValue, error) {
	payload := linkTaskReferencePayload{}
	err := database.DB.Get(&payload, `SELECT id, uuid
		FROM payload
		WHERE uuid=$1 AND operation_id=$2 AND deleted=false AND build_phase=$3`,
		args[taskReferenceLinkKindPayload], context.OperationID, PAYLOAD_BUILD_STATUS_SUCCESS)
	if err != nil {
		if err == sql.ErrNoRows {
			return taskReferenceResolvedValue{}, fmt.Errorf("payload reference %s was not found in this operation or is not successfully built", reference.Raw)
		}
		return taskReferenceResolvedValue{}, fmt.Errorf("failed to resolve payload reference %s: %w", reference.Raw, err)
	}
	c2Profile, err := getLinkTaskReferencePayloadC2Profile(payload.ID, args["c2"])
	if err != nil {
		return taskReferenceResolvedValue{}, err
	}
	parameters, err := getLinkTaskReferenceC2ParametersForPayload(payload.ID, c2Profile.ID)
	if err != nil {
		return taskReferenceResolvedValue{}, err
	}
	host := strings.ToUpper(strings.TrimSpace(args["host"]))
	return taskReferenceResolvedValue{
		Structured: linkTaskReferenceAgentConnectValue(host, payload.UUID, "", c2Profile.Name, parameters),
		PostCreateActions: []taskReferencePostCreateAction{
			newPayloadOnHostTaskReferenceAction(context.OperationID, payload.ID, host),
		},
	}, nil
}

func (linkTaskReferenceProvider) resolveEdgeReference(context taskReferenceResolveContext, reference taskReference, args map[string]string) (taskReferenceResolvedValue, error) {
	if context.CallbackID <= 0 {
		return taskReferenceResolvedValue{}, fmt.Errorf("@link edge references require the current callback context")
	}
	edgeID, err := linkTaskReferencePositiveInt(args[taskReferenceLinkKindEdge], "edge")
	if err != nil {
		return taskReferenceResolvedValue{}, err
	}
	edge := linkTaskReferenceEdge{}
	err = database.DB.Get(&edge, `SELECT
		callbackgraphedge.id,
		callbackgraphedge.source_id,
		callbackgraphedge.destination_id,
		callbackgraphedge.c2_profile_id,
		c2profile.name c2profile_name,
		c2profile.is_p2p c2profile_is_p2p,
		source.host source_host,
		source.agent_callback_id source_agent_callback_id,
		source_payload.uuid source_payload_uuid,
		destination.host destination_host,
		destination.agent_callback_id destination_agent_callback_id,
		destination_payload.uuid destination_payload_uuid
		FROM callbackgraphedge
		JOIN c2profile ON callbackgraphedge.c2_profile_id = c2profile.id
		JOIN callback source ON callbackgraphedge.source_id = source.id
		JOIN callback destination ON callbackgraphedge.destination_id = destination.id
		JOIN payload source_payload ON source.registered_payload_id = source_payload.id
		JOIN payload destination_payload ON destination.registered_payload_id = destination_payload.id
		WHERE callbackgraphedge.id=$1 AND callbackgraphedge.operation_id=$2`,
		edgeID, context.OperationID)
	if err != nil {
		if err == sql.ErrNoRows {
			return taskReferenceResolvedValue{}, fmt.Errorf("callback graph edge reference %s was not found in this operation", reference.Raw)
		}
		return taskReferenceResolvedValue{}, fmt.Errorf("failed to resolve callback graph edge reference %s: %w", reference.Raw, err)
	}
	if !edge.C2ProfileIsP2P {
		return taskReferenceResolvedValue{}, fmt.Errorf("callback graph edge %d uses non-P2P c2 profile %q", edge.ID, edge.C2ProfileName)
	}
	linkedCallbackID := edge.SourceID
	host := edge.SourceHost
	callbackUUID := edge.SourceAgentCallbackID
	payloadUUID := edge.SourcePayloadUUID
	if edge.SourceID == context.CallbackID {
		linkedCallbackID = edge.DestinationID
		host = edge.DestinationHost
		callbackUUID = edge.DestinationAgentCallbackID
		payloadUUID = edge.DestinationPayloadUUID
	} else if edge.DestinationID != context.CallbackID {
		return taskReferenceResolvedValue{}, fmt.Errorf("callback graph edge %d is not connected to the current callback", edge.ID)
	}
	parameters, err := getLinkTaskReferenceC2ParametersForCallback(linkedCallbackID, edge.C2ProfileID)
	if err != nil {
		return taskReferenceResolvedValue{}, err
	}
	return taskReferenceResolvedValue{
		Structured: linkTaskReferenceAgentConnectValue(host, payloadUUID, callbackUUID, edge.C2ProfileName, parameters),
	}, nil
}

func parseLinkTaskReferenceArguments(body string) (map[string]string, error) {
	args := make(map[string]string)
	for _, part := range strings.Split(body, ",") {
		key, value, ok := strings.Cut(part, "=")
		if !ok {
			return nil, fmt.Errorf("@link references require comma-separated key=value arguments")
		}
		key = strings.ToLower(strings.TrimSpace(key))
		value = strings.TrimSpace(value)
		if key == "" || value == "" {
			return nil, fmt.Errorf("@link reference arguments require non-empty keys and values")
		}
		if _, exists := args[key]; exists {
			return nil, fmt.Errorf("@link reference argument %q was supplied more than once", key)
		}
		args[key] = value
	}
	return args, nil
}

func canonicalLinkTaskReferenceSelector(args map[string]string) string {
	keys := make([]string, 0, len(args))
	for key := range args {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, key+"="+args[key])
	}
	return strings.Join(parts, ",")
}

func linkTaskReferenceKind(args map[string]string) (string, error) {
	if _, ok := args[taskReferenceLinkKindCallback]; ok {
		return taskReferenceLinkKindCallback, requireExactLinkTaskReferenceKeys(args, taskReferenceLinkKindCallback, "c2")
	}
	if _, ok := args[taskReferenceLinkKindPayload]; ok {
		return taskReferenceLinkKindPayload, requireExactLinkTaskReferenceKeys(args, taskReferenceLinkKindPayload, "host", "c2")
	}
	if _, ok := args[taskReferenceLinkKindEdge]; ok {
		return taskReferenceLinkKindEdge, requireExactLinkTaskReferenceKeys(args, taskReferenceLinkKindEdge)
	}
	return "", fmt.Errorf("@link references require one of callback, payload, or edge")
}

func requireExactLinkTaskReferenceKeys(args map[string]string, requiredKeys ...string) error {
	if len(args) != len(requiredKeys) {
		return fmt.Errorf("@link reference has unexpected arguments")
	}
	for _, key := range requiredKeys {
		if strings.TrimSpace(args[key]) == "" {
			return fmt.Errorf("@link reference is missing required %q argument", key)
		}
	}
	return nil
}

func validateLinkTaskReferencePayloadArguments(args map[string]string) error {
	if strings.TrimSpace(args[taskReferenceLinkKindPayload]) == "" {
		return fmt.Errorf("@link payload references require a payload uuid")
	}
	if strings.TrimSpace(args["host"]) == "" {
		return fmt.Errorf("@link payload references require a host")
	}
	return nil
}

func linkTaskReferencePositiveInt(value string, label string) (int, error) {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed <= 0 {
		return 0, fmt.Errorf("@link %s references require a positive integer", label)
	}
	return parsed, nil
}

func getLinkTaskReferenceCallbackC2Profile(callbackID int, c2ProfileName string) (linkTaskReferenceC2Profile, error) {
	c2Profile := linkTaskReferenceC2Profile{}
	err := database.DB.Get(&c2Profile, `SELECT c2profile.id, c2profile.name, c2profile.is_p2p
		FROM callbackc2profiles
		JOIN c2profile ON callbackc2profiles.c2_profile_id = c2profile.id
		WHERE callbackc2profiles.callback_id=$1 AND lower(c2profile.name)=lower($2) AND c2profile.deleted=false`,
		callbackID, strings.TrimSpace(c2ProfileName))
	if err != nil {
		if err == sql.ErrNoRows {
			return c2Profile, fmt.Errorf("callback does not use c2 profile %q", c2ProfileName)
		}
		return c2Profile, fmt.Errorf("failed to fetch callback c2 profile %q: %w", c2ProfileName, err)
	}
	if !c2Profile.IsP2P {
		return c2Profile, fmt.Errorf("c2 profile %q is not a P2P profile", c2Profile.Name)
	}
	return c2Profile, nil
}

func getLinkTaskReferencePayloadC2Profile(payloadID int, c2ProfileName string) (linkTaskReferenceC2Profile, error) {
	c2Profile := linkTaskReferenceC2Profile{}
	err := database.DB.Get(&c2Profile, `SELECT c2profile.id, c2profile.name, c2profile.is_p2p
		FROM payloadc2profiles
		JOIN c2profile ON payloadc2profiles.c2_profile_id = c2profile.id
		WHERE payloadc2profiles.payload_id=$1 AND lower(c2profile.name)=lower($2) AND c2profile.deleted=false`,
		payloadID, strings.TrimSpace(c2ProfileName))
	if err != nil {
		if err == sql.ErrNoRows {
			return c2Profile, fmt.Errorf("payload does not use c2 profile %q", c2ProfileName)
		}
		return c2Profile, fmt.Errorf("failed to fetch payload c2 profile %q: %w", c2ProfileName, err)
	}
	if !c2Profile.IsP2P {
		return c2Profile, fmt.Errorf("c2 profile %q is not a P2P profile", c2Profile.Name)
	}
	return c2Profile, nil
}

func getLinkTaskReferenceC2ParametersForCallback(callbackID int, c2ProfileID int) (map[string]interface{}, error) {
	return getLinkTaskReferenceC2Parameters(`callback_id=$1`, callbackID, c2ProfileID)
}

func getLinkTaskReferenceC2ParametersForPayload(payloadID int, c2ProfileID int) (map[string]interface{}, error) {
	return getLinkTaskReferenceC2Parameters(`payload_id=$1`, payloadID, c2ProfileID)
}

func getLinkTaskReferenceC2Parameters(ownerWhere string, ownerID int, c2ProfileID int) (map[string]interface{}, error) {
	parameters := []linkTaskReferenceC2Parameter{}
	err := database.DB.Select(&parameters, fmt.Sprintf(`SELECT
		c2profileparameters.name,
		c2profileparameters.crypto_type,
		c2profileparametersinstance.value,
		encode(c2profileparametersinstance.enc_key, 'base64') enc_key_base64,
		encode(c2profileparametersinstance.dec_key, 'base64') dec_key_base64
		FROM c2profileparametersinstance
		JOIN c2profileparameters ON c2profileparametersinstance.c2_profile_parameters_id = c2profileparameters.id
		WHERE c2profileparametersinstance.%s AND c2profileparametersinstance.c2_profile_id=$2
		ORDER BY c2profileparameters.name ASC`, ownerWhere), ownerID, c2ProfileID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch c2 profile parameter instances: %w", err)
	}
	values := make(map[string]interface{}, len(parameters))
	for _, parameter := range parameters {
		if parameter.IsCryptoType {
			values[parameter.Name] = map[string]interface{}{
				"crypto_type": parameter.Value,
				"enc_key":     nullableStringValue(parameter.EncKeyBase64),
				"dec_key":     nullableStringValue(parameter.DecKeyBase64),
			}
			continue
		}
		values[parameter.Name] = parameter.Value
	}
	return values, nil
}

func nullableStringValue(value sql.NullString) interface{} {
	if value.Valid {
		return value.String
	}
	return nil
}

func linkTaskReferenceAgentConnectValue(host string, agentUUID string, callbackUUID string, c2ProfileName string, parameters map[string]interface{}) map[string]interface{} {
	return map[string]interface{}{
		"host":          host,
		"agent_uuid":    agentUUID,
		"callback_uuid": callbackUUID,
		"c2_profile": map[string]interface{}{
			"name":       c2ProfileName,
			"parameters": parameters,
		},
	}
}

func newPayloadOnHostTaskReferenceAction(operationID int, payloadID int, host string) taskReferencePostCreateAction {
	return taskReferencePostCreateAction{
		Description: fmt.Sprintf("ensure payload %d is tracked on host %s", payloadID, host),
		Execute: func(tx *sqlx.Tx, task databaseStructs.Task) error {
			return ensurePayloadOnHostForTaskReference(tx, operationID, payloadID, host, task.ID)
		},
	}
}

func ensurePayloadOnHostForTaskReference(tx *sqlx.Tx, operationID int, payloadID int, host string, taskID int) error {
	payloadOnHost := databaseStructs.Payloadonhost{}
	err := tx.Get(&payloadOnHost, `SELECT id, task_id
		FROM payloadonhost
		WHERE operation_id=$1 AND host=$2 AND payload_id=$3 AND deleted=false
		ORDER BY id ASC
		LIMIT 1`, operationID, host, payloadID)
	if err == nil {
		if !payloadOnHost.TaskID.Valid {
			_, err = tx.Exec(`UPDATE payloadonhost SET task_id=$1 WHERE id=$2`, taskID, payloadOnHost.ID)
		}
		return err
	}
	if err != sql.ErrNoRows {
		return err
	}

	err = tx.Get(&payloadOnHost, `SELECT id
		FROM payloadonhost
		WHERE operation_id=$1 AND host=$2 AND payload_id=$3 AND deleted=true
		ORDER BY id DESC
		LIMIT 1`, operationID, host, payloadID)
	if err == nil {
		_, err = tx.Exec(`UPDATE payloadonhost
			SET deleted=false, task_id=$1, timestamp=now()
			WHERE id=$2`, taskID, payloadOnHost.ID)
		return err
	}
	if err != sql.ErrNoRows {
		return err
	}

	_, err = tx.Exec(`INSERT INTO payloadonhost
		(host, payload_id, operation_id, task_id)
		VALUES ($1, $2, $3, $4)`, host, payloadID, operationID, taskID)
	return err
}
