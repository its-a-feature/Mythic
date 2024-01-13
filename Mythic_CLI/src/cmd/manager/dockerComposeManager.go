package manager

import (
	"bufio"
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/utils"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/spf13/viper"
	"golang.org/x/mod/semver"
	"gopkg.in/yaml.v3"
	"io"
	"log"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
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
	containers, err := cli.ContainerList(context.Background(), types.ContainerListOptions{
		All: true,
	})
	if err != nil {
		log.Fatalf("[-] Failed to get container list from Docker: %v", err)
	}
	if len(containers) > 0 {
		for _, container := range containers {
			if container.Labels["name"] == strings.ToLower(service) {
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
		log.Fatalf("Failed to get client in GetLogs: %v", err)
	}
	desiredImage := fmt.Sprintf("%v:latest", strings.ToLower(service))
	images, err := cli.ImageList(context.Background(), types.ImageListOptions{All: true})
	if err != nil {
		log.Fatalf("Failed to get container list: %v", err)
	}
	for _, image := range images {
		for _, name := range image.RepoTags {
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

	images, err := cli.ImageList(ctx, types.ImageListOptions{})
	if err != nil {
		log.Fatalf("[-] Failed to get list of images: %v\n", err)
	}

	for _, image := range images {
		if utils.StringInSlice("<none>:<none>", image.RepoTags) {
			_, err = cli.ImageRemove(ctx, image.ID, types.ImageRemoveOptions{
				Force:         true,
				PruneChildren: true,
			})
			if err != nil {
				log.Printf("[-] Failed to remove unused image: %v\n", err)
			}
		}
	}
	return nil
}

func (d *DockerComposeManager) RemoveContainers(services []string) error {
	err := d.runDockerCompose(append([]string{"rm", "-s", "-v", "-f"}, services...))
	if err != nil {
		return err
	}
	_, err = d.runDocker(append([]string{"rm", "-f"}, services...))
	if err != nil {
		return err
	} else {
		return nil
	}
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
	fmt.Printf("[*] Saving to %s\nThis will take a while...\n", savedImagePath)
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
	fmt.Printf("[+] loaded docker images!\n")
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
		return true
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
	curConfig.Set("volumes", volumes)
	err := d.setDockerComposeDefaultsAndWrite(curConfig)
	if err != nil {
		fmt.Printf("[-] Failed to update config: %v\n", err)
	}
}

// GetServiceConfiguration checks docker-compose to see if that service is defined or not and returns its config or a generic one
func (d *DockerComposeManager) GetServiceConfiguration(service string) (map[string]interface{}, error) {
	curConfig := d.readInDockerCompose()
	pStruct := map[string]interface{}{}
	if curConfig.InConfig("services." + strings.ToLower(service)) {
		pStruct = curConfig.GetStringMap("services." + strings.ToLower(service))
		delete(pStruct, "network_mode")
		delete(pStruct, "extra_hosts")
		delete(pStruct, "build")
		delete(pStruct, "networks")
		delete(pStruct, "command")
		delete(pStruct, "healthcheck")
	} else {
		pStruct = map[string]interface{}{
			"logging": map[string]interface{}{
				"driver": "json-file",
				"options": map[string]string{
					"max-file": "1",
					"max-size": "10m",
				},
			},
			"restart": "always",
			"labels": map[string]string{
				"name": service,
			},
			"container_name": service,
			"image":          service,
		}
	}
	return pStruct, nil
}

// SetServiceConfiguration sets a service configuration into docker-compose
func (d *DockerComposeManager) SetServiceConfiguration(service string, pStruct map[string]interface{}) error {
	curConfig := d.readInDockerCompose()
	if !curConfig.InConfig("services." + strings.ToLower(service)) {
		curConfig.Set("services."+strings.ToLower(service), pStruct)
		log.Printf("[+] Added %s to docker-compose\n", strings.ToLower(service))
	} else {
		curConfig.Set("services."+strings.ToLower(service), pStruct)
	}
	err := d.setDockerComposeDefaultsAndWrite(curConfig)
	if err != nil {
		fmt.Printf("[-] Failed to update config: %v\n", err)
	}
	return err
}

// GetPathTo3rdPartyServicesOnDisk returns to path on disk to where 3rd party services are installed
func (d *DockerComposeManager) GetPathTo3rdPartyServicesOnDisk() string {
	return d.InstalledServicesFolder
}

// StopServices stops certain containers that are running and optionally deletes the backing images
func (d *DockerComposeManager) StopServices(services []string, deleteImages bool) error {
	dockerComposeContainers, err := d.GetAllExistingNonMythicServiceNames()
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
	/*
		if utils.StringInSlice("mythic_react", services) {
			if mythicEnv.GetBool("mythic_react_debug") {
				// only need to remove the container if we're switching between debug and regular
				if err = d.runDockerCompose(append([]string{"rm", "-s", "-v", "-f"}, "mythic_react")); err != nil {
					fmt.Printf("[-] Failed to remove mythic_react\n")
					return err
				}
			}
		}

	*/
	if deleteImages {
		return d.runDockerCompose(append([]string{"rm", "-s", "-v", "-f"}, services...))
	} else {
		return d.runDockerCompose(append([]string{"stop"}, services...))
	}

}

// RemoveServices removes certain container entries from the docker-compose
func (d *DockerComposeManager) RemoveServices(services []string) error {
	curConfig := d.readInDockerCompose()
	for _, service := range services {
		if !utils.StringInSlice(service, config.MythicPossibleServices) {
			if d.IsServiceRunning(service) {
				_ = d.StopServices([]string{strings.ToLower(service)}, true)

			}
			delete(curConfig.Get("services").(map[string]interface{}), strings.ToLower(service))
			log.Printf("[+] Removed %s from docker-compose\n", strings.ToLower(service))
		}
	}
	err := d.setDockerComposeDefaultsAndWrite(curConfig)
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
func (d *DockerComposeManager) BuildServices(services []string) error {
	if len(services) == 0 {
		return nil
	}

	err := d.runDockerCompose(append([]string{"rm", "-s", "-v", "-f"}, services...))
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
	for _, container := range services {
		outputString, err := d.runDocker([]string{"inspect", "--format", "{{json .State.Health }}", container})
		if err != nil {
			log.Printf("failed to check status: %s", err.Error())
		} else {
			log.Printf("%s:\n%s\n\n", container, outputString)
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

func (d *DockerComposeManager) GetLogs(service string, logCount int) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("Failed to get client in GetLogs: %v", err)
	}
	containers, err := cli.ContainerList(context.Background(), types.ContainerListOptions{})
	if err != nil {
		log.Fatalf("Failed to get container list: %v", err)
	}
	if len(containers) > 0 {
		found := false
		for _, container := range containers {
			if container.Labels["name"] == service {
				found = true
				reader, err := cli.ContainerLogs(context.Background(), container.ID, types.ContainerLogsOptions{
					ShowStdout: true,
					ShowStderr: true,
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

func (d *DockerComposeManager) TestPorts() {
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
		} else {
			removeServices = append(removeServices, val[1])
		}
	}
}

// Internal Support Commands
func (d *DockerComposeManager) getMythicEnvList() []string {
	env := config.GetMythicEnv().AllSettings()
	var envList []string
	for key := range env {
		val := config.GetMythicEnv().GetString(key)
		if val != "" {
			// prevent trying to append arrays or dictionaries to our environment list
			//fmt.Println(strings.ToUpper(key), val)
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
	lookPath, err := exec.LookPath("docker-compose")
	if err != nil {
		lookPath, err = exec.LookPath("docker")
		if err != nil {
			log.Fatalf("[-] docker-compose and docker are not installed or available in the current PATH\n")
		} else {
			// adjust the current args for docker compose subcommand
			args = append([]string{"compose"}, args...)
		}
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
	wg := sync.WaitGroup{}
	wg.Add(2)
	go func() {
		for stdoutScanner.Scan() {
			fmt.Printf("%s\n", stdoutScanner.Text())
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
		log.Fatalf("[-] Error trying to start docker-compose: %v\n", err)
	}
	wg.Wait()
	err = command.Wait()
	if err != nil {
		fmt.Printf("[-] Error from docker-compose: %v\n", err)
		fmt.Printf("[*] Docker compose command: %v\n", args)
		return err
	}
	return nil
}
func (d *DockerComposeManager) setDockerComposeDefaultsAndWrite(curConfig *viper.Viper) error {
	curConfig.Set("version", "2.4")
	file := curConfig.ConfigFileUsed()
	if len(file) == 0 {
		file = "./docker-compose.yml"
	}
	configMap := curConfig.AllSettings()
	ignoredKeys := []string{"networks"}
	for _, key := range ignoredKeys {
		delete(configMap, key)
	}

	content, err := yaml.Marshal(configMap)
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

// GetAllExistingNonMythicServiceNames from reading in the docker-compose file, not necessarily what's running
func (d *DockerComposeManager) GetAllExistingNonMythicServiceNames() ([]string, error) {
	// get all services that exist within the loaded config
	groupNameConfig := viper.New()
	groupNameConfig.SetConfigName("docker-compose")
	groupNameConfig.SetConfigType("yaml")
	groupNameConfig.AddConfigPath(utils.GetCwdFromExe())
	if err := groupNameConfig.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			fmt.Printf("[-] Error while reading in docker-compose file: %s\n", err)
			return []string{}, err
		} else {
			fmt.Printf("[-] Error while parsing docker-compose file: %s\n", err)
			return []string{}, err
		}
	}
	servicesSub := groupNameConfig.Sub("services")
	services := servicesSub.AllSettings()
	containerList := []string{}
	for service := range services {
		if !utils.StringInSlice(service, config.MythicPossibleServices) {
			containerList = append(containerList, service)
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
			fmt.Printf("[-] Error while reading in docker-compose file: %s\n", err)
			return []string{}, err
		} else {
			fmt.Printf("[-] Error while parsing docker-compose file: %s\n", err)
			return []string{}, err
		}
	}
	servicesSub := groupNameConfig.Sub("services")
	services := servicesSub.AllSettings()
	containerList := []string{}
	for service := range services {
		if utils.StringInSlice(service, config.MythicPossibleServices) {
			containerList = append(containerList, service)
		}
	}
	return containerList, nil
}
