package manager

import (
	"bufio"
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/utils"
	"github.com/creack/pty"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
	"github.com/spf13/viper"
	"golang.org/x/exp/slices"
	"golang.org/x/mod/semver"
	"gopkg.in/yaml.v3"
	"io"
	"log"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"text/tabwriter"
	"time"
)

type DockerComposeManager struct {
	InstalledServicesPath   string
	InstalledServicesFolder string
}

// Interface Necessary commands

func (d *DockerComposeManager) GetManagerName() string {
	return "docker"
}

// GenerateRequiredConfig ensure that the docker-compose.yml file exists
func (d *DockerComposeManager) GenerateRequiredConfig() {
	groupNameConfig := viper.New()
	groupNameConfig.SetConfigName("docker-compose")
	groupNameConfig.SetConfigType("yaml")
	groupNameConfig.AddConfigPath(utils.GetCwdFromExe())
	if err := groupNameConfig.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Printf("[-] Error while reading in docker-compose file: %s\n", err)
			if _, err := os.Create("docker-compose.yml"); err != nil {
				log.Fatalf("[-] Failed to create docker-compose.yml file: %v\n", err)
			} else {
				if err := groupNameConfig.ReadInConfig(); err != nil {
					log.Printf("[-] Failed to read in new docker-compose.yml file: %v\n", err)
				} else {
					log.Printf("[+] Successfully created new docker-compose.yml file.\n")
				}
				return
			}
		} else {
			log.Fatalf("[-] Error while parsing docker-compose file: %s", err)
		}
	}
}

// IsServiceRunning use Docker API to check running container list for the specified name
func (d *DockerComposeManager) IsServiceRunning(service string) bool {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("[-] Failed to get client connection to Docker: %v", err)
	}
	containers, err := cli.ContainerList(context.Background(), container.ListOptions{
		All: true,
	})
	if err != nil {
		log.Fatalf("[-] Failed to get container list from Docker: %v", err)
	}
	if len(containers) > 0 {
		for _, c := range containers {
			if c.Labels["name"] == strings.ToLower(service) && c.State == "running" {
				return true
			}
		}
	}
	return false
}

// DoesImageExist use Docker API to check existing images for the specified name
func (d *DockerComposeManager) DoesImageExist(service string) bool {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("Failed to get docker client: %v", err)
	}
	desiredImage := fmt.Sprintf("%v:latest", strings.ToLower(service))
	images, err := cli.ImageList(context.Background(), image.ListOptions{All: true})
	if err != nil {
		log.Fatalf("Failed to get container list: %v", err)
	}
	for _, dockerImage := range images {
		for _, name := range dockerImage.RepoTags {
			if name == desiredImage {
				return true
			}
		}
	}
	return false
}

// RemoveImages deletes unused images that aren't tied to any running Docker containers
func (d *DockerComposeManager) RemoveImages() error {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}
	defer cli.Close()
	/*
		images, err := cli.ImageList(ctx, image.ListOptions{All: true})
		if err != nil {
			log.Fatalf("[-] Failed to get list of images: %v\n", err)
		}

		for _, dockerImage := range images {
			if utils.StringInSlice("<none>:<none>", dockerImage.RepoTags) {
				_, err = cli.ImageRemove(ctx, dockerImage.ID, image.RemoveOptions{
					Force:         true,
					PruneChildren: true,
				})
				if err != nil {
					log.Printf("[-] Failed to remove unused image: %v\n", err)
				}
			}
		}

	*/
	pruneReport, err := cli.ImagesPrune(ctx, filters.Args{})
	if err != nil {
		log.Printf("[-] Failed to prune images: %v\n", err)
	} else {
		log.Printf("[*] Reclaimed %s space from unused images\n", utils.ByteCountSI(int64(pruneReport.SpaceReclaimed)))
	}
	return nil
}

func (d *DockerComposeManager) RemoveContainers(services []string, keepVolume bool) error {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("Failed to get docker client: %v", err)
	}
	allContainers, err := cli.ContainerList(context.Background(), container.ListOptions{All: true})
	if err != nil {
		log.Fatalf("Failed to get container list: %v", err)
	}
	for _, service := range services {
		for _, dockerContainer := range allContainers {
			if dockerContainer.Labels["name"] == strings.ToLower(service) {
				log.Printf("[*] Removing container: %s...\n", service)
				err = cli.ContainerRemove(context.Background(),
					dockerContainer.ID,
					container.RemoveOptions{Force: true, RemoveVolumes: !keepVolume})
				if err != nil {
					log.Printf("[-] Failed to remove container: %v\n", err)
					return err
				} else {
					log.Printf("[+] Removed container: %s\n", service)
				}
			}
		}
	}
	return nil
}

func (d *DockerComposeManager) SaveImages(services []string, outputPath string) error {
	savedImagePath := filepath.Join(utils.GetCwdFromExe(), outputPath)
	if !utils.DirExists(savedImagePath) {
		err := os.MkdirAll(savedImagePath, 0755)
		if err != nil {
			log.Fatalf("[-] Failed to create output folder: %v\n", err)
		}
	}
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return errors.New(fmt.Sprintf("[-] Failed to connect to Docker: %v\n", err))
	}
	savedContainers := services
	if len(savedContainers) == 0 {
		diskAgents, err := d.GetInstalled3rdPartyServicesOnDisk()
		if err != nil {
			return errors.New(fmt.Sprintf("[-] Failed to get agents on disk: %v\n", err))
		}
		currentMythicServices, err := d.GetCurrentMythicServiceNames()
		if err != nil {
			return errors.New(fmt.Sprintf("[-] Failed to get mythic service list: %v\n", err))
		}
		savedContainers = append([]string{}, diskAgents...)
		savedContainers = append(savedContainers, currentMythicServices...)

	}
	savedImagePath = filepath.Join(utils.GetCwdFromExe(), "saved_images", "mythic_save.tar")
	finalSavedContainers := []string{}
	for i, _ := range savedContainers {
		if d.DoesImageExist(savedContainers[i]) {
			containerName := fmt.Sprintf("%s:latest", savedContainers[i])
			finalSavedContainers = append(finalSavedContainers, containerName)
		} else {
			log.Printf("[-] No image locally for %s\n", savedContainers[i])
		}
	}
	log.Printf("[*] Saving the following images:\n%v\n", finalSavedContainers)
	log.Printf("[*] This will take a while for Docker to compress and generate the layers...\n")
	ioReadCloser, err := cli.ImageSave(context.Background(), finalSavedContainers)
	if err != nil {
		return errors.New(fmt.Sprintf("[-] Failed to get contents of docker image: %v\n", err))
	}
	outFile, err := os.Create(savedImagePath)
	if err != nil {
		return errors.New(fmt.Sprintf("[-] Failed to create output file: %v\n", err))
	}
	defer outFile.Close()
	log.Printf("[*] Saving to %s\nThis will take a while...\n", savedImagePath)
	_, err = io.Copy(outFile, ioReadCloser)
	if err != nil {
		return errors.New(fmt.Sprintf("[-] Failed to write contents to file: %v\n", err))
	}
	return nil
}

func (d *DockerComposeManager) LoadImages(outputPath string) error {
	savedImagePath := filepath.Join(utils.GetCwdFromExe(), outputPath, "mythic_save.tar")
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return errors.New(fmt.Sprintf("[-] Failed to connect to Docker: %v\n", err))
	}
	ioReadCloser, err := os.OpenFile(savedImagePath, os.O_RDONLY, 0x600)
	if err != nil {
		return errors.New(fmt.Sprintf("[-] Failed to read tar file: %v\n", err))
	}
	_, err = cli.ImageLoad(context.Background(), ioReadCloser, false)
	if err != nil {
		return errors.New(fmt.Sprintf("[-] Failed to load image into Docker: %v\n", err))
	}
	log.Printf("[+] loaded docker images!\n")
	return nil

}

// CheckRequiredManagerVersion checks docker and docker-compose versions to make sure they're high enough
func (d *DockerComposeManager) CheckRequiredManagerVersion() bool {
	outputString, err := d.runDocker([]string{"version", "--format", "{{.Server.Version}}"})
	if err != nil {
		log.Printf("[-] Failed to get docker version\n")
		return false
	}
	if !semver.IsValid("v" + outputString) {
		log.Printf("[-] Invalid version string: %s\n", outputString)
		return false
	}
	if semver.Compare("v"+outputString, "v20.10.22") >= 0 {
		composeCheckString, err := d.runDocker([]string{"compose", "version"})
		if err != nil {
			log.Printf("[-] Failed to get docker compose: %v\n", err)
			return false
		}
		if strings.Contains(composeCheckString, "Docker Compose version ") {
			return true
		}
		log.Printf("[-] Unable to find compose plugin. Please install the docker compose plugin.\n")
		return false
	}
	log.Printf("[-] Docker version is too old, %s, for Mythic. Please update\n", outputString)
	return false

}

// GetVolumes returns a dictionary of defined volume information from the docker-compose file.
//
//	This is not looking up existing volume information at runtime.
func (d *DockerComposeManager) GetVolumes() (map[string]interface{}, error) {
	curConfig := d.readInDockerCompose()
	volumes := map[string]interface{}{}
	if curConfig.InConfig("volumes") {
		volumes = curConfig.GetStringMap("volumes")
	}
	return volumes, nil
}

// SetVolumes sets a specific volume configuration into the docker-compose file.
func (d *DockerComposeManager) SetVolumes(volumes map[string]interface{}) {
	curConfig := d.readInDockerCompose()
	allConfigSettings := curConfig.AllSettings()
	allConfigSettings["volumes"] = volumes
	err := d.setDockerComposeDefaultsAndWrite(allConfigSettings)
	if err != nil {
		log.Printf("[-] Failed to update config: %v\n", err)
	}
}

// GetServiceConfiguration checks docker-compose to see if that service is defined or not and returns its config or a generic one
func (d *DockerComposeManager) GetServiceConfiguration(service string) (map[string]interface{}, error) {
	curConfig := d.readInDockerCompose()
	pStruct := map[string]interface{}{}
	if curConfig.InConfig("services." + strings.ToLower(service)) {
		pStruct = curConfig.GetStringMap("services." + strings.ToLower(service))
		delete(pStruct, "network_mode")
		delete(pStruct, "build")
		delete(pStruct, "networks")
		delete(pStruct, "command")
		delete(pStruct, "image")
		delete(pStruct, "healthcheck")
	}
	return pStruct, nil
}

// SetServiceConfiguration sets a service configuration into docker-compose
func (d *DockerComposeManager) SetServiceConfiguration(service string, pStruct map[string]interface{}) error {
	curConfig := d.readInDockerCompose()
	allConfigValues := curConfig.AllSettings()
	if _, ok := allConfigValues["services"]; !ok {
		allConfigValues["services"] = map[string]interface{}{}
	}
	for key, _ := range allConfigValues {
		if key == "services" {
			allServices := allConfigValues["services"].(map[string]interface{})
			if _, ok := allServices[service]; !ok {
				log.Printf("[+] Added %s to docker-compose\n", strings.ToLower(service))
			}
			allServices[service] = pStruct
			allConfigValues["services"] = allServices
		}
	}
	err := d.setDockerComposeDefaultsAndWrite(allConfigValues)
	if err != nil {
		log.Printf("[-] Failed to update config: %v\n", err)
	}
	return err
}

// GetPathTo3rdPartyServicesOnDisk returns to path on disk to where 3rd party services are installed
func (d *DockerComposeManager) GetPathTo3rdPartyServicesOnDisk() string {
	return d.InstalledServicesFolder
}

// StopServices stops certain containers that are running and optionally deletes the backing images
func (d *DockerComposeManager) StopServices(services []string, deleteImages bool, keepVolume bool) error {
	dockerComposeContainers, err := d.GetAllInstalled3rdPartyServiceNames()
	if err != nil {
		return err
	}
	currentMythicServices, err := d.GetCurrentMythicServiceNames()
	if err != nil {
		return err
	}
	// in case somebody says "stop" but doesn't list containers, they mean everything
	if len(services) == 0 {
		services = append(dockerComposeContainers, currentMythicServices...)
	}
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("Failed to get docker client: %v", err)
	}
	allContainers, err := cli.ContainerList(context.Background(), container.ListOptions{All: true})
	if err != nil {
		log.Fatalf("Failed to get container list: %v", err)
	}
	errChan := make(chan error)
	for _, svc := range services {
		go func(service string) {
			found := false
			for _, dockerContainer := range allContainers {
				if strings.ToLower(dockerContainer.Labels["name"]) == strings.ToLower(service) {
					found = true
					if deleteImages {
						log.Printf("[*] Removing container: %s...\n", service)
						err = cli.ContainerRemove(context.Background(),
							dockerContainer.ID,
							container.RemoveOptions{Force: true, RemoveVolumes: !keepVolume})
						if err != nil {
							log.Printf("[-] Failed to remove container: %v\n", err)
						} else {
							log.Printf("[+] Removed container: %s\n", service)
						}
						errChan <- err
					} else {
						log.Printf("[*] Stopping container: %s...\n", service)
						err = cli.ContainerStop(context.Background(), dockerContainer.ID, container.StopOptions{})
						if err != nil {
							log.Printf("[-] Failed to stop container: %v\n", err)
						} else {
							log.Printf("[+] Stopped container: %s\n", service)
						}
						errChan <- err
					}
					break
				}
			}
			if !found {
				log.Printf("[*] Container not running: %s\n", service)
				errChan <- nil
			}
		}(svc)
	}
	err = nil
	for _, _ = range services {
		err2 := <-errChan
		if err2 != nil {
			err = err2
		}
	}
	return err
}

// RemoveServices removes certain container entries from the docker-compose
func (d *DockerComposeManager) RemoveServices(services []string, keepVolume bool) error {
	curConfig := d.readInDockerCompose()
	allConfigValues := curConfig.AllSettings()
	for key, _ := range allConfigValues {
		if key == "services" {
			allServices := allConfigValues["services"].(map[string]interface{})
			for _, service := range services {
				if d.IsServiceRunning(service) {
					_ = d.StopServices([]string{strings.ToLower(service)}, true, keepVolume)

				}
				delete(allServices, strings.ToLower(service))
				log.Printf("[+] Removed %s from docker-compose\n", strings.ToLower(service))
			}
		}
	}

	err := d.setDockerComposeDefaultsAndWrite(allConfigValues)
	if err != nil {
		log.Printf("[-] Failed to update config: %v\n", err)
		return err
	} else {
		log.Println("[+] Successfully updated docker-compose.yml")
	}
	return nil
}

// StartServices kicks off docker/docker-compose for the specified services
func (d *DockerComposeManager) StartServices(services []string, rebuildOnStart bool) error {

	if rebuildOnStart {
		err := d.runDockerCompose(append([]string{"up", "--build", "-d"}, services...))
		if err != nil {
			return err
		}
	} else {
		var needToBuild []string
		var alreadyBuilt []string
		for _, val := range services {
			if !d.DoesImageExist(val) {
				needToBuild = append(needToBuild, val)
			} else {
				alreadyBuilt = append(alreadyBuilt, val)
			}
		}
		if len(needToBuild) > 0 {
			if err := d.runDockerCompose(append([]string{"up", "--build", "-d"}, needToBuild...)); err != nil {
				return err
			}
		}
		if len(alreadyBuilt) > 0 {
			if err := d.runDockerCompose(append([]string{"up", "-d"}, alreadyBuilt...)); err != nil {
				return err
			}
		}
	}

	return nil

}

// BuildServices rebuilds services images and creates containers based on those images
func (d *DockerComposeManager) BuildServices(services []string, keepVolume bool) error {
	if len(services) == 0 {
		return nil
	}
	err := d.StopServices(services, true, keepVolume)
	if err != nil {
		return err
	}
	err = d.runDockerCompose(append([]string{"up", "--build", "-d"}, services...))
	if err != nil {
		return err
	}
	return nil

}

// GetInstalled3rdPartyServicesOnDisk lists out the name of all 3rd party software installed on disk
func (d *DockerComposeManager) GetInstalled3rdPartyServicesOnDisk() ([]string, error) {
	var agentsOnDisk []string
	if !utils.DirExists(d.InstalledServicesFolder) {
		if err := os.Mkdir(d.InstalledServicesFolder, 0775); err != nil {
			return nil, err
		}
	}
	if files, err := os.ReadDir(d.InstalledServicesFolder); err != nil {
		log.Printf("[-] Failed to list contents of %s folder\n", d.InstalledServicesFolder)
		return nil, err
	} else {
		for _, f := range files {
			if f.IsDir() {
				agentsOnDisk = append(agentsOnDisk, f.Name())
			}
		}
	}
	return agentsOnDisk, nil
}

func (d *DockerComposeManager) GetHealthCheck(services []string) {
	for _, c := range services {
		outputString, err := d.runDocker([]string{"inspect", "--format", "{{json .State.Health }}", c})
		if err != nil {
			log.Printf("failed to check status: %s", err.Error())
		} else {
			log.Printf("%s:\n%s\n\n", c, outputString)
		}
	}
}

func (d *DockerComposeManager) BuildUI() error {
	_, err := d.runDocker([]string{"exec", "mythic_react", "/bin/sh", "-c", "npm run react-build"})
	if err != nil {
		log.Printf("[-] Failed to build new UI from MythicReactUI: %v\n", err)
	}
	return err
}

func (d *DockerComposeManager) GetLogs(service string, logCount int, follow bool) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("Failed to get client in GetLogs: %v", err)
	}
	containers, err := cli.ContainerList(context.Background(), container.ListOptions{})
	if err != nil {
		log.Fatalf("Failed to get container list: %v", err)
	}
	if len(containers) > 0 {
		found := false
		for _, c := range containers {
			if c.Labels["name"] == service {
				found = true
				reader, err := cli.ContainerLogs(context.Background(), c.ID, container.LogsOptions{
					ShowStdout: true,
					ShowStderr: true,
					Follow:     follow,
					Tail:       fmt.Sprintf("%d", logCount),
				})
				if err != nil {
					log.Fatalf("Failed to get container GetLogs: %v", err)
				}
				// awesome post about the leading 8 payload/header bytes: https://medium.com/@dhanushgopinath/reading-docker-container-logs-with-golang-docker-engine-api-702233fac044
				p := make([]byte, 8)
				_, err = reader.Read(p)
				for err == nil {
					content := make([]byte, binary.BigEndian.Uint32(p[4:]))
					reader.Read(content)
					fmt.Printf("%s", content)
					_, err = reader.Read(p)
				}
				reader.Close()
			}
		}
		if !found {
			log.Println("[-] Failed to find that container")
		}
	} else {
		log.Println("[-] No containers running")
	}
}
func checkPortRedirection(address string) (bool, string, error) {
	dialer := net.Dialer{Timeout: 1 * time.Second}
	conn, err := dialer.Dial("tcp", address)
	if err != nil {
		return false, "", err
	}
	defer conn.Close()

	resolvedAddress := conn.RemoteAddr().String()
	if resolvedAddress != address {
		return true, resolvedAddress, nil
	}
	return true, "", nil
}
func (d *DockerComposeManager) TestPorts(services []string) {
	// go through the different services in mythicEnv and check to make sure their ports aren't already used by trying to open them
	//MYTHIC_SERVER_HOST:MYTHIC_SERVER_PORT
	//POSTGRES_HOST:POSTGRES_PORT
	//HASURA_HOST:HASURA_PORT
	//RABBITMQ_HOST:RABBITMQ_PORT
	//DOCUMENTATION_HOST:DOCUMENTATION_PORT
	//NGINX_HOST:NGINX_PORT
	portChecks := map[string][]string{
		"MYTHIC_SERVER_HOST": {
			"MYTHIC_SERVER_PORT",
			"mythic_server",
		},
		"POSTGRES_HOST": {
			"POSTGRES_PORT",
			"mythic_postgres",
		},
		"HASURA_HOST": {
			"HASURA_PORT",
			"mythic_graphql",
		},
		"RABBITMQ_HOST": {
			"RABBITMQ_PORT",
			"mythic_rabbitmq",
		},
		"DOCUMENTATION_HOST": {
			"DOCUMENTATION_PORT",
			"mythic_documentation",
		},
		"NGINX_HOST": {
			"NGINX_PORT",
			"mythic_nginx",
		},
		"MYTHIC_REACT_HOST": {
			"MYTHIC_REACT_PORT",
			"mythic_react",
		},
		"JUPYTER_HOST": {
			"JUPYTER_PORT",
			"mythic_jupyter",
		},
	}
	var addServices []string
	var removeServices []string
	mythicEnv := config.GetMythicEnv()
	for key, val := range portChecks {
		// only check ports for services we're about to start
		if utils.StringInSlice(val[1], services) {
			if mythicEnv.GetString(key) == val[1] || mythicEnv.GetString(key) == "127.0.0.1" {
				addServices = append(addServices, val[1])
				p, err := net.Listen("tcp", ":"+strconv.Itoa(mythicEnv.GetInt(val[0])))
				if err != nil {
					log.Fatalf("[-] Port %d, from variable %s, appears to already be in use: %v\n", mythicEnv.GetInt(val[0]), key, err)
				}
				err = p.Close()
				if err != nil {
					log.Printf("[-] Failed to close connection: %v\n", err)
				}
				isOpen, redirectedAddress, err := checkPortRedirection(":" + strconv.Itoa(mythicEnv.GetInt(val[0])))
				if err != nil {
					continue
				}
				// allow port forwards for the Mythic UI but nothing else
				if isOpen && val[1] != "mythic_nginx" {
					if redirectedAddress != "" {
						log.Fatalf("Port %s is in use and redirected to %s\n", ":"+strconv.Itoa(mythicEnv.GetInt(val[0])), redirectedAddress)
					} else {
						log.Fatalf("Port %s is in use by something else\n", ":"+strconv.Itoa(mythicEnv.GetInt(val[0])))
					}
				}
			} else {
				removeServices = append(removeServices, val[1])
			}
		}
	}
}

func (d *DockerComposeManager) PrintConnectionInfo() {
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
	fmt.Fprintln(w, "ADDITIONAL SERVICES\tADDRESS\tBOUND LOCALLY")
	if mythicEnv.GetString("POSTGRES_HOST") == "mythic_postgres" {
		fmt.Fprintln(w, "Postgres Database\tpostgresql://mythic_user:password@127.0.0.1:"+strconv.Itoa(mythicEnv.GetInt("POSTGRES_PORT"))+"/mythic_db\t", mythicEnv.GetBool("postgres_bind_localhost_only"))
	} else {
		fmt.Fprintln(w, "Postgres Database\tpostgresql://mythic_user:password@"+mythicEnv.GetString("POSTGRES_HOST")+":"+strconv.Itoa(mythicEnv.GetInt("POSTGRES_PORT"))+"/mythic_db\t", mythicEnv.GetBool("postgres_bind_localhost_only"))
	}
	if mythicEnv.GetString("MYTHIC_REACT_HOST") == "mythic_react" {
		fmt.Fprintln(w, "React Server\thttp://127.0.0.1:"+strconv.Itoa(mythicEnv.GetInt("MYTHIC_REACT_PORT"))+"/new\t", mythicEnv.GetBool("mythic_react_bind_localhost_only"))
	} else {
		fmt.Fprintln(w, "React Server\thttp://"+mythicEnv.GetString("MYTHIC_REACT_HOST")+":"+strconv.Itoa(mythicEnv.GetInt("MYTHIC_REACT_PORT"))+"/new\t", mythicEnv.GetBool("mythic_react_bind_localhost_only"))
	}
	if mythicEnv.GetString("RABBITMQ_HOST") == "mythic_rabbitmq" {
		fmt.Fprintln(w, "RabbitMQ\tamqp://"+mythicEnv.GetString("RABBITMQ_USER")+":password@127.0.0.1:"+strconv.Itoa(mythicEnv.GetInt("RABBITMQ_PORT"))+"\t", mythicEnv.GetBool("rabbitmq_bind_localhost_only"))
	} else {
		fmt.Fprintln(w, "RabbitMQ\tamqp://"+mythicEnv.GetString("RABBITMQ_USER")+":password@"+mythicEnv.GetString("RABBITMQ_HOST")+":"+strconv.Itoa(mythicEnv.GetInt("RABBITMQ_PORT"))+"\t", mythicEnv.GetBool("rabbitmq_bind_localhost_only"))
	}
	fmt.Fprintln(w, "\t\t\t\t")
	w.Flush()
}

func (d *DockerComposeManager) Status(verbose bool) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("[-] Failed to get client in Status check: %v", err)
	}
	containers, err := cli.ContainerList(context.Background(), container.ListOptions{
		All:  true,
		Size: true,
	})
	if err != nil {
		log.Fatalf("[-] Failed to get container list: %v\n", err)
	}
	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 0, 8, 2, '\t', 0)
	var mythicLocalServices []string
	var installedServices []string
	sort.Slice(containers[:], func(i, j int) bool {
		return containers[i].Labels["name"] < containers[j].Labels["name"]
	})
	elementsOnDisk, err := d.GetInstalled3rdPartyServicesOnDisk()
	if err != nil {
		log.Fatalf("[-] Failed to get list of installed services on disk: %v\n", err)
	}
	elementsInCompose, err := d.GetAllInstalled3rdPartyServiceNames()
	if err != nil {
		log.Fatalf("[-] Failed to get list of installed services in docker-compose: %v\n", err)
	}
	for _, c := range containers {
		if c.Labels["name"] == "" {
			continue
		}
		var portRanges []uint16
		var portRangeMaps []string
		portString := ""
		info := fmt.Sprintf("%s\t%s\t%s\t", c.Labels["name"], c.State, c.Status)
		if len(c.Ports) > 0 {
			sort.Slice(c.Ports[:], func(i, j int) bool {
				return c.Ports[i].PublicPort < c.Ports[j].PublicPort
			})
			for _, port := range c.Ports {
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
		foundMountInfo := false
		for _, mnt := range c.Mounts {
			if strings.HasPrefix(mnt.Name, c.Labels["name"]+"_volume") {
				if foundMountInfo {
					info += ", " + mnt.Name
				} else {
					info += mnt.Name
				}
				foundMountInfo = true
			}
		}
		if !foundMountInfo {
			if c.Labels["name"] == "mythic_graphql" {
				info += "N/A"
			} else {
				info += "local"
			}
		}
		info += "\t"
		if utils.StringInSlice(c.Labels["name"], config.MythicPossibleServices) {
			info = info + portString
			mythicLocalServices = append(mythicLocalServices, info)
		} else {
			if utils.StringInSlice(c.Labels["name"], elementsOnDisk) ||
				utils.StringInSlice(c.Labels["name"], elementsInCompose) {
				installedServices = append(installedServices, info)
				elementsOnDisk = utils.RemoveStringFromSliceNoOrder(elementsOnDisk, c.Labels["name"])
				elementsInCompose = utils.RemoveStringFromSliceNoOrder(elementsInCompose, c.Labels["name"])
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
	fmt.Fprintln(w, "CONTAINER NAME\tSTATE\tSTATUS\tMOUNT")
	for _, line := range installedServices {
		fmt.Fprintln(w, line)
	}
	fmt.Fprintln(w, "\t\t\t\t")
	// remove all elementsInCompose from elementsOnDisk
	for _, c := range elementsInCompose {
		elementsOnDisk = utils.RemoveStringFromSliceNoOrder(elementsOnDisk, c)
	}
	if len(elementsInCompose) > 0 && verbose {
		fmt.Fprintln(w, "Docker Compose services not running, start with: ./mythic-cli start [name]")
		fmt.Fprintln(w, "NAME\t")
		sort.Strings(elementsInCompose)
		for _, c := range elementsInCompose {
			fmt.Fprintln(w, fmt.Sprintf("%s\t", c))
		}
		fmt.Fprintln(w, "\t")
	}
	if len(elementsOnDisk) > 0 && verbose {
		fmt.Fprintln(w, "Extra Services, add to docker compose with: ./mythic-cli add [name]")
		fmt.Fprintln(w, "NAME\t")
		sort.Strings(elementsOnDisk)
		for _, c := range elementsOnDisk {
			fmt.Fprintln(w, fmt.Sprintf("%s\t", c))
		}
		fmt.Fprintln(w, "\t\t")
	}
	w.Flush()
}

func (d *DockerComposeManager) PrintAllServices() {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("[-] Failed to get client in List Services: %v", err)
	}
	containers, err := cli.ContainerList(context.Background(), container.ListOptions{
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
	elementsOnDisk, err := d.GetInstalled3rdPartyServicesOnDisk()
	if err != nil {
		log.Fatalf("[-] Failed to get list of installed services on disk: %v\n", err)
	}
	elementsInCompose, err := d.GetAllInstalled3rdPartyServiceNames()
	if err != nil {
		log.Fatalf("[-] Failed to get list of installed services in docker-compose: %v\n", err)
	}
	for _, c := range containers {
		if c.Labels["name"] == "" {
			continue
		}
		if slices.Contains(elementsOnDisk, c.Labels["name"]) {
			info := fmt.Sprintf("%s\t%s\t%v\t%v", c.Labels["name"], c.Status, true, utils.StringInSlice(c.Labels["name"], elementsInCompose))
			installedServices = append(installedServices, info)
			elementsOnDisk = utils.RemoveStringFromSliceNoOrder(elementsOnDisk, c.Labels["name"])
			elementsInCompose = utils.RemoveStringFromSliceNoOrder(elementsInCompose, c.Labels["name"])
		}
	}
	for _, c := range elementsInCompose {
		elementsOnDisk = utils.RemoveStringFromSliceNoOrder(elementsOnDisk, c)
	}
	fmt.Fprintln(w, "Name\tContainerStatus\tImageBuilt\tDockerComposeEntry")
	for _, line := range installedServices {
		fmt.Fprintln(w, line)
	}
	if len(elementsInCompose) > 0 {
		sort.Strings(elementsInCompose)
		for _, c := range elementsInCompose {
			fmt.Fprintln(w, fmt.Sprintf("%s\t%s\t%v\t%v", c, "N/A", d.DoesImageExist(c), true))
		}
	}
	if len(elementsOnDisk) > 0 {
		sort.Strings(elementsOnDisk)
		for _, c := range elementsOnDisk {
			fmt.Fprintln(w, fmt.Sprintf("%s\t%s\t%v\t%v", c, "N/A", d.DoesImageExist(c), false))
		}
	}
	w.Flush()
}

func (d *DockerComposeManager) ResetDatabase(useVolume bool) {
	if !useVolume {
		workingPath := utils.GetCwdFromExe()
		err := os.RemoveAll(filepath.Join(workingPath, "postgres-docker", "database"))
		if err != nil {
			log.Fatalf("[-] Failed to remove database files\n%v\n", err)
		} else {
			log.Printf("[+] Successfully reset datbase files\n")
		}
	} else {
		_ = d.RemoveContainers([]string{"mythic_postgres"}, false)
		err := d.RemoveVolume("mythic_postgres_volume")
		if err != nil {
			log.Printf("[-] Failed to remove database:\n%v\n", err)
		}
	}
}
func (d *DockerComposeManager) ResetRabbitmq(useVolume bool) {
	if !useVolume {
		workingPath := utils.GetCwdFromExe()
		err := os.RemoveAll(filepath.Join(workingPath, "rabbitmq-docker", "storage"))
		if err != nil {
			log.Fatalf("[-] Failed to remove rabbitmq storage files\n%v\n", err)
		} else {
			log.Printf("[+] Successfully reset rabbitmq storage files\n")
		}
	} else {
		_ = d.RemoveContainers([]string{"mythic_rabbitmq"}, false)
		err := d.RemoveVolume("mythic_rabbitmq_volume")
		if err != nil {
			log.Printf("[-] Failed to remove rabbitmq storage volume:\n%v\n", err)
		}
	}
}
func (d *DockerComposeManager) BackupDatabase(backupPath string, useVolume bool) error {
	if !useVolume {
		workingPath := utils.GetCwdFromExe()
		log.Printf("[*] Staring to copy, this might take a minute...")
		err := utils.CopyDir(filepath.Join(workingPath, "postgres-docker", "database"), backupPath)
		if err != nil {
			log.Printf("[-] Failed to copy database files\n%v\n", err)
			return err
		} else {
			log.Printf("[+] Successfully copied database files from disk\n")
			return nil
		}
	} else {
		ctx := context.Background()
		cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
		if err != nil {
			return err
		}
		defer cli.Close()
		execID, err := cli.ContainerExecCreate(ctx, "mythic_postgres", types.ExecConfig{
			AttachStderr: true,
			AttachStdout: true,
			AttachStdin:  true,
			Cmd:          []string{"/bin/bash", "-i"},
		})
		if err != nil {
			log.Fatalf("[!] Failed to exec into container: %v", err)
		} else {
			log.Printf("[*] Created docker exec session")
		}
		session, err := cli.ContainerExecAttach(ctx, execID.ID, types.ExecStartCheck{})
		if err != nil {
			log.Fatalf("[!] Failed to attach to exec session: %v", err)
		} else {
			log.Printf("[*] Attached to docker exec session")
		}
		todayString := time.Now().Format("2006-01-02-150405")
		tarFileName := fmt.Sprintf("%s-mythic_postgres.tar", todayString)
		defer session.Close()
		dumpCommand := fmt.Sprintf("PGPASSWORD=%s pg_dump -n public --format=tar -U mythic_user -f /var/lib/postgresql/data/%s mythic_db\n",
			config.GetMythicEnv().GetString("postgres_password"), tarFileName)
		_, err = session.Conn.Write([]byte(dumpCommand))
		if err != nil {
			log.Fatalf("[!] Failed to write to exec bash: %v", err)
		} else {
			log.Printf("[*] Issued pg_dump command")
		}
		_, err = session.Conn.Write([]byte("exit\n"))
		if err != nil {
			log.Fatalf("[!] Failed to authenticate to exec bash: %v", err)
		}
		inspect, err := cli.ContainerExecInspect(ctx, execID.ID)
		if err != nil {
			log.Fatalf("[!] Failed to inspect container: %v", err)
		}
		for inspect.Running {
			time.Sleep(1 * time.Second)
			log.Printf("[*] Waiting for pg_dump to finish...")
			inspect, err = cli.ContainerExecInspect(ctx, execID.ID)
		}
		log.Printf("[*] Finished docker exec session")
		err = d.CopyFromVolume("mythic_postgres", "mythic_postgres_volume", tarFileName, backupPath)
		if err != nil {
			return err
		}
		log.Printf("[+] Successfully copied database files from volume")

		return nil
	}
}
func (d *DockerComposeManager) RestoreDatabase(backupPath string, useVolume bool) error {

	if !useVolume {
		workingPath := utils.GetCwdFromExe()
		log.Printf("[*] Staring to copy, this might take a minute...")
		err := utils.CopyDir(backupPath, filepath.Join(workingPath, "postgres-docker", "database"))
		if err != nil {
			log.Printf("[-] Failed to copy database files\n%v\n", err)
			return err
		} else {
			log.Printf("[+] Successfully copied database files\n")
			return nil
		}
	} else {
		err := d.CopyIntoVolume("mythic_postgres", backupPath, "dump.tar", "mythic_postgres_volume")
		if err != nil {
			return err
		}
		log.Printf("[+] Successfully copied database files")
		ctx := context.Background()
		cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
		if err != nil {
			return err
		}
		defer cli.Close()
		execID, err := cli.ContainerExecCreate(ctx, "mythic_postgres", types.ExecConfig{
			AttachStderr: true,
			AttachStdout: true,
			AttachStdin:  true,
			Cmd:          []string{"/bin/bash", "-i"},
		})
		if err != nil {
			log.Fatalf("[!] Failed to exec into container: %v", err)
		} else {
			log.Printf("[*] Created docker exec session")
		}
		session, err := cli.ContainerExecAttach(ctx, execID.ID, types.ExecStartCheck{})
		if err != nil {
			log.Fatalf("[!] Failed to attach to exec session: %v", err)
		} else {
			log.Printf("[*] Attached to docker exec session")
		}
		defer session.Close()
		dumpCommand := fmt.Sprintf("PGPASSWORD=%s pg_restore -U mythic_user -n public --clean --if-exists -d mythic_db /var/lib/postgresql/data/dump.tar\n",
			config.GetMythicEnv().GetString("postgres_password"))
		_, err = session.Conn.Write([]byte(dumpCommand))
		if err != nil {
			log.Fatalf("[!] Failed to write to exec bash: %v", err)
		} else {
			log.Printf("[*] Issued pg_dump command")
		}
		_, err = session.Conn.Write([]byte("rm /var/lib/postgresql/data/dump.tar; exit\n"))
		if err != nil {
			log.Fatalf("[!] Failed to authenticate to exec bash: %v", err)
		}
		inspect, err := cli.ContainerExecInspect(ctx, execID.ID)
		for inspect.Running {
			time.Sleep(1 * time.Second)
			log.Printf("[*] Waiting for pg_dump to finish...")
			inspect, err = cli.ContainerExecInspect(ctx, execID.ID)
		}
		log.Printf("[*] Finished docker exec session")
		return nil
	}
}
func (d *DockerComposeManager) BackupFiles(backupPath string, useVolume bool) error {
	if !useVolume {
		workingPath := utils.GetCwdFromExe()
		log.Printf("[*] Staring to copy, this might take a minute...")
		err := utils.CopyDir(filepath.Join(workingPath, "mythic-docker", "src", "files"), backupPath)
		if err != nil {
			log.Printf("[-] Failed to copy Mythic's uploads/downloads\n%v\n", err)
			return err
		} else {
			log.Printf("[+] Successfully copied Mythic's uploads/downloads from disk\n")
			return nil
		}
	} else {
		err := d.CopyFromVolume("mythic_server", "mythic_server_volume", "", backupPath)
		if err != nil {
			return err
		}
		log.Printf("[+] Successfully copied Mythic's uploads/downloads from volume")
		return nil
	}
}
func (d *DockerComposeManager) RestoreFiles(backupPath string, useVolume bool) error {

	if !useVolume {
		workingPath := utils.GetCwdFromExe()
		log.Printf("[*] Staring to copy, this might take a minute...")
		err := utils.CopyDir(backupPath, filepath.Join(workingPath, "mythic-docker", "src", "files"))
		if err != nil {
			log.Printf("[-] Failed to copy Mythic's uploads/downloads\n%v\n", err)
			return err
		} else {
			log.Printf("[+] Successfully copied Mythic's uploads/downloads\n")
			return nil
		}
	} else {
		err := d.CopyIntoVolume("mythic_server", backupPath, "/", "mythic_server_volume")
		if err != nil {
			return err
		}
		log.Printf("[+] Successfully copied Mythic's uploads/downloads")
		return nil
	}

}
func (d *DockerComposeManager) PrintVolumeInformation() {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		panic(err)
	}
	defer cli.Close()
	w := new(tabwriter.Writer)
	w.Init(os.Stdout, 0, 8, 2, '\t', 0)
	fmt.Fprintln(w, "VOLUME\tSIZE\tCONTAINER (Ref Count)\tCONTAINER STATUS\tLOCATION")
	du, err := cli.DiskUsage(ctx, types.DiskUsageOptions{})
	if err != nil {
		log.Fatalf("[-] Failed to get disk sizes: %v\n", err)
	}
	containers, err := cli.ContainerList(ctx, container.ListOptions{Size: true})
	if err != nil {
		log.Fatalf("[-] Failed to get container list: %v\n", err)
	}
	if du.Volumes == nil {
		log.Printf("[-] No volumes known\n")
		return
	}
	var entries []string
	volumeList, err := d.GetVolumes()
	if err != nil {
		log.Fatalf("[-] Failed to get volumes: %v", err)
	}
	for _, currentVolume := range du.Volumes {
		name := currentVolume.Name
		size := "unknown"
		if currentVolume.UsageData != nil {
			size = utils.ByteCountSI(currentVolume.UsageData.Size)
		}
		if _, ok := volumeList[currentVolume.Name]; !ok {
			continue
		}
		containerPieces := strings.Split(currentVolume.Name, "_volume")
		containerName := containerPieces[0]
		containerUsage := "unused (0)"
		containerStatus := "offline"
		for _, c := range containers {
			if containerName == c.Labels["name"] {
				containerStatus = c.Status
			}
			for _, m := range c.Mounts {
				if m.Name == currentVolume.Name {
					containerUsage = containerName + " (" + strconv.Itoa(int(currentVolume.UsageData.RefCount)) + ")"
				}
			}
		}
		entries = append(entries, fmt.Sprintf("%s\t%s\t%s\t%s\t%s",
			name,
			size,
			containerUsage,
			containerStatus,
			currentVolume.Mountpoint,
		))
	}
	sort.Strings(entries)
	for _, line := range entries {
		fmt.Fprintln(w, line)
	}

	defer w.Flush()
	return
}
func (d *DockerComposeManager) RemoveVolume(volumeName string) error {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		panic(err)
	}
	defer cli.Close()
	volumes, err := cli.VolumeList(ctx, volume.ListOptions{})
	if err != nil {
		return err
	}
	for _, currentVolume := range volumes.Volumes {
		if currentVolume.Name == volumeName {
			containers, err := cli.ContainerList(ctx, container.ListOptions{Size: true})
			if err != nil {
				log.Fatalf("[-] Failed to get container list: %v\n", err)
			}
			for _, c := range containers {
				for _, m := range c.Mounts {
					if m.Name == volumeName {
						containerName := c.Labels["name"]
						log.Printf("[*] Removing container %s...\n", containerName)
						err = cli.ContainerRemove(ctx, c.ID, container.RemoveOptions{Force: true})
						if err != nil {
							log.Printf(fmt.Sprintf("[!] Failed to remove container that's using the volume: %v\n", err))
						} else {
							log.Printf("[+] Removed container %s, which was using that volume", containerName)
						}
					}
				}
			}
			err = cli.VolumeRemove(ctx, currentVolume.Name, true)
			return err
		}
	}
	log.Printf("[*] Volume not found")
	return errors.New("[*] Volume not found")
}
func (d *DockerComposeManager) CopyIntoVolume(containerName string, sourceFile string, destinationFileName string, destinationVolume string) error {
	err := d.ensureVolume(containerName, destinationVolume)
	if err != nil {
		log.Fatalf("[-] Failed to ensure volume exists: %v\n", err)
	}
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("[-] Failed to connect to docker api: %v\n", err)
	}
	defer cli.Close()
	containers, err := cli.ContainerList(ctx, container.ListOptions{Size: true})
	if err != nil {
		log.Fatalf("[-] Failed to get container list: %v\n", err)
	}
	for _, c := range containers {
		for _, mnt := range c.Mounts {
			if mnt.Name == destinationVolume {
				log.Printf("[*] Staring to copy, this might take a minute...")
				log.Printf("[*] Copying %s to %s", sourceFile, c.Labels["name"]+":"+mnt.Destination+"/"+destinationFileName)
				output, err := d.runDocker([]string{"cp", sourceFile, c.Labels["name"] + ":" + mnt.Destination + "/" + destinationFileName})
				log.Printf(output)
				return err
			}
		}
	}
	log.Printf("[-] Failed to find %s in use by any containers", destinationVolume)
	return errors.New("[-] failed to find that volume")
}
func (d *DockerComposeManager) CopyFromVolume(containerName string, sourceVolumeName string, sourceFileName string, destinationName string) error {
	err := d.ensureVolume(containerName, sourceVolumeName)
	if err != nil {
		log.Fatalf("[-] Failed to ensure volume exists: %v\n", err)
	}
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("[-] Failed to connect to docker api: %v\n", err)
	}
	defer cli.Close()
	containers, err := cli.ContainerList(ctx, container.ListOptions{Size: true})
	if err != nil {
		log.Fatalf("[-] Failed to get container list: %v\n", err)
	}
	for _, c := range containers {
		for _, mnt := range c.Mounts {
			if mnt.Name == sourceVolumeName {
				log.Printf("[*] Staring to copy, this might take a minute...")
				output, err := d.runDocker([]string{"cp", c.Labels["name"] + ":" + mnt.Destination + "/" + sourceFileName, destinationName})
				log.Printf(output)
				return err
			}
		}
	}
	log.Printf("[-] Failed to find that volume name in use by any containers")
	return errors.New("[-] failed to find that volume")
}

// Internal Support Commands
func (d *DockerComposeManager) getMythicEnvList() []string {
	env := config.GetMythicEnv().AllSettings()
	var envList []string
	for key := range env {
		val := config.GetMythicEnv().GetString(key)
		if val != "" {
			// prevent trying to append arrays or dictionaries to our environment list
			envList = append(envList, strings.ToUpper(key)+"="+val)
		}
	}
	envList = append(envList, os.Environ()...)
	return envList
}
func (d *DockerComposeManager) getCwdFromExe() string {
	exe, err := os.Executable()
	if err != nil {
		log.Fatalf("[-] Failed to get path to current executable\n")
	}
	return filepath.Dir(exe)
}
func (d *DockerComposeManager) runDocker(args []string) (string, error) {
	lookPath, err := exec.LookPath("docker")
	if err != nil {
		log.Fatalf("[-] docker is not installed or available in the current PATH\n")
	}
	exe, err := os.Executable()
	if err != nil {
		log.Fatalf("[-] Failed to get lookPath to current executable\n")
	}
	exePath := filepath.Dir(exe)
	command := exec.Command(lookPath, args...)
	command.Dir = exePath
	command.Env = d.getMythicEnvList()
	stdout, err := command.StdoutPipe()
	if err != nil {
		log.Fatalf("[-] Failed to get stdout pipe for running docker-compose\n")
	}
	stderr, err := command.StderrPipe()
	if err != nil {
		log.Fatalf("[-] Failed to get stderr pipe for running docker-compose\n")
	}
	stdoutScanner := bufio.NewScanner(stdout)
	stderrScanner := bufio.NewScanner(stderr)
	outputString := ""
	wg := sync.WaitGroup{}
	wg.Add(2)
	go func() {
		for stdoutScanner.Scan() {
			outputString += stdoutScanner.Text()
		}
		wg.Done()
	}()
	go func() {
		for stderrScanner.Scan() {
			fmt.Printf("%s\n", stderrScanner.Text())
		}
		wg.Done()
	}()
	err = command.Start()
	if err != nil {
		log.Fatalf("[-] Error trying to start docker: %v\n", err)
	}
	wg.Wait()
	err = command.Wait()
	if err != nil {
		log.Printf("[-] Error from docker: %v\n", err)
		log.Printf("[*] Docker command: %v\n", args)
		return "", err
	}
	return outputString, nil
}
func (d *DockerComposeManager) runDockerCompose(args []string) error {
	lookPath, err := exec.LookPath("docker")
	if err != nil {
		log.Fatalf("[-] docker is not installed or available in the current PATH\n")
	} else {
		// adjust the current args for docker compose subcommand
		args = append([]string{"compose"}, args...)
	}

	exe, err := os.Executable()
	if err != nil {
		log.Fatalf("[-] Failed to get lookPath to current executable\n")
	}
	exePath := filepath.Dir(exe)
	command := exec.Command(lookPath, args...)
	command.Dir = exePath
	command.Env = d.getMythicEnvList()
	f, err := pty.Start(command)
	if err != nil {
		stdout, err := command.StdoutPipe()
		if err != nil {
			log.Fatalf("[-] Failed to get stdout pipe for running docker-compose\n")
		}
		stderr, err := command.StderrPipe()
		if err != nil {
			log.Fatalf("[-] Failed to get stderr pipe for running docker-compose\n")
		}

		stdoutScanner := bufio.NewScanner(stdout)
		stderrScanner := bufio.NewScanner(stderr)
		go func() {
			for stdoutScanner.Scan() {
				fmt.Printf("%s\n", stdoutScanner.Text())
			}
		}()
		go func() {
			for stderrScanner.Scan() {
				fmt.Printf("%s\n", stderrScanner.Text())
			}
		}()
		err = command.Start()
		if err != nil {
			log.Fatalf("[-] Error trying to start docker-compose: %v\n", err)
		}
		err = command.Wait()
		if err != nil {
			log.Printf("[-] Error from docker-compose: %v\n", err)
			log.Printf("[*] Docker compose command: %v\n", args)
			return err
		}
	} else {
		io.Copy(os.Stdout, f)
	}

	return nil
}
func (d *DockerComposeManager) setDockerComposeDefaultsAndWrite(curConfig map[string]interface{}) error {
	file := filepath.Join(utils.GetCwdFromExe(), "docker-compose.yml")
	//curConfig["version"] = "2.4"
	delete(curConfig, "version")
	delete(curConfig, "networks")
	content, err := yaml.Marshal(curConfig)
	if err != nil {
		return err
	}
	return os.WriteFile(file, content, 0644)
}
func (d *DockerComposeManager) readInDockerCompose() *viper.Viper {
	var curConfig = viper.New()
	curConfig.SetConfigName("docker-compose")
	curConfig.SetConfigType("yaml")
	curConfig.AddConfigPath(d.getCwdFromExe())
	if err := curConfig.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Fatalf("[-] Error while reading in docker-compose file: %s\n", err)
		} else {
			log.Fatalf("[-] Error while parsing docker-compose file: %s\n", err)
		}
	}
	return curConfig
}
func (d *DockerComposeManager) ensureVolume(containerName, volumeName string) error {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}
	defer cli.Close()
	volumes, err := cli.VolumeList(ctx, volume.ListOptions{})
	if err != nil {
		return err
	}
	foundVolume := false
	for _, currentVolume := range volumes.Volumes {
		if currentVolume.Name == volumeName {
			foundVolume = true
		}
	}
	if !foundVolume {
		_, err = cli.VolumeCreate(ctx, volume.CreateOptions{Name: volumeName})
		if err != nil {
			return err
		}
	}
	// now that we know the volume exists, make sure it's attached to a running container or we can't manipulate files
	containers, err := cli.ContainerList(ctx, container.ListOptions{Size: true})
	if err != nil {
		return err
	}
	for _, c := range containers {
		if c.Labels["name"] == containerName {
			for _, mnt := range c.Mounts {
				if mnt.Name == volumeName {
					// container is running and has this mount associated with it
					return nil
				}
			}
			return errors.New(fmt.Sprintf("container, %s, isn't using volume, %s", containerName, volumeName))
		}
	}
	return errors.New(fmt.Sprintf("failed to find container, %s, for volume, %s", containerName, volumeName))
}

func (d *DockerComposeManager) GetAllInstalled3rdPartyServiceNames() ([]string, error) {
	// get all services that exist within the loaded config
	groupNameConfig := viper.New()
	groupNameConfig.SetConfigName("docker-compose")
	groupNameConfig.SetConfigType("yaml")
	groupNameConfig.AddConfigPath(utils.GetCwdFromExe())
	if err := groupNameConfig.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Printf("[-] Error while reading in docker-compose file: %s\n", err)
			return []string{}, err
		} else {
			log.Printf("[-] Error while parsing docker-compose file: %s\n", err)
			return []string{}, err
		}
	}
	servicesSub := groupNameConfig.Sub("services")
	containerList := []string{}
	if servicesSub != nil {
		services := servicesSub.AllSettings()
		for service := range services {
			if !utils.StringInSlice(service, config.MythicPossibleServices) {
				containerList = append(containerList, service)
			}
		}
	}

	return containerList, nil
}

// GetCurrentMythicServiceNames from reading in the docker-compose file, not necessarily what should be there or what's running
func (d *DockerComposeManager) GetCurrentMythicServiceNames() ([]string, error) {
	groupNameConfig := viper.New()
	groupNameConfig.SetConfigName("docker-compose")
	groupNameConfig.SetConfigType("yaml")
	groupNameConfig.AddConfigPath(utils.GetCwdFromExe())
	if err := groupNameConfig.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Printf("[-] Error while reading in docker-compose file: %s\n", err)
			return []string{}, err
		} else {
			log.Printf("[-] Error while parsing docker-compose file: %s\n", err)
			return []string{}, err
		}
	}
	servicesSub := groupNameConfig.Sub("services")

	containerList := []string{}
	if servicesSub != nil {
		services := servicesSub.AllSettings()
		for service := range services {
			if utils.StringInSlice(service, config.MythicPossibleServices) {
				containerList = append(containerList, service)
			}
		}
	}

	return containerList, nil
}
