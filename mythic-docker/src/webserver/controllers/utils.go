package webcontroller

import (
	"database/sql"
	"errors"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"time"
)

func GetUserIDFromGin(c *gin.Context) (int, error) {
	customClaims, err := authentication.GetClaims(c)
	if err != nil {
		return 0, err
	}
	return customClaims.UserID, nil
}
func GetUserIDFromGinAllowCookies(c *gin.Context) (int, error) {
	customClaims, err := authentication.GetClaims(c)
	if err != nil {
		err = authentication.CookieTokenValid(c)
		if err != nil {
			return 0, err
		}
		return GetUserIDFromGin(c)
	}
	return customClaims.UserID, nil
}

const (
	tagTypePreview             = "FilePreviewed"
	tagTypePreviewDescription  = "The file was previewed in the UI by an operator"
	tagTypePreviewColor        = "#c39a43"
	tagTypeDownload            = "FileDownloaded"
	tagTypeDownloadDescription = "The file was downloaded by an operator in the UI"
	tagTypeDownloadColor       = "#709567"
)

func tagFileAs(fileMetaID int, operatorName string, operationID int, tagTypeAssignment string) {
	tagtype := databaseStructs.TagType{}
	err := database.DB.Get(&tagtype, `SELECT * FROM tagtype WHERE name=$1 AND operation_id=$2`,
		tagTypeAssignment, operationID)
	if errors.Is(err, sql.ErrNoRows) {
		// we need to create this tagtype
		newTagType := databaseStructs.TagType{
			Name:      tagTypeAssignment,
			Operation: operationID,
		}
		switch tagTypeAssignment {
		case tagTypeDownload:
			newTagType.Description = tagTypeDownloadDescription
			newTagType.Color = tagTypeDownloadColor
		case tagTypePreview:
			newTagType.Description = tagTypePreviewDescription
			newTagType.Color = tagTypePreviewColor
		default:
		}
		statement, err := database.DB.PrepareNamed(`INSERT INTO tagtype 
			(name, color, description, operation_id)
			VALUES (:name, :color, :description, :operation_id)
			RETURNING id`)
		if err != nil {
			logging.LogError(err, "failed to create prepared named statement")
			return
		}
		err = statement.Get(&newTagType.ID, newTagType)
		if err != nil {
			logging.LogError(err, "failed to create prepared named statement")
			return
		}
		tagtype.ID = newTagType.ID
	} else if err != nil {
		logging.LogError(err, "failed to get tagtypes")
		return
	}
	tag := databaseStructs.Tag{
		Operation: operationID,
		TagType:   tagtype.ID,
		Source:    "mythic",
	}
	tag.FileMeta.Valid = true
	tag.FileMeta.Int64 = int64(fileMetaID)
	newKey := fmt.Sprintf("%s", time.Now().UTC().Format(rabbitmq.TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS))
	tag.Data = rabbitmq.GetMythicJSONTextFromStruct(
		map[string]interface{}{
			newKey: operatorName,
		},
	)
	err = database.DB.Get(&tag, `SELECT * FROM tag WHERE filemeta_id=$1 AND operation_id=$2 AND tagtype_id=$3 AND source='mythic'`,
		fileMetaID, operationID, tagtype.ID)
	if errors.Is(err, sql.ErrNoRows) {
		// we create it
		_, err = database.DB.NamedExec(`INSERT INTO tag (filemeta_id, operation_id, tagtype_id, source, data)
			VALUES (:filemeta_id, :operation_id, :tagtype_id, :source, :data )`, tag)
		if err != nil {
			logging.LogError(err, "failed to insert tag")
			return
		}
	} else if err != nil {
		logging.LogError(err, "failed to search for tags")
		return
	}
	// the tag exists, we just need to update the data
	tagData := tag.Data.StructValue()
	tagData[newKey] = operatorName
	tag.Data = rabbitmq.GetMythicJSONTextFromStruct(tagData)
	_, err = database.DB.NamedExec(`UPDATE tag SET data=:data WHERE id=:id`, tag)
	if err != nil {
		logging.LogError(err, "failed to update tag")
	}
}
