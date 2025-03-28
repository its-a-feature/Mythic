package rabbitmq

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type importTagtypeResponse struct {
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
}

func TagtypeImport(input []databaseStructs.TagType, operatorOperation *databaseStructs.Operatoroperation) importTagtypeResponse {
	response := importTagtypeResponse{
		Status: "error",
	}
	for _, newTagtype := range input {
		tagtype := databaseStructs.TagType{}
		err := database.DB.Get(&tagtype, `SELECT
			id
			FROM tagtype
			WHERE name=$1 AND operation_id=$2`, newTagtype.Name, operatorOperation.CurrentOperation.ID)
		if errors.Is(err, sql.ErrNoRows) {
			// it doesn't exist, so add it
			newTagtype.Operation = operatorOperation.CurrentOperation.ID
			_, err = database.DB.NamedExec(`INSERT INTO tagtype
				(name, description, color, operation_id)
				VALUES (:name, :description, :color, :operation_id)`, newTagtype)
			if err != nil {
				logging.LogError(err, "Failed to create new tagtype")
				response.Error = "Failed to create new tagtype: " + err.Error()
				return response
			}
		} else if err == nil {
			// we found it, so update it
			tagtype.Color = newTagtype.Color
			tagtype.Description = newTagtype.Description
			_, err = database.DB.NamedExec(`UPDATE tagtype SET
			color=:color, description=:description 
			WHERE id=:id`, tagtype)
			if err != nil {
				logging.LogError(err, "Failed to update existing tagtype from imported set")
				response.Error = "Failed to update existing tagtype: " + err.Error()
				return response
			}
		} else if !strings.Contains(err.Error(), "duplicate key value") {
			// some error occurred
			logging.LogError(err, "Failed to fetch tagtypes from database when importing tagtypes")
			response.Error = "Failed to query tagtypes from database: " + err.Error()
			return response
		}
	}
	response.Status = "success"
	return response
}
