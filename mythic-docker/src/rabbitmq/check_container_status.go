package rabbitmq

import (
	"fmt"
	"github.com/its-a-feature/Mythic/grpc"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

var checkContainerStatusAddPtChannel = make(chan databaseStructs.Payloadtype)
var payloadTypesToCheck = map[string]databaseStructs.Payloadtype{}
var checkContainerStatusAddC2Channel = make(chan databaseStructs.C2profile)
var c2profilesToCheck = map[string]databaseStructs.C2profile{}
var checkContainerStatusAddTrChannel = make(chan databaseStructs.Translationcontainer)
var translationContainersToCheck = map[string]databaseStructs.Translationcontainer{}

func checkContainerStatusAddPT() {
	for {
		pt := <-checkContainerStatusAddPtChannel
		payloadTypesToCheck[pt.Name] = pt
	}
}
func checkContainerStatusAddC2() {
	for {
		pt := <-checkContainerStatusAddC2Channel
		c2profilesToCheck[pt.Name] = pt
	}
}
func checkContainerStatusAddTR() {
	for {
		pt := <-checkContainerStatusAddTrChannel
		translationContainersToCheck[pt.Name] = pt
	}
}
func initializeContainers() {
	payloadtypes := []databaseStructs.Payloadtype{}
	if err := database.DB.Select(&payloadtypes, `SELECT * FROM payloadtype`); err != nil {
		logging.LogError(err, "Failed to fetch payloadtypes")
	} else {
		for i, _ := range payloadtypes {
			checkContainerStatusAddPtChannel <- payloadtypes[i]
		}
	}
	c2profiles := []databaseStructs.C2profile{}
	if err := database.DB.Select(&c2profiles, `SELECT * from c2profile`); err != nil {
		logging.LogError(err, "Failed to fetch c2 profiles")
	} else {
		for i, _ := range c2profiles {
			checkContainerStatusAddC2Channel <- c2profiles[i]
		}
	}
	translations := []databaseStructs.Translationcontainer{}
	if err := database.DB.Select(&translations, `SELECT * from translationcontainer`); err != nil {
		logging.LogError(err, "Failed to fetch translation containers")
	} else {
		for i, _ := range translations {
			checkContainerStatusAddTrChannel <- translations[i]
		}
	}
}
func checkContainerStatus() {
	go checkContainerStatusAddPT()
	go checkContainerStatusAddC2()
	go checkContainerStatusAddTR()
	go initializeContainers()
	for {
		time.Sleep(CHECK_CONTAINER_STATUS_DELAY)
		// loop through payload types
		for container := range payloadTypesToCheck {
			//logging.LogDebug("checking container", "container", container)
			// check that a container is online
			if running, err := RabbitMQConnection.CheckPayloadTypeContainerExists(payloadTypesToCheck[container].Name); err != nil {
				logging.LogError(err, "Failed to check for payloadtype container existence")
			} else if running != payloadTypesToCheck[container].ContainerRunning {
				if entry, ok := payloadTypesToCheck[container]; ok {
					entry.ContainerRunning = running
					payloadTypesToCheck[container] = entry
				} else {
					logging.LogError(nil, "Failed to get payload type from map for updating running status")
				}
				if _, err = database.DB.NamedExec(`UPDATE payloadtype SET 
							container_running=:container_running, deleted=false 
							WHERE id=:id`, payloadTypesToCheck[container],
				); err != nil {
					logging.LogError(err, "Failed to set container running status", "container_running", payloadTypesToCheck[container].ContainerRunning, "container", container)
				}
				if !running {
					SendAllOperationsMessage(
						getDownContainerMessage(container),
						0, fmt.Sprintf("%s_container_down", container), "warning")
					go updateDownContainerBuildingPayloads(container)
				}
			}

		}
		// loop through c2 profiles
		for container := range c2profilesToCheck {
			// check that a container is online
			//logging.LogDebug("checking container", "container", container)
			if running, err := RabbitMQConnection.CheckC2ProfileContainerExists(container); err != nil {
				logging.LogError(err, "Failed to check for c2 container existence")
			} else if running != c2profilesToCheck[container].ContainerRunning {
				if entry, ok := c2profilesToCheck[container]; ok {
					entry.ContainerRunning = running
					c2profilesToCheck[container] = entry
				} else {
					logging.LogError(nil, "Failed to get c2 profile from map for updating running status")
				}
				if !running {
					UpdateC2ProfileRunningStatus(c2profilesToCheck[container], false)
					SendAllOperationsMessage(
						getDownContainerMessage(container),
						0, fmt.Sprintf("%s_container_down", container), "warning")
				}
				if _, err = database.DB.NamedExec(`UPDATE c2profile SET 
							container_running=:container_running, deleted=false 
							WHERE id=:id`, c2profilesToCheck[container],
				); err != nil {
					logging.LogError(err, "Failed to set container running status", "container_running", c2profilesToCheck[container].ContainerRunning, "container", container)
				}

			}
		}
		// loop through translation containers
		for container := range translationContainersToCheck {
			// check that a container is online
			//logging.LogDebug("checking container", "container", container)
			running := checkTranslationContainerGRPCOnline(container)
			if running != translationContainersToCheck[container].ContainerRunning {
				if entry, ok := translationContainersToCheck[container]; ok {
					entry.ContainerRunning = running
					translationContainersToCheck[container] = entry
				} else {
					logging.LogError(nil, "Failed to get translation container from map for updating running status")
				}
				if !running {
					SendAllOperationsMessage(
						getDownContainerMessage(container),
						0, fmt.Sprintf("%s_container_down", container), "warning")
				}
				if _, err := database.DB.NamedExec(`UPDATE translationcontainer SET
							container_running=:container_running, deleted=false
							WHERE id=:id`, translationContainersToCheck[container],
				); err != nil {
					logging.LogError(err, "Failed to set container running status", "container_running", translationContainersToCheck[container].ContainerRunning, "container", container)
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
