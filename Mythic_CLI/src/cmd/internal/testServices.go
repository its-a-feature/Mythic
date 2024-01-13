package internal

import (
	"context"
	"crypto/tls"
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/manager"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/streadway/amqp"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"text/tabwriter"
	"time"
)

func TestMythicConnection() {
	webAddress := "127.0.0.1"
	mythicEnv := config.GetMythicEnv()
	if mythicEnv.GetString("NGINX_HOST") == "mythic_nginx" {
		if mythicEnv.GetBool("NGINX_USE_SSL") {
			webAddress = "https://127.0.0.1"
		} else {
			webAddress = "http://127.0.0.1"
		}
	} else {
		if mythicEnv.GetBool("NGINX_USE_SSL") {
			webAddress = "https://" + mythicEnv.GetString("NGINX_HOST")
		} else {
			webAddress = "http://" + mythicEnv.GetString("NGINX_HOST")
		}
	}
	maxCount := 10
	sleepTime := int64(10)
	count := make([]int, maxCount)
	http.DefaultTransport.(*http.Transport).TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
	log.Printf("[*] Waiting for Mythic Server and Nginx to come online (Retry Count = %d)\n", maxCount)
	for i := range count {
		log.Printf("[*] Attempting to connect to Mythic UI at %s:%d, attempt %d/%d\n", webAddress, mythicEnv.GetInt("NGINX_PORT"), i+1, maxCount)
		resp, err := http.Get(webAddress + ":" + strconv.Itoa(mythicEnv.GetInt("NGINX_PORT")))
		if err != nil {
			log.Printf("[-] Failed to make connection to host, retrying in %ds\n", sleepTime)
			log.Printf("%v\n", err)
		} else {
			resp.Body.Close()
			if resp.StatusCode == 200 || resp.StatusCode == 404 {
				log.Printf("[+] Successfully connected to Mythic at " + webAddress + ":" + strconv.Itoa(mythicEnv.GetInt("NGINX_PORT")) + "\n\n")
				return
			} else if resp.StatusCode == 502 || resp.StatusCode == 504 {
				log.Printf("[-] Nginx is up, but waiting for Mythic Server, retrying connection in %ds\n", sleepTime)
			} else {
				log.Printf("[-] Connection failed with HTTP Status Code %d, retrying in %ds\n", resp.StatusCode, sleepTime)
			}
		}
		time.Sleep(time.Duration(sleepTime) * time.Second)
	}
	log.Printf("[-] Failed to make connection to Mythic Server\n")
	log.Printf("    This could be due to limited resources on the host (recommended at least 2CPU and 4GB RAM)\n")
	log.Printf("    If there is an issue with Mythic server, use 'mythic-cli logs mythic_server' to view potential errors\n")
	Status(false)
	log.Printf("[*] Fetching logs from mythic_server now:\n")
	GetLogs("mythic_server", "500")
	os.Exit(1)
}
func TestMythicRabbitmqConnection() {
	rabbitmqAddress := "127.0.0.1"
	mythicEnv := config.GetMythicEnv()
	rabbitmqPort := mythicEnv.GetString("RABBITMQ_PORT")
	if mythicEnv.GetString("RABBITMQ_HOST") != "mythic_rabbitmq" && mythicEnv.GetString("RABBITMQ_HOST") != "127.0.0.1" {
		rabbitmqAddress = mythicEnv.GetString("RABBITMQ_HOST")
	}
	if rabbitmqAddress == "127.0.0.1" && !manager.GetManager().IsServiceRunning("mythic_rabbitmq") {
		log.Printf("[-] Service mythic_rabbitmq should be running on the host, but isn't. Containers will be unable to connect.\nStart it by starting Mythic ('sudo ./mythic-cli mythic start') or manually with 'sudo ./mythic-cli mythic start mythic_rabbitmq'\n")
		return
	}
	maxCount := 10
	var err error
	count := make([]int, maxCount)
	sleepTime := int64(10)
	log.Printf("[*] Waiting for RabbitMQ to come online (Retry Count = %d)\n", maxCount)
	for i := range count {
		log.Printf("[*] Attempting to connect to RabbitMQ at %s:%s, attempt %d/%d\n", rabbitmqAddress, rabbitmqPort, i+1, maxCount)
		conn, err := amqp.Dial(fmt.Sprintf("amqp://%s:%s@%s:%s/mythic_vhost", mythicEnv.GetString("RABBITMQ_USER"), mythicEnv.GetString("RABBITMQ_PASSWORD"), rabbitmqAddress, rabbitmqPort))
		if err != nil {
			log.Printf("[-] Failed to connect to RabbitMQ, retrying in %ds\n", sleepTime)
			time.Sleep(10 * time.Second)
		} else {
			conn.Close()
			log.Printf("[+] Successfully connected to RabbitMQ at amqp://%s:***@%s:%s/mythic_vhost\n\n", mythicEnv.GetString("RABBITMQ_USER"), rabbitmqAddress, rabbitmqPort)
			return
		}
	}
	log.Printf("[-] Failed to make a connection to the RabbitMQ server: %v\n", err)
	if manager.GetManager().IsServiceRunning("mythic_rabbitmq") {
		log.Printf("    The mythic_rabbitmq service is running, but mythic-cli is unable to connect\n")
	} else {
		if rabbitmqAddress == "127.0.0.1" {
			log.Printf("    The mythic_rabbitmq service isn't running, but should be running locally. Did you start it?\n")
		} else {
			log.Printf("    The mythic_rabbitmq service isn't running locally, check to make sure it's running with the proper credentials\n")
		}

	}
}
func TestPorts() error {
	manager.GetManager().TestPorts()
	return nil
}
func PrintMythicConnectionInfo() {
	w := new(tabwriter.Writer)
	mythicEnv := config.GetMythicEnv()
	w.Init(os.Stdout, 0, 8, 2, '\t', 0)
	fmt.Fprintln(w, "MYTHIC SERVICE\tWEB ADDRESS\tBOUND LOCALLY")
	if mythicEnv.GetString("NGINX_HOST") == "mythic_nginx" {
		if mythicEnv.GetBool("NGINX_USE_SSL") {
			fmt.Fprintln(w, "Nginx (Mythic Web UI)\thttps://127.0.0.1:"+strconv.Itoa(mythicEnv.GetInt("NGINX_PORT"))+"\t", mythicEnv.GetBool("nginx_bind_localhost_only"))
		} else {
			fmt.Fprintln(w, "Nginx (Mythic Web UI)\thttp://127.0.0.1:"+strconv.Itoa(mythicEnv.GetInt("NGINX_PORT"))+"\t", mythicEnv.GetBool("nginx_bind_localhost_only"))
		}
	} else {
		if mythicEnv.GetBool("NGINX_USE_SSL") {
			fmt.Fprintln(w, "Nginx (Mythic Web UI)\thttps://"+mythicEnv.GetString("NGINX_HOST")+":"+strconv.Itoa(mythicEnv.GetInt("NGINX_PORT"))+"\t", mythicEnv.GetBool("nginx_bind_localhost_only"))
		} else {
			fmt.Fprintln(w, "Nginx (Mythic Web UI)\thttp://"+mythicEnv.GetString("NGINX_HOST")+":"+strconv.Itoa(mythicEnv.GetInt("NGINX_PORT"))+"\t", mythicEnv.GetBool("nginx_bind_localhost_only"))
		}
	}
	if mythicEnv.GetString("MYTHIC_SERVER_HOST") == "mythic_server" {
		fmt.Fprintln(w, "Mythic Backend Server\thttp://127.0.0.1:"+strconv.Itoa(mythicEnv.GetInt("MYTHIC_SERVER_PORT"))+"\t", mythicEnv.GetBool("mythic_server_bind_localhost_only"))
	} else {
		fmt.Fprintln(w, "Mythic Backend Server\thttp://"+mythicEnv.GetString("MYTHIC_SERVER_HOST")+":"+strconv.Itoa(mythicEnv.GetInt("MYTHIC_SERVER_PORT"))+"\t", mythicEnv.GetBool("mythic_server_bind_localhost_only"))
	}
	if mythicEnv.GetString("HASURA_HOST") == "mythic_graphql" {
		fmt.Fprintln(w, "Hasura GraphQL Console\thttp://127.0.0.1:"+strconv.Itoa(mythicEnv.GetInt("HASURA_PORT"))+"\t", mythicEnv.GetBool("hasura_bind_localhost_only"))
	} else {
		fmt.Fprintln(w, "Hasura GraphQL Console\thttp://"+mythicEnv.GetString("HASURA_HOST")+":"+strconv.Itoa(mythicEnv.GetInt("HASURA_PORT"))+"\t", mythicEnv.GetBool("hasura_bind_localhost_only"))
	}
	if mythicEnv.GetString("JUPYTER_HOST") == "mythic_jupyter" {
		fmt.Fprintln(w, "Jupyter Console\thttp://127.0.0.1:"+strconv.Itoa(mythicEnv.GetInt("JUPYTER_PORT"))+"\t", mythicEnv.GetBool("jupyter_bind_localhost_only"))
	} else {
		fmt.Fprintln(w, "Jupyter Console\thttp://"+mythicEnv.GetString("JUPYTER_HOST")+":"+strconv.Itoa(mythicEnv.GetInt("JUPYTER_PORT"))+"\t", mythicEnv.GetBool("jupyter_bind_localhost_only"))
	}
	if mythicEnv.GetString("DOCUMENTATION_HOST") == "mythic_documentation" {
		fmt.Fprintln(w, "Internal Documentation\thttp://127.0.0.1:"+strconv.Itoa(mythicEnv.GetInt("DOCUMENTATION_PORT"))+"\t", mythicEnv.GetBool("documentation_bind_localhost_only"))
	} else {
		fmt.Fprintln(w, "Internal Documentation\thttp://"+mythicEnv.GetString("DOCUMENTATION_HOST")+":"+strconv.Itoa(mythicEnv.GetInt("DOCUMENTATION_PORT"))+"\t", mythicEnv.GetBool("documentation_bind_localhost_only"))
	}
	fmt.Fprintln(w, "\t\t\t\t")
	fmt.Fprintln(w, "ADDITIONAL SERVICES\tIP\tPORT\tBOUND LOCALLY")
	if mythicEnv.GetString("POSTGRES_HOST") == "mythic_postgres" {
		fmt.Fprintln(w, "Postgres Database\t127.0.0.1\t"+strconv.Itoa(mythicEnv.GetInt("POSTGRES_PORT"))+"\t", mythicEnv.GetBool("postgres_bind_localhost_only"))
	} else {
		fmt.Fprintln(w, "Postgres Database\t"+mythicEnv.GetString("POSTGRES_HOST")+"\t"+strconv.Itoa(mythicEnv.GetInt("POSTGRES_PORT"))+"\t", mythicEnv.GetBool("postgres_bind_localhost_only"))
	}
	if mythicEnv.GetString("MYTHIC_REACT_HOST") == "mythic_react" {
		fmt.Fprintln(w, "React Server\t127.0.0.1\t"+strconv.Itoa(mythicEnv.GetInt("MYTHIC_REACT_PORT"))+"\t", mythicEnv.GetBool("mythic_react_bind_localhost_only"))
	} else {
		fmt.Fprintln(w, "React Server\t"+mythicEnv.GetString("MYTHIC_REACT_HOST")+"\t"+strconv.Itoa(mythicEnv.GetInt("MYTHIC_REACT_PORT"))+"\t", mythicEnv.GetBool("mythic_react_bind_localhost_only"))
	}
	if mythicEnv.GetString("RABBITMQ_HOST") == "mythic_rabbitmq" {
		fmt.Fprintln(w, "RabbitMQ\t127.0.0.1\t"+strconv.Itoa(mythicEnv.GetInt("RABBITMQ_PORT"))+"\t", mythicEnv.GetBool("rabbitmq_bind_localhost_only"))
	} else {
		fmt.Fprintln(w, "RabbitMQ\t"+mythicEnv.GetString("RABBITMQ_HOST")+"\t"+strconv.Itoa(mythicEnv.GetInt("RABBITMQ_PORT"))+"\t", mythicEnv.GetBool("rabbitmq_bind_localhost_only"))
	}
	fmt.Fprintln(w, "\t\t\t\t")
	w.Flush()
}

func Status(verbose bool) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("[-] Failed to get client in Status check: %v", err)
	}
	containers, err := cli.ContainerList(context.Background(), types.ContainerListOptions{
		All: true,
	})
	if err != nil {
		log.Fatalf("[-] Failed to get container list: %v\n", err)
	}
	PrintMythicConnectionInfo()
	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 0, 8, 2, '\t', 0)
	var mythicLocalServices []string
	var installedServices []string
	sort.Slice(containers[:], func(i, j int) bool {
		return containers[i].Labels["name"] < containers[j].Labels["name"]
	})
	elementsOnDisk, err := getElementsOnDisk()
	if err != nil {
		log.Fatalf("[-] Failed to get list of installed services on disk: %v\n", err)
	}
	elementsInCompose, err := GetAllExistingNonMythicServiceNames()
	if err != nil {
		log.Fatalf("[-] Failed to get list of installed services in docker-compose: %v\n", err)
	}
	for _, container := range containers {
		if container.Labels["name"] == "" {
			continue
		}
		var portRanges []uint16
		var portRangeMaps []string
		portString := ""
		info := fmt.Sprintf("%s\t%s\t%s\t", container.Labels["name"], container.State, container.Status)
		if len(container.Ports) > 0 {
			sort.Slice(container.Ports[:], func(i, j int) bool {
				return container.Ports[i].PublicPort < container.Ports[j].PublicPort
			})
			for _, port := range container.Ports {
				if port.PublicPort > 0 {
					if port.PrivatePort == port.PublicPort && port.IP == "0.0.0.0" {
						portRanges = append(portRanges, port.PrivatePort)
					} else {
						portRangeMaps = append(portRangeMaps, fmt.Sprintf("%d/%s -> %s:%d", port.PrivatePort, port.Type, port.IP, port.PublicPort))
					}

				}
			}
			if len(portRanges) > 0 {
				sort.Slice(portRanges, func(i, j int) bool { return portRanges[i] < portRanges[j] })
			}
			portString = strings.Join(portRangeMaps[:], ", ")
			var stringPortRanges []string
			for _, val := range portRanges {
				stringPortRanges = append(stringPortRanges, fmt.Sprintf("%d", val))
			}
			if len(stringPortRanges) > 0 && len(portString) > 0 {
				portString = portString + ", "
			}
			portString = portString + strings.Join(stringPortRanges[:], ", ")
		}
		if stringInSlice(container.Image, MythicPossibleServices) {
			found := false
			for _, mnt := range container.Mounts {
				if strings.HasPrefix(mnt.Name, container.Image+"_volume") {
					if found {
						info += ", " + mnt.Name
					} else {
						info += mnt.Name
					}

					found = true
				}
			}
			if !found {
				info += "local"
			}
			info += "\t"
			info = info + portString
			mythicLocalServices = append(mythicLocalServices, info)
		} else {
			installedServicesAbsPath, err := filepath.Abs(filepath.Join(getCwdFromExe(), InstalledServicesFolder))
			if err != nil {
				fmt.Printf("[-] failed to get the absolute path to the InstalledServices folder")
				continue
			}

			for _, mnt := range container.Mounts {
				if strings.Contains(mnt.Source, installedServicesAbsPath) {
					installedServices = append(installedServices, info)
					elementsOnDisk = RemoveStringFromSliceNoOrder(elementsOnDisk, container.Labels["name"])
					elementsInCompose = RemoveStringFromSliceNoOrder(elementsInCompose, container.Labels["name"])
				}
			}
		}

	}
	fmt.Fprintln(w, "Mythic Main Services")
	fmt.Fprintln(w, "CONTAINER NAME\tSTATE\tSTATUS\tMOUNT\tPORTS")
	for _, line := range mythicLocalServices {
		fmt.Fprintln(w, line)
	}
	fmt.Fprintln(w, "\t\t\t\t\t")
	w.Flush()
	fmt.Fprintln(w, "Installed Services")
	fmt.Fprintln(w, "CONTAINER NAME\tSTATE\tSTATUS")
	for _, line := range installedServices {
		fmt.Fprintln(w, line)
	}
	fmt.Fprintln(w, "\t\t\t")
	// remove all elementsInCompose from elementsOnDisk
	for _, container := range elementsInCompose {
		elementsOnDisk = RemoveStringFromSliceNoOrder(elementsOnDisk, container)
	}
	if len(elementsInCompose) > 0 && verbose {
		fmt.Fprintln(w, "Docker Compose services not running, start with: ./mythic-cli start [name]")
		fmt.Fprintln(w, "NAME\t")
		sort.Strings(elementsInCompose)
		for _, container := range elementsInCompose {
			fmt.Fprintln(w, fmt.Sprintf("%s\t", container))
		}
		fmt.Fprintln(w, "\t")
	}
	if len(elementsOnDisk) > 0 && verbose {
		fmt.Fprintln(w, "Extra Services, add to docker compose with: ./mythic-cli add [name]")
		fmt.Fprintln(w, "NAME\t")
		sort.Strings(elementsOnDisk)
		for _, container := range elementsOnDisk {
			fmt.Fprintln(w, fmt.Sprintf("%s\t", container))
		}
		fmt.Fprintln(w, "\t\t")
	}
	w.Flush()
	if len(installedServices) == 0 {
		fmt.Printf("[*] There are no services installed\n")
		fmt.Printf("    To install one, use \"sudo ./mythic-cli install github <url>\"\n")
		fmt.Printf("    Agents can be found at: https://github.com/MythicAgents\n")
		fmt.Printf("    C2 Profiles can be found at: https://github.com/MythicC2Profiles\n")
	}
	if mythicEnv.GetString("RABBITMQ_HOST") == "mythic_rabbitmq" && mythicEnv.GetBool("rabbitmq_bind_localhost_only") {
		fmt.Printf("\n[*] RabbitMQ is currently listening on localhost. If you have a remote Service, they will be unable to connect (i.e. one running on another server)")
		fmt.Printf("\n    Use 'sudo ./mythic-cli config set rabbitmq_bind_localhost_only false' and restart mythic ('sudo ./mythic-cli restart') to change this\n")
	}
	if mythicEnv.GetString("MYTHIC_SERVER_HOST") == "mythic_server" && mythicEnv.GetBool("mythic_server_bind_localhost_only") {
		fmt.Printf("\n[*] MythicServer is currently listening on localhost. If you have a remote Service, they will be unable to connect (i.e. one running on another server)")
		fmt.Printf("\n    Use 'sudo ./mythic-cli config set mythic_server_bind_localhost_only false' and restart mythic ('sudo ./mythic-cli restart') to change this\n")
	}
	fmt.Printf("[*] If you are using a remote PayloadType or C2Profile, they will need certain environment variables to properly connect to Mythic.\n")
	fmt.Printf("    Use 'sudo ./mythic-cli config service' for configs for these services.\n")
}
func GetLogs(containerName string, numLogs string) {
	logCount, err := strconv.Atoi(numLogs)
	if err != nil {
		log.Fatalf("[-] Bad log count: %v\n", err)
	}
	manager.GetManager().GetLogs(containerName, logCount)
}
func ListServices() {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("[-] Failed to get client in List Services: %v", err)
	}
	containers, err := cli.ContainerList(context.Background(), types.ContainerListOptions{
		All: true,
	})
	if err != nil {
		log.Fatalf("[-] Failed to get container list: %v\n", err)
	}
	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 0, 8, 2, '\t', 0)
	var installedServices []string
	sort.Slice(containers[:], func(i, j int) bool {
		return containers[i].Labels["name"] < containers[j].Labels["name"]
	})
	elementsOnDisk, err := manager.GetManager().GetInstalled3rdPartyServicesOnDisk()
	if err != nil {
		log.Fatalf("[-] Failed to get list of installed services on disk: %v\n", err)
	}
	elementsInCompose, err := GetAllExistingNonMythicServiceNames()
	if err != nil {
		log.Fatalf("[-] Failed to get list of installed services in docker-compose: %v\n", err)
	}
	for _, container := range containers {
		if container.Labels["name"] == "" {
			continue
		}
		installedServicesAbsPath, err := filepath.Abs(filepath.Join(getCwdFromExe(), InstalledServicesFolder))
		if err != nil {
			fmt.Printf("[-] failed to get the absolute path to the InstalledServices folder")
			continue
		}
		for _, mnt := range container.Mounts {
			if strings.Contains(mnt.Source, installedServicesAbsPath) {
				info := fmt.Sprintf("%s\t%s\t%v\t%v", container.Labels["name"], container.Status, true, stringInSlice(container.Labels["name"], elementsInCompose))
				installedServices = append(installedServices, info)
				elementsOnDisk = RemoveStringFromSliceNoOrder(elementsOnDisk, container.Labels["name"])
				elementsInCompose = RemoveStringFromSliceNoOrder(elementsInCompose, container.Labels["name"])
			}
		}
	}
	for _, container := range elementsInCompose {
		elementsOnDisk = RemoveStringFromSliceNoOrder(elementsOnDisk, container)
	}
	fmt.Fprintln(w, "Name\tContainerStatus\tImageBuilt\tDockerComposeEntry")
	for _, line := range installedServices {
		fmt.Fprintln(w, line)
	}
	if len(elementsInCompose) > 0 {
		sort.Strings(elementsInCompose)
		for _, container := range elementsInCompose {
			fmt.Fprintln(w, fmt.Sprintf("%s\t%s\t%v\t%v", container, "N/A", imageExists(container), true))
		}
	}
	if len(elementsOnDisk) > 0 {
		sort.Strings(elementsOnDisk)
		for _, container := range elementsOnDisk {
			fmt.Fprintln(w, fmt.Sprintf("%s\t%s\t%v\t%v", container, "N/A", imageExists(container), false))
		}
	}
	w.Flush()
}
