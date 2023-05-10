package rabbitmq

import (
	"database/sql"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type deleteTagtypeResponse struct {
	Status    string `json:"status"`
	Error     string `json:"error,omitempty"`
	TagtypeID int    `json:"tagtype_id,omitempty"`
}

func TagtypeDelete(input int, operatorOperation *databaseStructs.Operatoroperation) deleteTagtypeResponse {
	response := deleteTagtypeResponse{
		Status:    "error",
		TagtypeID: input,
	}
	logging.LogDebug("got a request to delete tagtype", "input", input)
	// saved value from the UI/Scripting will be key-value pairs with the final values (except for crypto generation)
	tagtype := databaseStructs.TagType{}
	if err := database.DB.Get(&tagtype, `SELECT
	*
	FROM tagtype
	WHERE id=$1 AND operation_id=$2`, input, operatorOperation.CurrentOperation.ID); err != nil {
		logging.LogError(err, "Failed to fetch tagtype")
		response.Error = "Failed to fetch tagtype: " + err.Error()
		return response
	} else {
		// now that we have the tagtype, we need to get all associated tags
		tags := []databaseStructs.Tag{}
		if err := database.DB.Select(&tags, `SELECT id
		FROM tag
		WHERE tagtype_id=$1 AND operation_id=$2`, tagtype.ID, operatorOperation.CurrentOperation.ID); err == sql.ErrNoRows {
			// no other tags to delete, just the tagtype
		} else if err != nil {
			logging.LogError(err, "Failed to search for tags")
			response.Error = "Failed to find associated tags: " + err.Error()
			return response
		} else {
			// we need to delete the associated tags
			for _, tag := range tags {
				if _, err := database.DB.NamedExec(`DELETE FROM tag WHERE id=:id`, tag); err != nil {
					logging.LogError(err, "Failed to delete tag associated with tagtype")
					response.Error = "Failed to delete a tag associated with that tagtype: " + err.Error()
					return response
				}
			}
		}
		// now delete the tagtype itself
		if _, err := database.DB.Exec(`DELETE FROM tagtype WHERE id=$1`, input); err != nil {
			logging.LogError(err, "Failed to delete tagtype")
			response.Error = "Failed to delete tagtype: " + err.Error()
			return response
		}
		response.Status = "success"
		return response
	}
}
