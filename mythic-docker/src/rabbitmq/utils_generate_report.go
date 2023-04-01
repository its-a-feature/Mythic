package rabbitmq

import (
	"encoding/base64"
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
type XMLTableRows struct {
	XMLName xml.Name `xml:"tr"`
	Style   string   `xml:"style,attr"`
	Data    []string `xml:"td"`
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
type XMLHeader struct {
	XMLName xml.Name `xml:"h2"`
	Data    string   `xml:",chardata"`
	Style   string   `xml:"style,attr"`
}
type XMLPng struct {
	XMLName  xml.Name `xml:"img"`
	Style    string   `xml:"style,attr"`
	Contents string   `xml:"src,attr"`
}

func GenerateReport(reportConfig GenerateReportMessage) {

	operatorRoles := getOperatorsAndRoles(reportConfig)
	operatorRows := make([]XMLTableRows, len(operatorRoles))
	for i := 0; i < len(operatorRoles); i++ {
		operatorRows[i].Data = operatorRoles[i]
		operatorRows[i].Style = `white-space:pre`
		if i%2 != 0 {
			operatorRows[i].Style += `;background-color:lightgray`
		}
	}
	operatorMetrics := getOperationMetrics(reportConfig)
	metricsRows := make([]XMLTableRows, len(operatorMetrics))
	for i := 0; i < len(operatorMetrics); i++ {
		metricsRows[i].Data = operatorMetrics[i]
		metricsRows[i].Style = `white-space:pre`
		if i%2 != 0 {
			metricsRows[i].Style += `;background-color:lightgray`
		}
	}
	mythicSvgContents, _ := os.ReadFile(filepath.Join(".", "static", "red_blue_login.png"))
	report := XMLDiv{
		Style: `width: 50%`,
		Body: []interface{}{
			XMLPng{
				Style:    `width: 200px; display: inline-block`,
				Contents: fmt.Sprintf("data:image/png;base64, %s", base64.StdEncoding.EncodeToString(mythicSvgContents)),
			},
			XMLHeader{
				Data:  reportConfig.OperatorOperation.CurrentOperation.Name + " Report",
				Style: `float: right;display: inline-block`,
			},
		},
	}
	operatorTable := []interface{}{
		XMLHeader{
			Data: "1. Assigned Operators",
		},
		XMLParagraph{
			Data: "The following table lists out all of the operators assigned to the operation and their roles in the assessment.",
		},
		XMLTable{
			Style: `width: 100%;`,
			Head: XMLTableHead{
				Row: XMLTableHeadRowCells{
					Style: `background-color: slategray;`,
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
	operationMetricsTable := []interface{}{
		XMLHeader{
			Data: "2. Operation Metrics",
		},
		XMLParagraph{
			Data: "The following table lists out some metrics for the operation.",
		},
		XMLTable{
			Style: `width: 100%`,
			Head: XMLTableHead{
				Row: XMLTableHeadRowCells{
					Style: `background-color: slategray;`,
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
	report.Body = append(report.Body, operationMetricsTable...)
	report.Body = append(report.Body, getCallbacksAndTasking(reportConfig)...)
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

func getOperatorsAndRoles(reportConfig GenerateReportMessage) [][]string {

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
	operatorRoleValues := [][]string{}
	for _, op := range otherOperators {
		operatorRoleValues = append(operatorRoleValues, []string{op.CurrentOperator.Username, op.ViewMode})
	}

	return operatorRoleValues
}
func getOperationMetrics(reportConfig GenerateReportMessage) [][]string {
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
		metrics := [][]string{
			{"Compromised Users", strings.Join(uniqueUsers, "\n")},
			{"Compromised Hosts", strings.Join(uniqueHosts, "\n")},
			{"Domains Accessed", strings.Join(uniqueDomains, "\n")},
			{"Total Callbacks", strconv.Itoa(totalCallbacks)},
			{"Total High Integrity Callbacks", strconv.Itoa(totalHighIntegrityCallbacks)},
		}
		return metrics
	}
	return [][]string{}
}
func getCallbacksAndTasking(reportConfig GenerateReportMessage) []interface{} {
	callbacks := []databaseStructs.Callback{}
	header := XMLHeader{
		Data: "3. Callbacks",
	}
	paragraph := XMLParagraph{
		Data: "The following sections list out all of the callbacks in order, their callback information, and their associated tasks.",
	}
	responsePieces := []interface{}{header, paragraph}
	// now to make a sub section for each callback
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
				responsePieces = append(responsePieces,
					XMLHeader{
						Data: fmt.Sprintf("3.%d Callback %d", includedIdCount, callback.DisplayID),
					},
					XMLTable{
						Style: `width: 100%;`,
						Head: XMLTableHead{
							Row: XMLTableHeadRowCells{
								Style: `background-color: slategray;`,
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
									Data: []string{"User", currentUser},
								},
								{
									Data: []string{"Host", callback.Host},
								},
								{
									Data: []string{"PID", strconv.Itoa(callback.PID)},
								},
								{
									Data: []string{"IPs", callback.Ip},
								},
								{
									Data: []string{"External IP", callback.ExternalIp},
								},
								{
									Data: []string{"Process Name", callback.ProcessName},
								},
								{
									Data: []string{"Description", callback.Description},
								},
								{
									Data: []string{"OS/Arch", callback.Os + "/" + callback.Architecture},
								},
								{
									Data: []string{"Domain", callback.Domain},
								},
								{
									Data: []string{"Integrity Level", integrityLevelString},
								},
							},
						},
					})
			}
		}
		return responsePieces
	}
}
