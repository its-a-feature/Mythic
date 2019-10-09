package portscan

import (
	"encoding/json"
	"log"
	"strconv"
	"strings"
	"time"

	"pkg/utils/structs"
)

var (
	scanResultChannel = make(chan host)
)

type PortScanParams struct {
	Hosts []string `json:"hosts"` // Can also be a cidr
	Ports string   `json:"ports"`
}

func doScan(hostList []string, portListStrs []string, job *structs.Job) []CIDR {
	// Variable declarations
	timeout := time.Duration(500) * time.Millisecond
	var portList []PortRange

	// populate the portList
	for i := 0; i < len(portListStrs); i++ {
		if strings.Contains(portListStrs[i], "-") && len(portListStrs) == 1 {
			// They want all the ports
			allPorts := PortRange{1, 65535}
			var newList []PortRange
			newList = append(newList, allPorts)
			portList = newList
			break
		}
		var tmpRange PortRange
		if strings.Contains(portListStrs[i], "-") {
			parts := strings.Split(portListStrs[i], "-")
			start, err := strconv.Atoi(parts[0])
			if err == nil {
				end, err := strconv.Atoi(parts[1])
				if err == nil {
					tmpRange = PortRange{
						Start: start,
						End:   end,
					}
					portList = append(portList, tmpRange)
				}
			}
		} else {
			intPort, err := strconv.Atoi(portListStrs[i])
			if err == nil {
				tmpRange = PortRange{
					Start: intPort,
					End:   intPort,
				}
				portList = append(portList, tmpRange)
			}
		}
	}

	// var cidrs []*CIDR

	var results []CIDR
	// Scan the hosts
	go job.MonitorStop()
	for i := 0; i < len(hostList); i++ {
		newCidr, err := NewCIDR(hostList[i])
		if err != nil {
			continue
		} else {
			// Iterate through every host in hostCidr
			newCidr.ScanHosts(portList, timeout, job)
			results = append(results, *newCidr)
			// cidrs = append(cidrs, newCidr)
		}
	}

	return results
}

func Run(task structs.Task, threadChannel chan<- structs.ThreadMsg) {
	tMsg := structs.ThreadMsg{}
	params := PortScanParams{}

	// do whatever here
	tMsg.TaskItem = task
	err := json.Unmarshal([]byte(task.Params), &params)
	if err != nil {
		log.Println("Error unmarshalling params:", err.Error())
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}
	if len(params.Hosts) == 0 {
		tMsg.TaskResult = []byte("Error: No hosts given to scan.")
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}
	if len(params.Ports) == 0 {
		tMsg.TaskResult = []byte("Error: No ports given to scan.")
		tMsg.Error = true
		threadChannel <- tMsg
		return
	}

	portStrings := strings.Split(params.Ports, ",")
	log.Println("Beginning portscan...")
	results := doScan(params.Hosts, portStrings, task.Job)
	if task.Job.Monitoring {
		go task.Job.SendKill()
	}
	// log.Println("Finished!")
	data, err := json.MarshalIndent(results, "", "    ")
	// // fmt.Println("Data:", string(data))
	if err != nil {
		log.Println("Error was not nil when marshalling!", err.Error())
		tMsg.TaskResult = []byte(err.Error())
		tMsg.Error = true
	} else {
		// fmt.Println("Sending on up the data:\n", string(data))
		tMsg.TaskResult = data
		tMsg.Error = false
		tMsg.Completed = true
	}
	threadChannel <- tMsg // Pass the thread msg back through the channel here
}
