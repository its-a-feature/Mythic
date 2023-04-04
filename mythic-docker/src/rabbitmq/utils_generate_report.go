package rabbitmq

import (
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
type XMLH4Header struct {
	XMLName xml.Name `xml:"h4"`
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

var tableHeaderColor = "#a6a8a9"
var alternateRowColor = "lightgray"

func GenerateReport(reportConfig GenerateReportMessage) {

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
		Style: `width: 50%`,
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
								Style: ``,
							},
							XMLH4Header{
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

	report.Body = append(report.Body, getOperationMetrics(reportConfig)...)
	report.Body = append(report.Body, getCallbacksAndTasking(reportConfig)...)
	if reportConfig.IncludeMITREOverall {

	}
	if xmlFile, err := os.Create("test_report.html"); err != nil {
		logging.LogError(err, "failed to create report file")
	} else {
		defer xmlFile.Close()
		xmlFile.WriteString(xml.Header)
		fileEncoder := xml.NewEncoder(xmlFile)
		fileEncoder.Indent("", "\t")
		if err := fileEncoder.Encode(&report); err != nil {
			logging.LogError(err, "failed to encode xml data to file")
		}
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
        WHERE operatoroperation.operation_id=$1`, reportConfig.OperatorOperation.CurrentOperation.ID); err != nil {
		logging.LogError(err, "Failed to get other view operators for reporting")
	}
	operatorRoleValues := [][]interface{}{}
	for _, op := range otherOperators {
		operatorRoleValues = append(operatorRoleValues, []interface{}{op.CurrentOperator.Username, op.ViewMode})
	}

	return operatorRoleValues
}
func getOperationMetrics(reportConfig GenerateReportMessage) []interface{} {
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
		excludedIDs := strings.Split(reportConfig.ExcludedIDs, ",")
		excludedUsers := strings.Split(reportConfig.ExcludedUsers, ",")
		excludedHosts := strings.Split(reportConfig.ExcludedHosts, ",")
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
					uniqueUsers = append(uniqueUsers, currentUser)
				}
				if !utils.SliceContains(uniqueHosts, callbacks[i].Host) {
					uniqueHosts = append(uniqueHosts, callbacks[i].Host)
				}
				if !utils.SliceContains(uniqueDomains, callbacks[i].Domain) {
					uniqueDomains = append(uniqueDomains, callbacks[i].Domain)
				}
				totalCallbacks += 1
				if callbacks[i].IntegrityLevel > 2 {
					totalHighIntegrityCallbacks += 1
				}
			}
		}
		metrics := [][]interface{}{
			{"Compromised Users", strings.Join(uniqueUsers, "\n")},
			{"Compromised Hosts", strings.Join(uniqueHosts, "\n")},
			{"Domains Accessed", strings.Join(uniqueDomains, "\n")},
			{"Total Callbacks", strconv.Itoa(totalCallbacks)},
			{"Total High Integrity Callbacks", strconv.Itoa(totalHighIntegrityCallbacks)},
			{"Total Tasks Issued", "0"},
			{"Credentials Compromised", "0"},
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
func getCallbacksAndTasking(reportConfig GenerateReportMessage) []interface{} {
	callbacks := []databaseStructs.Callback{}
	header := XMLH2Header{
		Data: "3. Callbacks",
	}
	paragraph := XMLParagraph{
		Data: "The following sections list out all of the callbacks in order, their callback information, and their associated tasks.",
	}
	responsePieces := []interface{}{header, paragraph}
	// now to make a subsection for each callback
	excludedIDs := strings.Split(reportConfig.ExcludedIDs, ",")
	excludedUsers := strings.Split(reportConfig.ExcludedUsers, ",")
	excludedHosts := strings.Split(reportConfig.ExcludedHosts, ",")
	if err := database.DB.Select(&callbacks, `SELECT * FROM callback WHERE operation_id=$1
		ORDER BY id ASC`,
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
				if err := json.Unmarshal([]byte(callback.Ip), &ips); err != nil {
					logging.LogError(err, "failed to parse out IP addresses for callback", "callback id", callback.ID)
				}
				responsePieces = append(responsePieces,
					XMLH4Header{
						Data: fmt.Sprintf("3.%d Callback %d", includedIdCount, callback.DisplayID),
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
							},
						},
					})
				tasks := []databaseStructs.Task{}
				if err := database.DB.Select(&tasks, `SELECT
					status_timestamp_processing, "timestamp", command_name, display_params, id
					FROM task
					WHERE callback_id=$1`, callback.ID); err != nil {
					logging.LogError(err, "Failed to get tasks for callback", "callback id", callback.ID)
				} else {
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
					taskRows := make([]XMLTableRows, len(tasks))
					for i, _ := range tasks {
						startTime := "Not Sent To Agent"
						if tasks[i].StatusTimestampProcessing.Valid {
							startTime = tasks[i].StatusTimestampProcessing.Time.Format(TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS)
						}
						endTime := "Not Sent To Agent"
						if tasks[i].StatusTimestampProcessing.Valid {
							endTime = tasks[i].Timestamp.Format(TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS)
						}
						rowData := []interface{}{
							fmt.Sprintf("Start: %s\nEnd : %s",
								startTime, endTime),
							fmt.Sprintf("%s %s", tasks[i].CommandName, tasks[i].DisplayParams),
						}
						taskRows[i].Style = `word-break: break-all;`
						if i%2 != 0 {
							taskRows[i].Style += `;background-color:` + alternateRowColor
						}
						if reportConfig.IncludeMITREPerTask {
							attackTasks := []databaseStructs.Attacktask{}
							if err := database.DB.Select(&attackTasks, `SELECT 
    							a.t_num "attack.t_num"
    							FROM attacktask
    							JOIN attack a on attacktask.attack_id = a.id
								WHERE task_id=$1`, tasks[i].ID); err != nil {
								logging.LogError(err, "Failed to fetch ATT&CK data")
							} else {
								links := make([]Link, len(attackTasks))
								for j, _ := range attackTasks {
									links[j].Data = attackTasks[j].Attack.TNum
									links[j].Href = `https://attack.mitre.org/techniques/` + attackTasks[j].Attack.TNum
									links[j].Target = "_blank"
								}
								rowData = append(rowData, LinkCell{Data: links})
							}
						}
						taskRows[i].Data = rowData
					}
					taskingTable.Body.Row = taskRows
					responsePieces = append(responsePieces, XMLBr{}, taskingTable)
				}

				includedIdCount += 1
			}
		}
		return responsePieces
	}
}
