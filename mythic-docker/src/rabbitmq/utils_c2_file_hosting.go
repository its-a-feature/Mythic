package rabbitmq

import (
	"errors"
	"fmt"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/lib/pq"
)

func BuildC2HostedFileAuthContext(host databaseStructs.C2profileFileHost) (RabbitMQAuthContext, error) {
	authContext := RabbitMQAuthContext{
		OperatorID:   host.CreatedBy,
		OperationID:  host.OperationID,
		SourceScopes: []string{mythicjwt.SCOPE_FILE_READ},
		FileUUID:     host.FileMeta.AgentFileID,
	}
	if host.EventStepInstanceID.Valid {
		authContext.EventStepInstanceID = int(host.EventStepInstanceID.Int64)
	}
	if host.APITokensID.Valid {
		apiToken := databaseStructs.Apitokens{}
		err := database.DB.Get(&apiToken, `SELECT id, active, deleted, scopes
			FROM apitokens WHERE id=$1`, host.APITokensID.Int64)
		if err != nil {
			return RabbitMQAuthContext{}, err
		}
		if !apiToken.Active || apiToken.Deleted {
			return authContext, errors.New("associated API token is no longer active")
		}
		if !mythicjwt.AllowsScope(apiToken.Scopes, mythicjwt.SCOPE_FILE_READ) {
			return authContext, errors.New("associated API token no longer has file.read scope")
		}
		authContext.APITokensID = apiToken.ID
		authContext.SourceScopes = append([]string{}, []string(apiToken.Scopes)...)
	}
	return authContext, nil
}

func BuildC2HostedFileMessage(host databaseStructs.C2profileFileHost, remove bool) (C2HostFileMessage, error) {
	msg := C2HostFileMessage{
		AgentFileID: host.FileMeta.AgentFileID,
		HostURL:     host.HostURL,
		Remove:      remove,
		Filename:    string(host.FileMeta.Filename),
	}
	if remove {
		return msg, nil
	}
	authContext, err := BuildC2HostedFileAuthContext(host)
	if err != nil {
		return msg, err
	}
	token, err := RegisterHostedFileAuthContextToken(host.ID, authContext)
	if err != nil {
		return msg, err
	}
	msg.DownloadToken = token
	return msg, nil
}

func ResultForC2HostedFile(response *C2HostFilesMessageResponse, file C2HostFileMessage) C2HostFileResult {
	if response == nil {
		return C2HostFileResult{Success: false, Error: "missing C2 response"}
	}
	if response.Results != nil {
		for _, result := range response.Results {
			if result.AgentFileID == file.AgentFileID && result.HostURL == file.HostURL {
				return result
			}
		}
		for _, result := range response.Results {
			if result.AgentFileID == file.AgentFileID && result.HostURL == "" {
				return result
			}
		}
	}
	if response.Success {
		return C2HostFileResult{Success: true}
	}
	return C2HostFileResult{Success: false, Error: response.Error}
}

func MarkC2HostedFileError(hostID int, errText string) {
	_, err := database.DB.Exec(`UPDATE c2profile_file_host
		SET status=$1, error=$2 WHERE id=$3`,
		databaseStructs.C2ProfileFileHostStatusError, errText, hostID)
	if err != nil {
		logging.LogError(err, "failed to mark hosted file as errored", "host_id", hostID)
	}
	InvalidateHostedFileAuthContextToken(hostID)
}

func MarkC2HostedFileActive(hostID int) {
	_, err := database.DB.Exec(`UPDATE c2profile_file_host
		SET status=$1, error='' WHERE id=$2`,
		databaseStructs.C2ProfileFileHostStatusActive, hostID)
	if err != nil {
		logging.LogError(err, "failed to mark hosted file as active", "host_id", hostID)
	}
}

func DeleteC2HostedFile(hostID int) {
	InvalidateHostedFileAuthContextToken(hostID)
	_, err := database.DB.Exec(`DELETE FROM c2profile_file_host WHERE id=$1`, hostID)
	if err != nil {
		logging.LogError(err, "failed to delete hosted file row", "host_id", hostID)
	}
}

func DeleteC2HostedFilesForFileMetaIDs(fileMetaIDs []int) {
	if len(fileMetaIDs) == 0 {
		return
	}
	hostedFiles := []databaseStructs.C2profileFileHost{}
	if err := database.DB.Select(&hostedFiles, `SELECT id FROM c2profile_file_host WHERE filemeta_id = ANY($1)`,
		pq.Array(fileMetaIDs)); err != nil {
		logging.LogError(err, "failed to fetch hosted file rows for deleted filemeta entries")
		return
	}
	for _, hostedFile := range hostedFiles {
		DeleteC2HostedFile(hostedFile.ID)
	}
}

func TouchC2HostedFileMeta(fileMetaID int) {
	// this touches those elements so that streaming updates see the update and update the UI
	if _, err := database.DB.Exec(`UPDATE filemeta SET timestamp=now() WHERE id=$1`, fileMetaID); err != nil {
		logging.LogError(err, "failed to update hosted file timestamp", "filemeta_id", fileMetaID)
	}
	if _, err := database.DB.Exec(`UPDATE payload SET timestamp=now() WHERE file_id=$1`, fileMetaID); err != nil {
		logging.LogError(err, "failed to update hosted payload timestamp", "filemeta_id", fileMetaID)
	}
}

func ResyncHostedFilesForC2Profile(c2Profile databaseStructs.C2profile) {
	rows, err := getHostedFilesForResync(&c2Profile.ID)
	if err != nil {
		logging.LogError(err, "failed to fetch hosted files for c2 profile resync", "c2_profile", c2Profile.Name)
		return
	}
	resyncHostedFiles(c2Profile.Name, rows)
}

func ResyncAllHostedFilesOnStartup() {
	if _, err := database.DB.Exec(`UPDATE c2profile_file_host SET status=$1, error=$2
		WHERE status IN ($3, $4)`,
		databaseStructs.C2ProfileFileHostStatusError,
		"Mythic restarted; waiting for automatic C2 file hosting resync",
		databaseStructs.C2ProfileFileHostStatusActive,
		databaseStructs.C2ProfileFileHostStatusUpdating); err != nil {
		logging.LogError(err, "failed to mark hosted files as errored on startup")
		return
	}
	rows, err := getHostedFilesForResync(nil)
	if err != nil {
		logging.LogError(err, "failed to fetch hosted files for startup resync")
		return
	}
	groupedRows := map[string][]databaseStructs.C2profileFileHost{}
	for _, row := range rows {
		groupedRows[row.C2Profile.Name] = append(groupedRows[row.C2Profile.Name], row)
	}
	for c2Name, c2Rows := range groupedRows {
		resyncHostedFiles(c2Name, c2Rows)
	}
}

func getHostedFilesForResync(c2ProfileID *int) ([]databaseStructs.C2profileFileHost, error) {
	rows := []databaseStructs.C2profileFileHost{}
	query := `SELECT
		c2profile_file_host.id,
		c2profile_file_host.operation_id,
		c2profile_file_host.filemeta_id,
		c2profile_file_host.c2_profile_id,
		c2profile_file_host.host_url,
		c2profile_file_host.alert_on_download,
		c2profile_file_host.status,
		c2profile_file_host.error,
		c2profile_file_host.created_by,
		c2profile_file_host.apitokens_id,
		c2profile_file_host.eventstepinstance_id,
		c2profile_file_host.updated_at,
		filemeta.agent_file_id "filemeta.agent_file_id",
		filemeta.filename "filemeta.filename",
		c2profile.name "c2profile.name"
		FROM c2profile_file_host
		JOIN filemeta ON c2profile_file_host.filemeta_id = filemeta.id
		JOIN c2profile ON c2profile_file_host.c2_profile_id = c2profile.id
		WHERE filemeta.deleted=false
		AND c2profile_file_host.status != $1`
	if c2ProfileID != nil {
		query += ` AND c2profile_file_host.c2_profile_id=$2`
		err := database.DB.Select(&rows, query, databaseStructs.C2ProfileFileHostStatusStopped, *c2ProfileID)
		return rows, err
	}
	err := database.DB.Select(&rows, query, databaseStructs.C2ProfileFileHostStatusStopped)
	return rows, err
}

func resyncHostedFiles(c2ProfileName string, rows []databaseStructs.C2profileFileHost) {
	if len(rows) == 0 {
		return
	}
	files := make([]C2HostFileMessage, 0, len(rows))
	rowsByKey := map[string]databaseStructs.C2profileFileHost{}
	for _, row := range rows {
		file, err := BuildC2HostedFileMessage(row, false)
		if err != nil {
			MarkC2HostedFileError(row.ID, err.Error())
			continue
		}
		files = append(files, file)
		rowsByKey[GetC2HostFileResultKey(file.AgentFileID, file.HostURL)] = row
	}
	if len(files) == 0 {
		return
	}
	response, err := RabbitMQConnection.SendC2RPCHostFiles(C2HostFilesMessage{
		Name:  c2ProfileName,
		Files: files,
	}, RabbitMQAuthContext{
		SourceScopes: []string{mythicjwt.SCOPE_FILE_READ},
	})
	if err != nil {
		for _, row := range rowsByKey {
			MarkC2HostedFileError(row.ID, err.Error())
		}
		go SendAllOperationsMessage(fmt.Sprintf("%s failed to resync hosted files:\n%s", c2ProfileName, err.Error()),
			0, "host_file", database.MESSAGE_LEVEL_INFO, true)
		return
	}
	for _, file := range files {
		row := rowsByKey[GetC2HostFileResultKey(file.AgentFileID, file.HostURL)]
		result := ResultForC2HostedFile(response, file)
		if result.Success {
			MarkC2HostedFileActive(row.ID)
			continue
		}
		errorText := result.Error
		if errorText == "" {
			errorText = response.Error
		}
		if errorText == "" {
			errorText = "C2 profile failed to host file"
		}
		MarkC2HostedFileError(row.ID, errorText)
		go SendAllOperationsMessage(fmt.Sprintf("%s failed to host %s at %s:\n%s",
			c2ProfileName, file.AgentFileID, file.HostURL, errorText),
			row.OperationID, "host_file", database.MESSAGE_LEVEL_INFO, true)
	}
}

func FetchC2HostedFileByProfilePath(c2ProfileID int, hostURL string) (databaseStructs.C2profileFileHost, error) {
	row := databaseStructs.C2profileFileHost{}
	err := database.DB.Get(&row, `SELECT
		c2profile_file_host.id,
		c2profile_file_host.operation_id,
		c2profile_file_host.filemeta_id,
		c2profile_file_host.c2_profile_id,
		c2profile_file_host.host_url,
		c2profile_file_host.alert_on_download,
		c2profile_file_host.status,
		c2profile_file_host.error,
		c2profile_file_host.created_by,
		c2profile_file_host.apitokens_id,
		c2profile_file_host.eventstepinstance_id,
		c2profile_file_host.updated_at,
		filemeta.agent_file_id "filemeta.agent_file_id",
		filemeta.filename "filemeta.filename",
		c2profile.name "c2profile.name"
		FROM c2profile_file_host
		JOIN filemeta ON c2profile_file_host.filemeta_id = filemeta.id
		JOIN c2profile ON c2profile_file_host.c2_profile_id = c2profile.id
		WHERE c2profile_file_host.c2_profile_id=$1 AND c2profile_file_host.host_url=$2`,
		c2ProfileID, hostURL)
	return row, err
}
