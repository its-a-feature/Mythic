package rabbitmq

import (
	"fmt"
	"github.com/its-a-feature/Mythic/grpc"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

func checkContainerStatus() {
	for {
		time.Sleep(RETRY_CONNECT_DELAY)
		// loop through payload types
		container := databaseStructs.Payloadtype{}
		if rows, err := database.DB.NamedQuery(`SELECT
			id, container_running, "name"
			FROM payloadtype
		`, container); err != nil {
			logging.LogError(err, "Failed to get payloadtypes from database")
		} else {
			for rows.Next() {
				if err = rows.StructScan(&container); err != nil {
					logging.LogError(err, "Failed to get row from payloadtypes for checking online status")
				} else {
					// check that a container is online
					if running, err := RabbitMQConnection.CheckPayloadTypeContainerExists(container.Name); err != nil {
						logging.LogError(err, "Failed to check for payloadtype container existence")
					} else if running != container.ContainerRunning {
						container.ContainerRunning = running
						if _, err = database.DB.NamedExec(`UPDATE payloadtype SET 
							container_running=:container_running, deleted=false 
							WHERE id=:id`, container,
						); err != nil {
							logging.LogError(err, "Failed to set container running status", "container_running", container.ContainerRunning, "container", container.Name)
						}
						if !running {
							database.SendAllOperationsMessage(
								getDownContainerMessage(container.Name),
								0, fmt.Sprintf("%s_container_down", container.Name), "warning")
							go updateDownContainerBuildingPayloads(container.Name)
						}
					}
				}
			}
		}
		// loop through c2 profiles
		c2Container := databaseStructs.C2profile{}
		if rows, err := database.DB.NamedQuery(`SELECT
			id, container_running, "name"
			FROM c2profile
		`, c2Container); err != nil {
			logging.LogError(err, "Failed to get c2profiles from database")
			continue
		} else {
			for rows.Next() {
				if err = rows.StructScan(&c2Container); err != nil {
					logging.LogError(err, "Failed to get row from c2profiles for checking online status")
					continue
				} else {
					// check that a container is online
					if running, err := RabbitMQConnection.CheckC2ProfileContainerExists(c2Container.Name); err != nil {
						logging.LogError(err, "Failed to check for c2 container existence")
					} else if running != c2Container.ContainerRunning {
						c2Container.ContainerRunning = running
						if !running {
							UpdateC2ProfileRunningStatus(c2Container, false)
							database.SendAllOperationsMessage(
								getDownContainerMessage(c2Container.Name),
								0, fmt.Sprintf("%s_container_down", c2Container.Name), "warning")
						}
						if _, err = database.DB.NamedExec(`UPDATE c2profile SET 
							container_running=:container_running, deleted=false 
							WHERE id=:id`, c2Container,
						); err != nil {
							logging.LogError(err, "Failed to set container running status", "container_running", c2Container.ContainerRunning, "container", c2Container.Name)
						}

					}
				}
			}
		}
		// loop through translation containers
		translationContainer := databaseStructs.Translationcontainer{}
		if rows, err := database.DB.NamedQuery(`SELECT
			id, container_running, "name"
			FROM translationcontainer
		`, translationContainer); err != nil {
			logging.LogError(err, "Failed to get translationcontainer from database")
			continue
		} else {
			for rows.Next() {
				if err = rows.StructScan(&translationContainer); err != nil {
					logging.LogError(err, "Failed to get row from translationcontainer for checking online status")
					continue
				} else {
					// check that a container is online
					running := checkTranslationContainerGRPCOnline(translationContainer.Name)
					if running != translationContainer.ContainerRunning {
						translationContainer.ContainerRunning = running
						if !running {
							database.SendAllOperationsMessage(
								getDownContainerMessage(translationContainer.Name),
								0, fmt.Sprintf("%s_container_down", translationContainer.Name), "warning")
						}
						if _, err = database.DB.NamedExec(`UPDATE translationcontainer SET
							container_running=:container_running, deleted=false
							WHERE id=:id`, translationContainer,
						); err != nil {
							logging.LogError(err, "Failed to set container running status", "container_running", translationContainer.ContainerRunning, "container", translationContainer.Name)
						}
					}
				}
			}
		}
	}
}

func checkTranslationContainerGRPCOnline(containerName string) bool {
	return grpc.TranslationContainerServer.CheckClientConnected(containerName)
}

func getDownContainerMessage(containerName string) string {
	return fmt.Sprintf("Error: Can't contact %s", containerName)
}

func UpdateC2ProfileRunningStatus(c2Profile databaseStructs.C2profile, running bool) {
	if _, err := database.DB.Exec(`UPDATE c2profile SET running=$1 WHERE id=$2`, running, c2Profile.ID); err != nil {
		logging.LogError(err, "Failed to update C2 profile running status", "c2_profile", c2Profile.ID)
	}
}

func updateDownContainerBuildingPayloads(containerName string) {
	payloads := []databaseStructs.Payload{}
	if err := database.DB.Select(&payloads, `SELECT
	payload.id, payload.build_stderr
	FROM payload
	JOIN payloadtype ON payloadtype.id = payload.payload_type_id
	WHERE payloadtype.name=$1 AND payload.build_phase='building'`, containerName); err != nil {
		logging.LogError(err, "Failed to search for payloads related to down container")
	} else {
		for _, payload := range payloads {
			payload.BuildStderr = payload.BuildStderr + "\nContainer went offline, marking payload as failed to build"
			if _, err := database.DB.NamedExec(`UPDATE payload SET build_phase='error', build_stderr=:build_stderr WHERE id=:id`, payload); err != nil {
				logging.LogError(err, "Failed to update payload build_phase to error")
			}
		}

	}
}
