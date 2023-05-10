package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type mitreFileStruct struct {
	Techniques []mitreFileStructTechnique `json:"techniques"`
}
type mitreFileStructTechnique struct {
	TNum   string   `json:"t_num"`
	Name   string   `json:"name"`
	OS     []string `json:"os"`
	Tactic []string `json:"tactic"`
}

func initializeMitreAttack() {
	fmt.Printf("Step 3.5/6 - Initializing MITRE ATT&CK\n")
	var attackObjects = mitreFileStruct{}
	if fileBytes, err := os.ReadFile(filepath.Join(".", "utils", "files", "attack.json")); err != nil {
		logging.LogError(err, "Failed to read attack file from disk")
	} else if err := json.Unmarshal(fileBytes, &attackObjects); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON att&ck file bytes into structs")
	} else {
		for _, tech := range attackObjects.Techniques {
			databaseMitreAttack := databaseStructs.Attack{
				TNum: tech.TNum,
				Name: tech.Name,
			}
			if osBytes, err := json.Marshal(tech.OS); err != nil {
				logging.LogError(err, "Failed to convert OS array to JSON string", "tech", tech)

			} else {
				databaseMitreAttack.Os = string(osBytes)
			}
			if tacticBytes, err := json.Marshal(tech.Tactic); err != nil {
				logging.LogError(err, "Failed to convert tactic array to JSON string", "tech", tech)
			} else {
				databaseMitreAttack.Tactic = string(tacticBytes)
			}
			existingDatabaseEntry := databaseStructs.Attack{}
			if err := DB.Get(&existingDatabaseEntry, `SELECT
			*
			FROM
			attack
			WHERE t_num=$1`, databaseMitreAttack.TNum); err == nil {
				// this means we found an existing t_num, so update it
				if _, err := DB.NamedExec(`UPDATE attack SET 
				name=:name, os=:os, tactic=:tactic
				WHERE t_num=:t_num`, databaseMitreAttack); err != nil {
					logging.LogError(err, "Failed to update existing MITRE ATT&CK data")
				}
			} else if err == sql.ErrNoRows {
				if _, err := DB.NamedExec(`INSERT INTO attack
				(t_num, name, os, tactic)
				VALUES (:t_num, :name, :os, :tactic)`, databaseMitreAttack); err != nil {
					logging.LogError(err, "Failed to add new MITRE ATT&CK entry")
				}
			} else {
				// we failed to search the database in general, so bail
				logging.LogError(err, "Failed to search database for existing MITRE ATT&CK entry")
			}

		}
	}
	logging.LogInfo("MITRE ATT&CK Initialized")
}
