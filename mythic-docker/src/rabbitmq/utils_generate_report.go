package rabbitmq

import (
	"crypto/md5"
	"crypto/sha1"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
)

type GenerateReportMessage struct {
	IncludeMITREPerTask bool   `json:"includeMITREPerTask" `
	IncludeMITREOverall bool   `json:"includeMITREOverall" `
	ExcludedUsers       string `json:"excludedUsers" `
	ExcludedHosts       string `json:"excludedHosts"`
	ExcludedIDs         string `json:"excludedIDs" `
	IncludeOutput       bool   `json:"includeOutput"`
	OutputFormat        string `json:"outputFormat" `
	OperatorOperation   *databaseStructs.Operatoroperation
}
type Link struct {
	XMLName xml.Name `xml:"a"`
	Style   string   `xml:"style,attr"`
	Href    string   `xml:"href,attr"`
	Target  string   `xml:"target,attr"`
	Data    string   `xml:",chardata"`
}
type LinkCell struct {
	XMLName xml.Name `xml:"td"`
	Data    []Link
}
type XMLTableRows struct {
	XMLName xml.Name      `xml:"tr"`
	Style   string        `xml:"style,attr"`
	Data    []interface{} `xml:"td"`
}
type XMLTableBody struct {
	XMLName xml.Name `xml:"tbody"`
	Style   string   `xml:"style,attr"`
	Row     []XMLTableRows
}
type XMLTableHeadRowCell struct {
	XMLName xml.Name `xml:"th"`
	Data    string   `xml:",chardata"`
	Style   string   `xml:"style,attr"`
}
type XMLTableHeadRowCells struct {
	XMLName xml.Name `xml:"tr"`
	Style   string   `xml:"style,attr"`
	Data    []XMLTableHeadRowCell
}
type XMLTableHead struct {
	XMLName xml.Name `xml:"thead"`
	Row     XMLTableHeadRowCells
}
type XMLDiv struct {
	XMLName xml.Name `xml:"div"`
	Style   string   `xml:"style,attr"`
	Body    []interface{}
}
type XMLTable struct {
	XMLName xml.Name `xml:"table"`
	Style   string   `xml:"style,attr"`
	Head    XMLTableHead
	Body    XMLTableBody
}
type XMLParagraph struct {
	Data string `xml:"p"`
}
type XMLH2Header struct {
	XMLName xml.Name `xml:"h2"`
	Data    string   `xml:",chardata"`
	Style   string   `xml:"style,attr"`
}
type XMLH3Header struct {
	XMLName xml.Name `xml:"h3"`
	Data    string   `xml:",chardata"`
	Style   string   `xml:"style,attr"`
}
type XMLBr struct {
	XMLName xml.Name `xml:"br"`
}
type XMLPng struct {
	XMLName  xml.Name `xml:"img"`
	Style    string   `xml:"style,attr"`
	Contents string   `xml:"src,attr"`
}

var tableHeaderColor = "#c0c0c0"
var alternateRowColor = "#f0f0f0"

func GenerateReport(reportConfig GenerateReportMessage) {
	newFileMeta := databaseStructs.Filemeta{
		IsPayload:           false,
		IsScreenshot:        false,
		IsDownloadFromAgent: false,
		Complete:            true,
		Filename: []byte(fmt.Sprintf("%s-report.%s",
			reportConfig.OperatorOperation.CurrentOperation.Name,
			reportConfig.OutputFormat)),
		Comment: "Generated Operation Report",
	}
	if newUUID, newPath, err := GetSaveFilePath(); err != nil {
		logging.LogError(err, "Failed to save file to disk")
		go SendAllOperationsMessage(fmt.Sprintf("Failed to create report file on disk: %v", err),
			reportConfig.OperatorOperation.CurrentOperation.ID, "generated_report",
			database.MESSAGE_LEVEL_WARNING)
		return
	} else {
		newFileMeta.Path = newPath
		newFileMeta.AgentFileID = newUUID
	}
	var fileBytes []byte
	if reportConfig.OutputFormat == "json" {
		operatorRoles := getOperatorsAndRoles(reportConfig)
		report := map[string]interface{}{
			"report_name":        reportConfig.OperatorOperation.CurrentOperation.Name,
			"report_date":        fmt.Sprintf("Date: %s", time.Now().UTC().Format(TIME_FORMAT_STRING_YYYY_MM_DD)),
			"assigned_operators": operatorRoles,
			"metrics":            getOperationMetricsJSON(reportConfig),
			"activity":           getCallbacksTaskingMitre(reportConfig),
		}
		if absPath, err := filepath.Abs(newFileMeta.Path); err != nil {
			logging.LogError(err, "Failed to get absolute path to file on disk")
			go SendAllOperationsMessage(fmt.Sprintf("Failed to get absolute path to file on disk: %v", err),
				reportConfig.OperatorOperation.CurrentOperation.ID, "generated_report",
				database.MESSAGE_LEVEL_WARNING)
			return
		} else if jsonFile, err := os.OpenFile(absPath, os.O_APPEND|os.O_WRONLY, os.ModeAppend); err != nil {
			logging.LogError(err, "failed to create report file")
			go SendAllOperationsMessage(fmt.Sprintf("Failed to create file on disk: %v", err),
				reportConfig.OperatorOperation.CurrentOperation.ID, "generated_report",
				database.MESSAGE_LEVEL_WARNING)
			return
		} else {
			defer jsonFile.Close()
			if fileBytes, err = json.MarshalIndent(report, "", "  "); err != nil {
				go SendAllOperationsMessage(fmt.Sprintf("Failed to marshal dictionary to bytes: %v", err),
					reportConfig.OperatorOperation.CurrentOperation.ID, "generated_report",
					database.MESSAGE_LEVEL_WARNING)
				return
			} else if _, err := jsonFile.Write(fileBytes); err != nil {
				go SendAllOperationsMessage(fmt.Sprintf("Failed to write report to disk: %v", err),
					reportConfig.OperatorOperation.CurrentOperation.ID, "generated_report",
					database.MESSAGE_LEVEL_WARNING)
				return
			}
		}
	} else if reportConfig.OutputFormat == "html" {
		operatorRoles := getOperatorsAndRoles(reportConfig)
		operatorRows := make([]XMLTableRows, len(operatorRoles))
		for i := 0; i < len(operatorRoles); i++ {
			operatorRows[i].Data = operatorRoles[i]
			operatorRows[i].Style = `white-space:pre`
			if i%2 != 0 {
				operatorRows[i].Style += `;background-color:` + alternateRowColor
			}
		}
		mythicSvgContents, _ := os.ReadFile(filepath.Join(".", "static", "red_blue_login.png"))
		report := XMLDiv{
			Style: ``,
			Body: []interface{}{
				XMLDiv{
					Style: "display: flex",
					Body: []interface{}{
						XMLPng{
							Style:    `width: 200px; display: inline-flex`,
							Contents: fmt.Sprintf("data:image/png;base64, %s", base64.StdEncoding.EncodeToString(mythicSvgContents)),
						},
						XMLDiv{
							Style: "display: flex;justify-content: flex-start;flex-direction: column;width:  100%;align-content: flex-end;align-items: flex-end;",
							Body: []interface{}{
								XMLH2Header{
									Data:  reportConfig.OperatorOperation.CurrentOperation.Name + " Report",
									Style: `margin-bottom: 0;`,
								},
								XMLH3Header{
									Data:  fmt.Sprintf("Date: %s", time.Now().UTC().Format(TIME_FORMAT_STRING_YYYY_MM_DD)),
									Style: ``,
								},
							},
						},
					},
				},
			},
		}
		operatorTable := []interface{}{
			XMLH2Header{
				Data: "1. Assigned Operators",
			},
			XMLParagraph{
				Data: "The following table lists out all of the operators assigned to the operation and their roles in the assessment.",
			},
			XMLTable{
				Style: `width: 100%;`,
				Head: XMLTableHead{
					Row: XMLTableHeadRowCells{
						Style: `background-color: ` + tableHeaderColor,
						Data: []XMLTableHeadRowCell{
							{
								Data:  "Operator",
								Style: `width: 30%; text-align: left; padding: 5px`,
							},
							{
								Data:  "Role",
								Style: `text-align: left; padding: 5px`,
							},
						},
					},
				},
				Body: XMLTableBody{
					Row: operatorRows,
				},
			},
		}
		report.Body = append(report.Body, operatorTable...)
		report.Body = append(report.Body, getOperationMetricsHTML(reportConfig)...)
		report.Body = append(report.Body, getCallbacksTaskingMitre(reportConfig)...)
		if absPath, err := filepath.Abs(newFileMeta.Path); err != nil {
			logging.LogError(err, "Failed to get absolute path to file on disk")
			go SendAllOperationsMessage(fmt.Sprintf("Failed to get absolute path to report on disk: %v", err),
				reportConfig.OperatorOperation.CurrentOperation.ID, "generated_report",
				database.MESSAGE_LEVEL_WARNING)
			return
		} else if xmlFile, err := os.OpenFile(absPath, os.O_APPEND|os.O_WRONLY, os.ModeAppend); err != nil {
			logging.LogError(err, "failed to create report file")
			go SendAllOperationsMessage(fmt.Sprintf("Failed to create report file disk: %v", err),
				reportConfig.OperatorOperation.CurrentOperation.ID, "generated_report",
				database.MESSAGE_LEVEL_WARNING)
			return
		} else {
			defer xmlFile.Close()
			xmlFile.WriteString(xml.Header)
			fileEncoder := xml.NewEncoder(xmlFile)
			fileEncoder.Indent("", "\t")
			if err := fileEncoder.Encode(&report); err != nil {
				logging.LogError(err, "failed to encode xml data to file")
				go SendAllOperationsMessage(fmt.Sprintf("Failed to create report on disk: %v", err),
					reportConfig.OperatorOperation.CurrentOperation.ID, "generated_report",
					database.MESSAGE_LEVEL_WARNING)
				return
			} else if fileBytes, err = os.ReadFile(newFileMeta.Path); err != nil {
				logging.LogError(err, "Failed to open file to read to generate hashes")
				go SendAllOperationsMessage(fmt.Sprintf("Failed to read html report from disk: %v", err),
					reportConfig.OperatorOperation.CurrentOperation.ID, "generated_report",
					database.MESSAGE_LEVEL_WARNING)
				return
			}
		}
	} else {
		go SendAllOperationsMessage("Failed to create report, unknown output format",
			reportConfig.OperatorOperation.CurrentOperation.ID, "generated_report",
			database.MESSAGE_LEVEL_WARNING)
		return
	}
	sha1Sum := sha1.Sum(fileBytes)
	newFileMeta.Sha1 = fmt.Sprintf("%x", sha1Sum)
	md5Sum := md5.Sum(fileBytes)
	newFileMeta.Md5 = fmt.Sprintf("%x", md5Sum)
	newFileMeta.ChunkSize = len(fileBytes)
	newFileMeta.TotalChunks = 1
	newFileMeta.ChunksReceived = 1
	newFileMeta.Size = int64(len(fileBytes))
	newFileMeta.OperatorID = reportConfig.OperatorOperation.CurrentOperator.ID
	newFileMeta.OperationID = reportConfig.OperatorOperation.CurrentOperation.ID
	if _, err := database.DB.NamedExec(`INSERT INTO filemeta 
				(agent_file_id, "path", operation_id, operator_id, sha1, md5, complete, filename, comment, chunk_size, total_chunks, chunks_received, size)
				VALUES (:agent_file_id, :path, :operation_id, :operator_id, :sha1, :md5, :complete, :filename, :comment, :chunk_size, :total_chunks, :chunks_received, :size)`,
		newFileMeta); err != nil {
		logging.LogError(err, "Failed to create new filemeta data")
		go SendAllOperationsMessage("Failed to create report", newFileMeta.OperationID, "generated_report", database.MESSAGE_LEVEL_WARNING)
	} else {
		go SendAllOperationsMessage("created report:"+newFileMeta.AgentFileID, newFileMeta.OperationID, "generated_report", database.MESSAGE_LEVEL_INFO)
	}

}

func getOperatorsAndRoles(reportConfig GenerateReportMessage) [][]interface{} {

	otherOperators := []databaseStructs.Operatoroperation{}
	if err := database.DB.Select(&otherOperators, `SELECT
		operator.username "operator.username",
		view_mode
		FROM
        operatoroperation
        JOIN operator on operatoroperation.operator_id = operator.id
        WHERE operatoroperation.operation_id=$1
        ORDER BY view_mode ASC`, reportConfig.OperatorOperation.CurrentOperation.ID); err != nil {
		logging.LogError(err, "Failed to get other view operators for reporting")
	}
	operatorRoleValues := [][]interface{}{}
	for _, op := range otherOperators {
		operatorRoleValues = append(operatorRoleValues, []interface{}{op.CurrentOperator.Username, op.ViewMode})
	}

	return operatorRoleValues
}
func getOperationMetricsHTML(reportConfig GenerateReportMessage) []interface{} {
	callbacks := []databaseStructs.Callback{}
	if err := database.DB.Select(&callbacks, `SELECT
		"user", id, display_id, host, integrity_level, "domain"
		FROM callback
		WHERE operation_id=$1`, reportConfig.OperatorOperation.CurrentOperation.ID); err != nil {
		logging.LogError(err, "Failed to select callback information for reporting")
	} else {
		uniqueUsers := []string{}
		uniqueHosts := []string{}
		uniqueDomains := []string{}
		totalCallbacks := 0
		totalHighIntegrityCallbacks := 0
		totalTasks := 0
		excludedIDs := strings.Split(reportConfig.ExcludedIDs, ",")
		for i, _ := range excludedIDs {
			excludedIDs[i] = strings.TrimSpace(excludedIDs[i])
		}
		excludedUsers := strings.Split(reportConfig.ExcludedUsers, ",")
		for i, _ := range excludedUsers {
			excludedUsers[i] = strings.TrimSpace(excludedUsers[i])
		}
		excludedHosts := strings.Split(reportConfig.ExcludedHosts, ",")
		for i, _ := range excludedHosts {
			excludedHosts[i] = strings.TrimSpace(excludedHosts[i])
		}
		for i := 0; i < len(callbacks); i++ {
			currentUser := callbacks[i].User
			if callbacks[i].Domain != "" {
				currentUser = fmt.Sprintf("%s\\%s", callbacks[i].Domain, currentUser)
			} else if callbacks[i].Host != "" {
				currentUser = fmt.Sprintf("%s\\%s", callbacks[i].Host, currentUser)
			}
			if utils.SliceContains(excludedIDs, strconv.Itoa(callbacks[i].DisplayID)) ||
				utils.SliceContains(excludedUsers, callbacks[i].User) ||
				utils.SliceContains(excludedHosts, callbacks[i].Host) {
				continue
			} else {
				if !utils.SliceContains(uniqueUsers, currentUser) {
					if callbacks[i].User != "" {
						uniqueUsers = append(uniqueUsers, currentUser)
					}

				}
				if !utils.SliceContains(uniqueHosts, callbacks[i].Host) {
					if callbacks[i].Host != "" && callbacks[i].Host != "UNKNOWN" {
						uniqueHosts = append(uniqueHosts, callbacks[i].Host)
					}

				}
				if !utils.SliceContains(uniqueDomains, callbacks[i].Domain) {
					if callbacks[i].Domain != "" {
						uniqueDomains = append(uniqueDomains, callbacks[i].Domain)
					}

				}
				totalCallbacks += 1
				if callbacks[i].IntegrityLevel > 2 {
					totalHighIntegrityCallbacks += 1
				}
				tasksPerCallback := 0
				if err := database.DB.Get(&tasksPerCallback, `SELECT Count(*) FROM task WHERE callback_id=$1`, callbacks[i].ID); err != nil {
					logging.LogError(err, "Failed to get tasks count from callback id")
				} else {
					totalTasks += tasksPerCallback
				}

			}
		}
		metrics := [][]interface{}{
			{"Compromised Users", strings.Join(uniqueUsers, "\n")},
			{"Compromised Hosts", strings.Join(uniqueHosts, "\n")},
			{"Domains Accessed", strings.Join(uniqueDomains, "\n")},
			{"Total Callbacks", strconv.Itoa(totalCallbacks)},
			{"Total High Integrity Callbacks", strconv.Itoa(totalHighIntegrityCallbacks)},
			{"Total Tasks Issued", strconv.Itoa(totalTasks)},
		}
		metricsRows := make([]XMLTableRows, len(metrics))
		for i := 0; i < len(metrics); i++ {
			metricsRows[i].Data = metrics[i]
			metricsRows[i].Style = `white-space:pre`
			if i%2 != 0 {
				metricsRows[i].Style += `;background-color:` + alternateRowColor
			}
		}
		operationMetricsTable := []interface{}{
			XMLH2Header{
				Data: "2. Operation Metrics",
			},
			XMLParagraph{
				Data: "The following table lists out some metrics for the operation.",
			},
			XMLTable{
				Style: `width: 100%`,
				Head: XMLTableHead{
					Row: XMLTableHeadRowCells{
						Style: `background-color: ` + tableHeaderColor,
						Data: []XMLTableHeadRowCell{
							{
								Data:  "Metric",
								Style: `width: 30%; text-align: left; padding: 5px`,
							},
							{
								Data:  "Value",
								Style: `text-align: left; padding: 5px`,
							},
						},
					},
				},
				Body: XMLTableBody{
					Row: metricsRows,
				},
			},
		}
		return operationMetricsTable
	}
	return []interface{}{}
}
func getOperationMetricsJSON(reportConfig GenerateReportMessage) map[string]interface{} {
	callbacks := []databaseStructs.Callback{}
	if err := database.DB.Select(&callbacks, `SELECT
		"user", id, display_id, host, integrity_level, "domain"
		FROM callback
		WHERE operation_id=$1`, reportConfig.OperatorOperation.CurrentOperation.ID); err != nil {
		logging.LogError(err, "Failed to select callback information for reporting")
	} else {
		uniqueUsers := []string{}
		uniqueHosts := []string{}
		uniqueDomains := []string{}
		totalCallbacks := 0
		totalHighIntegrityCallbacks := 0
		totalTasks := 0
		excludedIDs := strings.Split(reportConfig.ExcludedIDs, ",")
		for i, _ := range excludedIDs {
			excludedIDs[i] = strings.TrimSpace(excludedIDs[i])
		}
		excludedUsers := strings.Split(reportConfig.ExcludedUsers, ",")
		for i, _ := range excludedUsers {
			excludedUsers[i] = strings.TrimSpace(excludedUsers[i])
		}
		excludedHosts := strings.Split(reportConfig.ExcludedHosts, ",")
		for i, _ := range excludedHosts {
			excludedHosts[i] = strings.TrimSpace(excludedHosts[i])
		}
		for i := 0; i < len(callbacks); i++ {
			currentUser := callbacks[i].User
			if callbacks[i].Domain != "" {
				currentUser = fmt.Sprintf("%s\\%s", callbacks[i].Domain, currentUser)
			} else if callbacks[i].Host != "" {
				currentUser = fmt.Sprintf("%s\\%s", callbacks[i].Host, currentUser)
			}
			if utils.SliceContains(excludedIDs, strconv.Itoa(callbacks[i].DisplayID)) ||
				utils.SliceContains(excludedUsers, callbacks[i].User) ||
				utils.SliceContains(excludedHosts, callbacks[i].Host) {
				continue
			} else {
				if !utils.SliceContains(uniqueUsers, currentUser) {
					if callbacks[i].User != "" {
						uniqueUsers = append(uniqueUsers, currentUser)
					}

				}
				if !utils.SliceContains(uniqueHosts, callbacks[i].Host) {
					if callbacks[i].Host != "" && callbacks[i].Host != "UNKNOWN" {
						uniqueHosts = append(uniqueHosts, callbacks[i].Host)
					}

				}
				if !utils.SliceContains(uniqueDomains, callbacks[i].Domain) {
					if callbacks[i].Domain != "" {
						uniqueDomains = append(uniqueDomains, callbacks[i].Domain)
					}

				}
				totalCallbacks += 1
				if callbacks[i].IntegrityLevel > 2 {
					totalHighIntegrityCallbacks += 1
				}
				tasksPerCallback := 0
				if err := database.DB.Get(&tasksPerCallback, `SELECT Count(*) FROM task WHERE callback_id=$1`, callbacks[i].ID); err != nil {
					logging.LogError(err, "Failed to get tasks count from callback id")
				} else {
					totalTasks += tasksPerCallback
				}

			}
		}
		return map[string]interface{}{
			"Compromised Users":              uniqueUsers,
			"Compromised Hosts":              uniqueHosts,
			"Domains Accessed":               uniqueDomains,
			"Total Callbacks":                totalCallbacks,
			"Total High Integrity Callbacks": totalHighIntegrityCallbacks,
			"Total Tasks Issued":             totalTasks,
		}
	}
	return map[string]interface{}{}
}
func getCallbacksTaskingMitre(reportConfig GenerateReportMessage) []interface{} {
	callbacks := []databaseStructs.Callback{}
	header := XMLH2Header{
		Data: "3. Callbacks",
	}
	paragraph := XMLParagraph{
		Data: "The following sections list out all of the callbacks in order, their callback information, and their associated tasks.",
	}
	var responsePieces []interface{}
	jsonMap := map[string]interface{}{}
	htmlArray := []interface{}{}
	switch reportConfig.OutputFormat {
	case "html":
		htmlArray = append(htmlArray, header, paragraph)
	case "json":
		jsonMap["callbacks"] = []map[string]interface{}{}
	default:
	}

	mitreTechCounts := map[string]uint32{}
	tNumToName := map[string]string{}
	artifactTypeCounts := map[string]uint32{}
	artifactRows := []XMLTableRows{}
	// now to make a subsection for each callback
	excludedIDs := strings.Split(reportConfig.ExcludedIDs, ",")
	for i, _ := range excludedIDs {
		excludedIDs[i] = strings.TrimSpace(excludedIDs[i])
	}
	excludedUsers := strings.Split(reportConfig.ExcludedUsers, ",")
	for i, _ := range excludedUsers {
		excludedUsers[i] = strings.TrimSpace(excludedUsers[i])
	}
	excludedHosts := strings.Split(reportConfig.ExcludedHosts, ",")
	for i, _ := range excludedHosts {
		excludedHosts[i] = strings.TrimSpace(excludedHosts[i])
	}
	if err := database.DB.Select(&callbacks, `SELECT 
    	callback.*,
    	p.id "payload.id",
    	p2.name "payload.payloadtype.name"
    	FROM callback 
    	JOIN payload p on callback.registered_payload_id = p.id
    	JOIN payloadtype p2 on p.payload_type_id = p2.id
    	WHERE callback.operation_id=$1
		ORDER BY callback.id ASC`,
		reportConfig.OperatorOperation.CurrentOperation.ID); err != nil {
		logging.LogError(err, "Failed to get callback information")
		return responsePieces
	} else {
		includedIdCount := 1
		for _, callback := range callbacks {
			if utils.SliceContains(excludedIDs, strconv.Itoa(callback.DisplayID)) ||
				utils.SliceContains(excludedUsers, callback.User) ||
				utils.SliceContains(excludedHosts, callback.Host) {
				continue
			} else {

				c2Profiles := []databaseStructs.Callbackc2profiles{}
				if err := database.DB.Select(&c2Profiles, `SELECT
					c2p.name "c2profile.name"
					FROM callbackc2profiles
					JOIN c2profile c2p on callbackc2profiles.c2_profile_id = c2p.id
					WHERE callbackc2profiles.callback_id=$1`, callback.ID); err != nil {
					logging.LogError(err, "Failed to fetch c2 profile information for callback")
				}
				tasks := []databaseStructs.Task{}
				if err := database.DB.Select(&tasks, `SELECT
					status_timestamp_processing, "timestamp", command_name, display_params, id, display_id
					FROM task
					WHERE callback_id=$1`, callback.ID); err != nil {
					logging.LogError(err, "Failed to get tasks for callback", "callback id", callback.ID)
				} else {
					switch reportConfig.OutputFormat {
					case "html":
						responsePieces = append(responsePieces, getCallbackInfoHTML(&callback, &c2Profiles, includedIdCount))
						taskingTable := XMLTable{
							Style: `width: 100%;table-layout: fixed;`,
							Head: XMLTableHead{
								Row: XMLTableHeadRowCells{
									Style: `background-color: ` + tableHeaderColor,
									Data: []XMLTableHeadRowCell{
										{
											Data:  "Execution Duration",
											Style: `width: 12rem; text-align: left; padding: 5px`,
										},
										{
											Data:  "Task Information",
											Style: `text-align: left; padding: 5px`,
										},
									},
								},
							},
						}
						if reportConfig.IncludeMITREPerTask {
							taskingTable.Head.Row.Data = append(taskingTable.Head.Row.Data, XMLTableHeadRowCell{
								Data:  "ATT&CK",
								Style: `text-align: left; padding: 5px; width: 5rem`,
							})
						}
						taskRows := getTaskInfoHTML(reportConfig, &tasks)
						taskingTable.Body.Row = taskRows
						responsePieces = append(responsePieces, XMLBr{}, taskingTable)
					case "json":
						callbackInfo := getCallbackInfoJSON(&callback, &c2Profiles, includedIdCount)
						callbackInfo["tasks"] = getTaskInfoJSON(reportConfig, &tasks)
						jsonMap["callbacks"] = append(jsonMap["callbacks"].([]map[string]interface{}), callbackInfo)
					default:
					}
					// get some aggregate data for later
					for i, _ := range tasks {
						attackTasks := []databaseStructs.Attacktask{}
						if err := database.DB.Select(&attackTasks, `SELECT 
    							a.t_num "attack.t_num",
    							a.name "attack.name"
    							FROM attacktask
    							JOIN attack a on attacktask.attack_id = a.id
								WHERE task_id=$1`, tasks[i].ID); err != nil {
							logging.LogError(err, "Failed to fetch ATT&CK data")
						} else {
							for j, _ := range attackTasks {
								// track some overall stats for the mitre section
								if _, ok := mitreTechCounts[attackTasks[j].Attack.TNum]; !ok {
									mitreTechCounts[attackTasks[j].Attack.TNum] = 1
									tNumToName[attackTasks[j].Attack.TNum] = attackTasks[j].Attack.Name
								} else {
									mitreTechCounts[attackTasks[j].Attack.TNum] += 1
								}
							}

						}
						taskArtifacts := []databaseStructs.Taskartifact{}
						if err := database.DB.Select(&taskArtifacts, `SELECT
    						artifact, base_artifact, host, "timestamp"
							FROM taskartifact
							WHERE task_id=$1`, tasks[i].ID); err == sql.ErrNoRows {
							continue
						} else if err != nil {
							logging.LogError(err, "Failed to search for artifacts from task")
						} else {
							for j, _ := range taskArtifacts {
								if _, ok := artifactTypeCounts[taskArtifacts[j].BaseArtifact]; !ok {
									artifactTypeCounts[taskArtifacts[j].BaseArtifact] = 1
								} else {
									artifactTypeCounts[taskArtifacts[j].BaseArtifact] += 1
								}
								rowStyle := `word-break: break-all;`
								artifactRows = append(artifactRows, XMLTableRows{
									Data: []interface{}{
										taskArtifacts[j].Timestamp,
										taskArtifacts[j].BaseArtifact,
										taskArtifacts[j].Host,
										string(taskArtifacts[j].Artifact),
									},
									Style: rowStyle,
								})
							}

						}
					}

				}
				includedIdCount += 1
			}
		}
		// MITRE ATT&CK SECTION
		if reportConfig.IncludeMITREOverall {
			mitreKeys := make([]string, len(mitreTechCounts))
			i := 0
			for key := range mitreTechCounts {
				mitreKeys[i] = key
				i++
			}
			// sort descending, the largest first
			sort.SliceStable(mitreKeys, func(i, j int) bool {
				return mitreTechCounts[mitreKeys[i]] > mitreTechCounts[mitreKeys[j]]
			})
			switch reportConfig.OutputFormat {
			case "html":
				// set up the MITRE section
				mitreHeader := XMLH2Header{
					Data: "4. MITRE ATT&CK Overview",
				}
				mitreParagraph := XMLParagraph{
					Data: "The following section gives an overview of the amount of coverage for MITRE ATT&CK across all tasks issued.",
				}
				mitreTaskingTable := XMLTable{
					Style: `width: 100%;table-layout: fixed;`,
					Head: XMLTableHead{
						Row: XMLTableHeadRowCells{
							Style: `background-color: ` + tableHeaderColor,
							Data: []XMLTableHeadRowCell{
								{
									Data:  "ATT&CK",
									Style: `width: 6rem; text-align: left; padding: 5px`,
								},
								{
									Data:  "Count",
									Style: `width: 6rem; text-align: left; padding: 5px`,
								},
								{
									Data:  "Name",
									Style: `text-align: left; padding: 5px`,
								},
							},
						},
					},
				}
				mitreTaskRows := make([]XMLTableRows, len(mitreKeys))
				for i, _ = range mitreKeys {
					mitreTaskRows[i].Data = []interface{}{mitreKeys[i], mitreTechCounts[mitreKeys[i]], tNumToName[mitreKeys[i]]}
					if i%2 == 0 {
						mitreTaskRows[i].Style += `background-color: ` + alternateRowColor
					}
				}
				mitreTaskingTable.Body.Row = mitreTaskRows
				responsePieces = append(responsePieces, mitreHeader, mitreParagraph, mitreTaskingTable, XMLParagraph{
					Data: `LICENSE
The MITRE Corporation (MITRE) hereby grants you a non-exclusive, royalty-free license to use ATT&CK™ for research,
development, and commercial purposes. Any copy you make for such purposes is authorized provided that you reproduce
MITRE’s copyright designation and this license in any such copy.
"© 2018 The MITRE Corporation. This work is reproduced and distributed with the permission of The MITRE Corporation."
DISCLAIMERS
MITRE does not claim ATT&CK enumerates all possibilities for the types of actions and behaviors documented as part of
its adversary model and framework of techniques. Using the information contained within ATT&CK to address or cover full
categories of techniques will not guarantee full defensive coverage as there may be undisclosed techniques or variations on
existing techniques not documented by ATT&CK.
ALL DOCUMENTS AND THE INFORMATION CONTAINED THEREIN ARE PROVIDED ON AN "AS IS" BASIS
AND THE CONTRIBUTOR, THE ORGANIZATION HE/SHE REPRESENTS OR IS SPONSORED BY (IF ANY), THE
MITRE CORPORATION, ITS BOARD OF TRUSTEES, OFFICERS, AGENTS, AND EMPLOYEES, DISCLAIM ALL
WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTY THAT THE USE
OF THE INFORMATION THEREIN WILL NOT INFRINGE ANY RIGHTS OR ANY IMPLIED WARRANTIES OF
MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE`,
				})
			case "json":
				mitreList := make([]interface{}, len(mitreKeys))
				for i, _ = range mitreKeys {
					mitreList[i] = map[string]interface{}{
						"t_num":     mitreKeys[i],
						"count":     mitreTechCounts[mitreKeys[i]],
						"technique": tNumToName[mitreKeys[i]],
					}
				}
				jsonMap["mitre"] = mitreList
			default:
			}
		}

		// ARTIFACT TYPE OVERVIEW
		artifactKeys := make([]string, len(artifactTypeCounts))
		i := 0
		for key := range artifactTypeCounts {
			artifactKeys[i] = key
			i++
		}
		sort.SliceStable(artifactKeys, func(i, j int) bool {
			return artifactTypeCounts[artifactKeys[i]] > artifactTypeCounts[artifactKeys[j]]
		})
		switch reportConfig.OutputFormat {
		case "html":
			// set up the Artifacts section
			artifactHeader := XMLH2Header{
				Data: "5. Artifacts Overview",
			}
			if !reportConfig.IncludeMITREOverall {
				artifactHeader.Data = "4. Artifacts Overview"
			}
			artifactParagraph := XMLParagraph{
				Data: "The following section gives an overview of the artifacts created throughout the operation and their counts.",
			}
			artifactTaskingTable := XMLTable{
				Style: `width: 100%;table-layout: fixed;`,
				Head: XMLTableHead{
					Row: XMLTableHeadRowCells{
						Style: `background-color: ` + tableHeaderColor,
						Data: []XMLTableHeadRowCell{
							{
								Data:  "Artifact",
								Style: `width: 30%; text-align: left; padding: 5px`,
							},
							{
								Data:  "Count",
								Style: `text-align: left; padding: 5px`,
							},
						},
					},
				},
			}
			artifactSummaryTaskRows := make([]XMLTableRows, len(artifactKeys))
			for i, _ = range artifactKeys {
				artifactSummaryTaskRows[i].Data = []interface{}{artifactKeys[i], artifactTypeCounts[artifactKeys[i]]}
				if i%2 == 0 {
					artifactSummaryTaskRows[i].Style += `background-color: ` + alternateRowColor
				}
			}
			artifactTaskingTable.Body.Row = artifactSummaryTaskRows
			responsePieces = append(responsePieces, XMLBr{}, artifactHeader, artifactParagraph, artifactTaskingTable)
		case "json":
		default:
		}
		// DETAILED ARTIFACT BREAKDOWN OF IOCs
		sort.SliceStable(artifactRows, func(i, j int) bool {
			return artifactRows[j].Data[0].(time.Time).After(artifactRows[i].Data[0].(time.Time))
		})
		switch reportConfig.OutputFormat {
		case "html":
			artifactBreakdownHeader := XMLH2Header{
				Data: "5.1 Artifacts Breakdown",
			}
			if !reportConfig.IncludeMITREOverall {
				artifactBreakdownHeader.Data = "4.1 Artifacts Breakdown"
			}
			artifactBreakdownParagraph := XMLParagraph{
				Data: "The following section gives a breakdown of each artifact, when it happened, and any detailed provided.",
			}
			for i, _ = range artifactRows {
				if i%2 == 0 {
					artifactRows[i].Style += `background-color: ` + alternateRowColor
				}
				artifactRows[i].Data[0] = artifactRows[i].Data[0].(time.Time).Format(TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS)
			}
			artifactBreakdownTaskingTable := XMLTable{
				Style: `width: 100%;table-layout: fixed;`,
				Head: XMLTableHead{
					Row: XMLTableHeadRowCells{
						Style: `background-color: ` + tableHeaderColor,
						Data: []XMLTableHeadRowCell{
							{
								Data:  "Time",
								Style: `width: 12rem; text-align: left; padding: 5px`,
							},
							{
								Data:  "Type",
								Style: `width: 12rem; text-align: left; padding: 5px`,
							},
							{
								Data:  "Host",
								Style: `text-align: left; padding: 5px`,
							},
							{
								Data:  "Artifact",
								Style: `text-align: left; padding: 5px`,
							},
						},
					},
				},
				Body: XMLTableBody{
					Row: artifactRows,
				},
			}
			responsePieces = append(responsePieces, XMLBr{}, artifactBreakdownHeader, artifactBreakdownParagraph, artifactBreakdownTaskingTable)
			return responsePieces
		case "json":
			return []interface{}{jsonMap}
		default:
			return responsePieces
		}
	}
}
func getCallbackInfoHTML(callback *databaseStructs.Callback, c2Profiles *[]databaseStructs.Callbackc2profiles, idCount int) interface{} {
	currentUser := callback.User
	if callback.Domain != "" {
		currentUser = fmt.Sprintf("%s\\%s", callback.Domain, currentUser)
	} else if callback.Host != "" {
		currentUser = fmt.Sprintf("%s\\%s", callback.Host, currentUser)
	}
	if callback.IntegrityLevel >= 3 {
		currentUser += "*"
	}
	integrityLevelString := ""
	switch callback.IntegrityLevel {
	case 0:
		integrityLevelString = "UNKNOWN"
	case 1:
		integrityLevelString = "LOW"
	case 2:
		integrityLevelString = "MEDIUM"
	case 3:
		integrityLevelString = "HIGH"
	case 4:
		integrityLevelString = "SYSTEM"
	}
	var ips []string
	if err := json.Unmarshal([]byte(callback.IP), &ips); err != nil {
		logging.LogError(err, "failed to parse out IP addresses for callback", "callback id", callback.ID)
	}
	c2ProfileString := ""
	for _, c2 := range *c2Profiles {
		c2ProfileString += c2.C2Profile.Name + " "
	}
	return []interface{}{
		XMLH3Header{
			Data:  fmt.Sprintf("3.%d New Callback %d", idCount, idCount),
			Style: `page-break-before: always;`,
		},
		XMLTable{
			Style: `width: 100%;table-layout: fixed;`,
			Head: XMLTableHead{
				Row: XMLTableHeadRowCells{
					Style: `background-color: ` + tableHeaderColor,
					Data: []XMLTableHeadRowCell{
						{
							Data:  "Callback Info",
							Style: `width: 30%; text-align: left; padding: 5px`,
						},
						{
							Data:  "Value",
							Style: `text-align: left; padding: 5px`,
						},
					},
				},
			},
			Body: XMLTableBody{
				Row: []XMLTableRows{
					{
						Style: `word-break: break-all;`,
						Data:  []interface{}{"User", currentUser},
					},
					{
						Style: `word-break: break-all;background-color:` + alternateRowColor,
						Data:  []interface{}{"Host", callback.Host},
					},
					{
						Style: `word-break: break-all;`,
						Data:  []interface{}{"PID", strconv.Itoa(callback.PID)},
					},
					{
						Style: `word-break: break-all;background-color:` + alternateRowColor,
						Data:  []interface{}{"IPs", strings.Join(ips, ", ")},
					},
					{
						Style: `word-break: break-all;`,
						Data:  []interface{}{"External IP", callback.ExternalIp},
					},
					{
						Style: `word-break: break-all;background-color:` + alternateRowColor,
						Data:  []interface{}{"Process Name", callback.ProcessName},
					},
					{
						Style: `word-break: break-all;`,
						Data:  []interface{}{"Description", callback.Description},
					},
					{
						Style: `word-break: break-all;background-color:` + alternateRowColor,
						Data:  []interface{}{"OS/Arch", callback.Os + "/" + callback.Architecture},
					},
					{
						Style: `word-break: break-all;`,
						Data:  []interface{}{"Domain", callback.Domain},
					},
					{
						Style: `word-break: break-all;background-color:` + alternateRowColor,
						Data:  []interface{}{"Integrity Level", integrityLevelString},
					},
					{
						Style: `word-break: break-all;`,
						Data:  []interface{}{"Initial Checkin", callback.InitCallback.Format(TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS)},
					},
					{
						Style: `word-break: break-all;background-color:` + alternateRowColor,
						Data:  []interface{}{"Last Checkin", callback.LastCheckin.Format(TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS)},
					},
					{
						Style: `word-break: break-all;`,
						Data:  []interface{}{"C2 Channels", c2ProfileString},
					},
					{
						Style: `word-break: break-all;background-color:` + alternateRowColor,
						Data:  []interface{}{"Payload Type", callback.Payload.Payloadtype.Name},
					},
				},
			},
		},
	}
}
func getCallbackInfoJSON(callback *databaseStructs.Callback, c2Profiles *[]databaseStructs.Callbackc2profiles, idCount int) map[string]interface{} {
	c2ProfileInfo := make([]string, len(*c2Profiles))
	for i, _ := range *c2Profiles {
		c2ProfileInfo[i] = (*c2Profiles)[i].C2Profile.Name + " "
	}
	integrityLevelString := ""
	switch callback.IntegrityLevel {
	case 0:
		integrityLevelString = "UNKNOWN"
	case 1:
		integrityLevelString = "LOW"
	case 2:
		integrityLevelString = "MEDIUM"
	case 3:
		integrityLevelString = "HIGH"
	case 4:
		integrityLevelString = "SYSTEM"
	}
	var ips []string
	if err := json.Unmarshal([]byte(callback.IP), &ips); err != nil {
		logging.LogError(err, "failed to parse out IP addresses for callback", "callback id", callback.ID)
	}
	return map[string]interface{}{
		"id":                 callback.ID,
		"display_id":         callback.DisplayID,
		"report_callback_id": idCount,
		"pid":                callback.PID,
		"host":               callback.Host,
		"user":               callback.User,
		"ips":                ips,
		"external_ip":        callback.ExternalIp,
		"process_name":       callback.ProcessName,
		"description":        callback.Description,
		"architecture":       callback.Architecture,
		"os":                 callback.Os,
		"domain":             callback.Domain,
		"integrity_level":    integrityLevelString,
		"initial_checkin":    callback.InitCallback.Format(TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS),
		"last_checkin":       callback.LastCheckin.Format(TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS),
		"c2_profiles":        c2ProfileInfo,
		"payload_type":       callback.Payload.Payloadtype.Name,
	}
}
func getTaskInfoHTML(reportConfig GenerateReportMessage, tasks *[]databaseStructs.Task) []XMLTableRows {
	taskRows := make([]XMLTableRows, len(*tasks))
	for i, _ := range *tasks {
		startTime := "N/A"
		if (*tasks)[i].StatusTimestampProcessing.Valid {
			startTime = (*tasks)[i].StatusTimestampProcessing.Time.Format(TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS)
		}
		endTime := "N/A"
		if (*tasks)[i].StatusTimestampProcessing.Valid {
			endTime = (*tasks)[i].Timestamp.Format(TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS)
		}
		rowData := []interface{}{
			fmt.Sprintf("Start: %s\nEnd : %s",
				startTime, endTime),
			fmt.Sprintf("%s %s", (*tasks)[i].CommandName, (*tasks)[i].DisplayParams),
		}
		taskRows[i].Style = `word-break: break-all;`
		if i%2 != 0 {
			taskRows[i].Style += `;background-color:` + alternateRowColor
		}
		attackTasks := []databaseStructs.Attacktask{}
		if err := database.DB.Select(&attackTasks, `SELECT 
    							a.t_num "attack.t_num",
    							a.name "attack.name"
    							FROM attacktask
    							JOIN attack a on attacktask.attack_id = a.id
								WHERE task_id=$1`, (*tasks)[i].ID); err != nil {
			logging.LogError(err, "Failed to fetch ATT&CK data")
		} else {
			links := make([]Link, len(attackTasks))
			for j, _ := range attackTasks {
				links[j].Data = attackTasks[j].Attack.TNum
				tNumPieces := strings.Split(attackTasks[j].Attack.TNum, ".")
				links[j].Href = `https://attack.mitre.org/techniques/` + strings.Join(tNumPieces, "/")
				links[j].Target = "_blank"
				links[j].Style = "display: block"
			}
			if reportConfig.IncludeMITREPerTask {
				rowData = append(rowData, LinkCell{Data: links})
			}

		}
		taskRows[i].Data = rowData
	}
	return taskRows
}
func getTaskInfoJSON(reportConfig GenerateReportMessage, tasks *[]databaseStructs.Task) []map[string]interface{} {
	taskRows := make([]map[string]interface{}, len(*tasks))
	for i, _ := range *tasks {
		startTime := "N/A"
		if (*tasks)[i].StatusTimestampProcessing.Valid {
			startTime = (*tasks)[i].StatusTimestampProcessing.Time.Format(TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS)
		}
		endTime := "N/A"
		if (*tasks)[i].StatusTimestampProcessing.Valid {
			endTime = (*tasks)[i].Timestamp.Format(TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS)
		}
		rowData := map[string]interface{}{
			"start_time":     startTime,
			"end_time":       endTime,
			"command_name":   (*tasks)[i].CommandName,
			"display_params": (*tasks)[i].DisplayParams,
			"display_id":     (*tasks)[i].DisplayID,
		}
		if reportConfig.IncludeMITREPerTask {
			attackTasks := []databaseStructs.Attacktask{}
			if err := database.DB.Select(&attackTasks, `SELECT 
    							a.t_num "attack.t_num",
    							a.name "attack.name"
    							FROM attacktask
    							JOIN attack a on attacktask.attack_id = a.id
								WHERE task_id=$1`, (*tasks)[i].ID); err != nil {
				logging.LogError(err, "Failed to fetch ATT&CK data")
			} else {
				links := make([]string, len(attackTasks))
				for j, _ := range attackTasks {
					links[j] = attackTasks[j].Attack.TNum
				}
				rowData["mitre"] = links
			}
		}
		if reportConfig.IncludeOutput {
			responses := []databaseStructs.Response{}
			if err := database.DB.Select(&responses, `SELECT
				response
				FROM response WHERE task_id=$1`, (*tasks)[i].ID); err != nil {
				logging.LogError(err, "Failed to fetch responses")
			} else {
				responseOutput := make([]string, len(responses))
				for j, _ := range responses {
					responseOutput[j] = string(responses[j].Response)
				}
				rowData["output"] = responseOutput
			}
		}
		taskRows[i] = rowData
	}
	return taskRows
}
