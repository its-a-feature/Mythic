package rabbitmq

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"github.com/its-a-feature/Mythic/grpc"
	"github.com/its-a-feature/Mythic/utils"
	"io"
	"net/http"
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

var tr = &http.Transport{
	TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	MaxIdleConns:    10,
	MaxConnsPerHost: 10,
	//IdleConnTimeout: 1 * time.Nanosecond,
}
var httpClient = &http.Client{
	Timeout:   5 * time.Second,
	Transport: tr,
}

type rabbitmqAPIQuery struct {
	FilteredCount int                      `json:"filtered_count" mapstructure:"filtered_count"`
	ItemCount     int                      `json:"item_count" mapstructure:"item_count"`
	Items         []map[string]interface{} `json:"items" mapstructure:"items"`
	Page          int                      `json:"page" mapstructure:"page"`
	PageCount     int                      `json:"page_count" mapstructure:"page_count"`
	PageSize      int                      `json:"page_size" mapstructure:"page_size"`
	TotalCount    int                      `json:"total_count" mapstructure:"total_count"`
}

func checkContainerStatus() {
	// get all queues from rabbitmq
	// http://rabbitmq_user:rabbitmq_password@rabbitmq_host:15672/rabbitmq/api/queues/mythic_vhost
	rabbitmqReqURL := fmt.Sprintf("http://%s:%s@%s:15672/api/queues/mythic_vhost?use_regex=true&page=1&page_size=500&name=%s",
		utils.MythicConfig.RabbitmqUser, utils.MythicConfig.RabbitmqPassword, utils.MythicConfig.RabbitmqHost,
		fmt.Sprintf("(.%%2A_%s|.%%2A_%s)", PT_BUILD_ROUTING_KEY, C2_RPC_START_SERVER_ROUTING_KEY))
	go checkContainerStatusAddPT()
	go checkContainerStatusAddC2()
	go checkContainerStatusAddTR()
	go initializeContainers()
	for {
		time.Sleep(CHECK_CONTAINER_STATUS_DELAY)
		rabbitmqReq, err := http.NewRequest("GET", rabbitmqReqURL, nil)
		if err != nil {
			logging.LogError(err, "Failed to generate http request to fetch queues from rabbitmq")
			continue
		}
		rabbitmqResponse, err := httpClient.Do(rabbitmqReq)
		if err != nil {
			logging.LogError(err, "Failed to fetch queues from rabbitmq")
			continue
		}
		if rabbitmqResponse.StatusCode != 200 {
			logging.LogError(nil, "Failed to get a good status code from rabbitmq",
				"status_code", rabbitmqResponse.StatusCode, "status", rabbitmqResponse.Status)
			continue
		}
		rabbitmqBody, err := io.ReadAll(rabbitmqResponse.Body)
		if err != nil {
			logging.LogError(err, "Failed to read body of message from rabbitmq")
			rabbitmqResponse.Body.Close()
			continue
		}
		rabbitmqResponse.Body.Close()

		rabbitmqQueues := rabbitmqAPIQuery{}
		err = json.Unmarshal(rabbitmqBody, &rabbitmqQueues)
		if err != nil {
			logging.LogError(err, "Failed to convert rabbitmq response into list of dictionaries")
			continue
		}
		//logging.LogInfo("got message from rabbitmq", "queue body", rabbitmqQueues)
		existingQueues := make([]string, len(rabbitmqQueues.Items))
		for index, queue := range rabbitmqQueues.Items {
			if queueName, ok := queue["name"]; !ok {
				logging.LogError(nil, "no 'name' field in queue information from rabbitmq")
			} else {
				existingQueues[index] = queueName.(string)
				//logging.LogInfo("found queue", "queue", queueName)
			}
		}

		// loop through payload types
		for container := range payloadTypesToCheck {
			//logging.LogDebug("checking container", "container", container)
			// check that a container is online
			running := utils.SliceContains(existingQueues, GetPtBuildRoutingKey(payloadTypesToCheck[container].Name))
			if running != payloadTypesToCheck[container].ContainerRunning {
				if entry, ok := payloadTypesToCheck[container]; ok {
					entry.ContainerRunning = running
					if _, err = database.DB.NamedExec(`UPDATE payloadtype SET
								container_running=:container_running, deleted=false
								WHERE id=:id`, entry,
					); err != nil {
						logging.LogError(err, "Failed to set container running status", "container_running", payloadTypesToCheck[container].ContainerRunning, "container", container)
					} else {
						payloadTypesToCheck[container] = entry
						if !running {
							SendAllOperationsMessage(
								getDownContainerMessage(container),
								0, fmt.Sprintf("%s_container_down", container), "warning")
							go updateDownContainerBuildingPayloads(container)
						} else {
							go database.ResolveAllOperationsMessage(getDownContainerMessage(container), 0)
						}
					}

				} else {
					logging.LogError(nil, "Failed to get payload type from map for updating running status")
				}
			}
		}
		// loop through c2 profiles
		for container := range c2profilesToCheck {
			// check that a container is online
			//logging.LogDebug("checking container", "container", container)
			running := utils.SliceContains(existingQueues, GetC2RPCStartServerRoutingKey(c2profilesToCheck[container].Name))
			//logging.LogInfo("checking container running", "container", container, "running", running, "current_running", c2profilesToCheck[container].ContainerRunning)
			if running != c2profilesToCheck[container].ContainerRunning {
				if entry, ok := c2profilesToCheck[container]; ok {
					entry.ContainerRunning = running
					if _, err = database.DB.NamedExec(`UPDATE c2profile SET 
							container_running=:container_running, deleted=false 
							WHERE id=:id`, entry,
					); err != nil {
						logging.LogError(err, "Failed to set container running status", "container_running", c2profilesToCheck[container].ContainerRunning, "container", container)
					} else {
						c2profilesToCheck[container] = entry
						if !running {
							UpdateC2ProfileRunningStatus(c2profilesToCheck[container], false)
							SendAllOperationsMessage(
								getDownContainerMessage(container),
								0, fmt.Sprintf("%s_container_down", container), "warning")
						} else {
							go database.ResolveAllOperationsMessage(getDownContainerMessage(container), 0)
						}
					}
				} else {
					logging.LogError(nil, "Failed to get c2 profile from map for updating running status")
				}
			}
		}
		// loop through translation containers
		for container := range translationContainersToCheck {
			// check that a container is online
			//logging.LogDebug("checking container", "container", container)
			running := checkTranslationContainerGRPCOnline(container)
			//logging.LogInfo("checking container running", "container", container, "running", running, "current_running", translationContainersToCheck[container].ContainerRunning)
			if running != translationContainersToCheck[container].ContainerRunning {
				if entry, ok := translationContainersToCheck[container]; ok {
					entry.ContainerRunning = running
					if _, err := database.DB.NamedExec(`UPDATE translationcontainer SET
							container_running=:container_running, deleted=false
							WHERE id=:id`, entry,
					); err != nil {
						logging.LogError(err, "Failed to set container running status", "container_running", translationContainersToCheck[container].ContainerRunning, "container", container)
					} else {
						translationContainersToCheck[container] = entry
						if !running {
							SendAllOperationsMessage(
								getDownContainerMessage(container),
								0, fmt.Sprintf("%s_container_down", container), "warning")
						} else {
							go database.ResolveAllOperationsMessage(getDownContainerMessage(container), 0)
						}
					}
				} else {
					logging.LogError(nil, "Failed to get translation container from map for updating running status")
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
