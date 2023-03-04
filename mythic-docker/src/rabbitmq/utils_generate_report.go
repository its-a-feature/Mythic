package rabbitmq

import (
	"encoding/base64"
	"encoding/xml"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"github.com/johnfercher/maroto/pkg/color"
	"github.com/johnfercher/maroto/pkg/consts"
	"github.com/johnfercher/maroto/pkg/pdf"
	"github.com/johnfercher/maroto/pkg/props"
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

func GenerateReport(reportConfig GenerateReportMessage) {
	report := pdf.NewMaroto(consts.Portrait, consts.A4)
	report.SetPageMargins(5, 5, 10)
	report.SetBorder(true) // put this to `true` for debugging to see line / area sizes
	report.SetFirstPageNb(1)
	report.SetAliasNbPages("---mythic alias page count---")
	report.RegisterHeader(func() {
		report.Row(25, func() {
			report.Col(3, func() {
				if err := report.FileImage("./static/red_blue_login.png", props.Rect{
					Center:  true,
					Percent: 100,
				}); err != nil {
					logging.LogError(err, "Failed to add mythic image to pdf header")
				}
			})
			//report.ColSpace(5)
			report.Col(9, func() {
				report.Row(6, func() {
					report.Col(12, func() {
						report.Text(reportConfig.OperatorOperation.CurrentOperation.Name+" Report", props.Text{
							Size:  15,
							Align: consts.Right,
							Style: consts.Bold,
						})
					})

				})
				report.Row(10, func() {
					report.Col(12, func() {
						report.Text("Date: 2022/08/08", props.Text{
							Size:  10,
							Align: consts.Right,
							Style: consts.BoldItalic,
						})
					})
				})
			})
		})
	})
	report.RegisterFooter(func() {
		report.Row(5, func() {
			report.Col(12, func() {
				report.Text(fmt.Sprintf("Page %d of ---mythic alias page count---", report.GetCurrentPage()), props.Text{
					Style: consts.BoldItalic,
					Size:  8,
					Align: consts.Right,
				})
			})
		})
	})
	operatorRoles := getOperatorsAndRoles(report, reportConfig)
	operatorMetrics := getOperationMetrics(report, reportConfig)
	logging.LogInfo("about to close report file")
	if err := report.OutputFileAndClose("test_report.pdf"); err != nil {
		logging.LogError(err, "Failed to generate report")
	} else {
		logging.LogInfo("finished report file")
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
	operatorRows := make([]XMLTableRows, len(operatorRoles))
	for i := 0; i < len(operatorRoles); i++ {
		operatorRows[i].Data = operatorRoles[i]
		operatorRows[i].Style = `white-space:pre`
		if i%2 != 0 {
			operatorRows[i].Style += `;background-color:lightgray`
		}
	}
	metricsRows := make([]XMLTableRows, len(operatorMetrics))
	for i := 0; i < len(operatorMetrics); i++ {
		metricsRows[i].Data = operatorMetrics[i]
		metricsRows[i].Style = `white-space:pre`
		if i%2 != 0 {
			metricsRows[i].Style += `;background-color:lightgray`
		}
	}
	mythicSvgContents, _ := os.ReadFile(filepath.Join(".", "static", "red_blue_login.png"))
	operatorTable := XMLDiv{
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
		},
	}
	if xmlFile, err := os.Create("test_report.html"); err != nil {
		logging.LogError(err, "failed to create report file")
	} else {
		defer xmlFile.Close()
		xmlFile.WriteString(xml.Header)
		fileEncoder := xml.NewEncoder(xmlFile)
		fileEncoder.Indent("", "\t")
		if err := fileEncoder.Encode(&operatorTable); err != nil {
			logging.LogError(err, "failed to encode xml data to file")
		}
	}
}

func getOperatorsAndRoles(report pdf.Maroto, reportConfig GenerateReportMessage) [][]string {
	report.Row(8, func() {
		report.Col(12, func() {
			report.Text("1. Assigned Operators", props.Text{
				Top:   1.5,
				Size:  15,
				Style: consts.Bold,
				Align: consts.Left,
			})
		})
		report.ColSpace(9)
	})
	report.Row(8, func() {
		report.Col(12, func() {
			report.Text("The following table lists out all of the operators assigned to the operation and their roles in the assessment.", props.Text{
				Top:   1.5,
				Size:  8,
				Align: consts.Left,
			})
		})
	})
	otherOperators := []databaseStructs.Operatoroperation{}
	lightGrey := color.Color{Red: 229, Green: 228, Blue: 226}
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

	report.TableList([]string{"Operator", "Role"}, operatorRoleValues, props.TableList{
		HeaderProp: props.TableListContent{
			Size:      10,
			GridSizes: []uint{4, 8},
		},
		ContentProp: props.TableListContent{
			Size:      10,
			GridSizes: []uint{4, 8},
		},
		Align:                consts.Center,
		AlternatedBackground: &lightGrey,
		HeaderContentSpace:   1,
		Line:                 true,
	})
	return operatorRoleValues
}
func getOperationMetrics(report pdf.Maroto, reportConfig GenerateReportMessage) [][]string {
	report.Row(8, func() {
		report.Col(12, func() {
			report.Text("2. Operation Metrics", props.Text{
				Top:   1.5,
				Size:  15,
				Style: consts.Bold,
				Align: consts.Left,
			})
		})
		report.ColSpace(9)
	})
	report.Row(8, func() {
		report.Col(12, func() {
			report.Text("The following table lists out some metrics for the operation.", props.Text{
				Top:   1.5,
				Size:  8,
				Align: consts.Left,
			})
		})
	})
	// compromised users

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
			if utils.SliceContains(excludedIDs, strconv.Itoa(callbacks[i].ID)) ||
				utils.SliceContains(excludedIDs, strconv.Itoa(callbacks[i].DisplayID)) ||
				utils.SliceContains(excludedUsers, currentUser) ||
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
		lightGrey := color.Color{Red: 229, Green: 228, Blue: 226}
		report.TableList([]string{"Metric", "Value"}, metrics, props.TableList{
			HeaderProp: props.TableListContent{
				Size:      10,
				GridSizes: []uint{4, 8},
			},
			ContentProp: props.TableListContent{
				Size:      10,
				GridSizes: []uint{4, 8},
			},
			Align:                consts.Center,
			AlternatedBackground: &lightGrey,
			HeaderContentSpace:   1,
			Line:                 true,
		})
		return metrics
	}
	return [][]string{}
}
