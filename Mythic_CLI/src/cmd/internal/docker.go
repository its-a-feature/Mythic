package internal

import (
	"context"
	"errors"
	"fmt"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
)

var MythicPossibleServices = []string{
	"mythic_postgres",
	"mythic_react",
	"mythic_server",
	"mythic_nginx",
	"mythic_rabbitmq",
	"mythic_graphql",
	"mythic_documentation",
	"mythic_jupyter",
	"mythic_sync",
	"mythic_grafana",
	"mythic_prometheus",
	"mythic_postgres_exporter",
	"mythic_mlflow",
}
var buildArguments []string

const InstalledServicesFolder = "InstalledServices"

func updateEnvironmentVariables(originalList []string, updates []string) []string {
	var finalList []string
	for _, entry := range originalList {
		entryPieces := strings.Split(entry, "=")
		found := false
		for _, update := range updates {
			updatePieces := strings.Split(update, "=")
			if updatePieces[0] == entryPieces[0] {
				// the current env vars has a key that we want to update, so don't include the old version
				found = true
			}
		}
		if !found {
			finalList = append(finalList, entry)
		}
	}
	for _, update := range updates {
		finalList = append(finalList, update)
	}
	return finalList
}
func GetIntendedMythicServiceNames() ([]string, error) {
	// need to see about adding services back in if they were for remote hosts before
	containerList := []string{}
	for _, service := range MythicPossibleServices {
		// service is a mythic service, but it's not in our current container list (i.e. not in docker-compose)
		switch service {
		case "mythic_react":
			if mythicEnv.GetString("MYTHIC_REACT_HOST") == "127.0.0.1" || mythicEnv.GetString("MYTHIC_REACT_HOST") == "mythic_react" {
				containerList = append(containerList, service)
			}
		case "mythic_nginx":
			if mythicEnv.GetString("NGINX_HOST") == "127.0.0.1" || mythicEnv.GetString("NGINX_HOST") == "mythic_nginx" {
				containerList = append(containerList, service)
			}
		case "mythic_rabbitmq":
			if mythicEnv.GetString("RABBITMQ_HOST") == "127.0.0.1" || mythicEnv.GetString("RABBITMQ_HOST") == "mythic_rabbitmq" {
				containerList = append(containerList, service)
			}
		case "mythic_server":
			if mythicEnv.GetString("MYTHIC_SERVER_HOST") == "127.0.0.1" || mythicEnv.GetString("MYTHIC_SERVER_HOST") == "mythic_server" {
				containerList = append(containerList, service)
			}
		case "mythic_postgres":
			if mythicEnv.GetString("POSTGRES_HOST") == "127.0.0.1" || mythicEnv.GetString("POSTGRES_HOST") == "mythic_postgres" {
				containerList = append(containerList, service)
			}
		case "mythic_graphql":
			if mythicEnv.GetString("HASURA_HOST") == "127.0.0.1" || mythicEnv.GetString("HASURA_HOST") == "mythic_graphql" {
				containerList = append(containerList, service)
			}
		case "mythic_documentation":
			if mythicEnv.GetString("DOCUMENTATION_HOST") == "127.0.0.1" || mythicEnv.GetString("DOCUMENTATION_HOST") == "mythic_documentation" {
				containerList = append(containerList, service)
			}
		case "mythic_jupyter":
			if mythicEnv.GetString("JUPYTER_HOST") == "127.0.0.1" || mythicEnv.GetString("JUPYTER_HOST") == "mythic_jupyter" {
				containerList = append(containerList, service)
			}
		case "mythic_mlflow":
			if mythicEnv.GetString("MLFLOW_HOST") == "127.0.0.1" || mythicEnv.GetString("MLFLOW_HOST") == "mythic_mlflow" {
				containerList = append(containerList, service)
			}
		case "mythic_grafana":
			if mythicEnv.GetBool("postgres_debug") {
				containerList = append(containerList, service)
			}
		case "mythic_prometheus":
			if mythicEnv.GetBool("postgres_debug") {
				containerList = append(containerList, service)
			}
		case "mythic_postgres_exporter":
			if mythicEnv.GetBool("postgres_debug") {
				containerList = append(containerList, service)
			}
		case "mythic_sync":
			if mythicSyncPath, err := filepath.Abs(filepath.Join(getCwdFromExe(), InstalledServicesFolder, "mythic_sync")); err != nil {
				fmt.Printf("[-] Failed to get the absolute path to mythic_sync: %v\n", err)
			} else if _, err = os.Stat(mythicSyncPath); !os.IsNotExist(err) {
				// this means that the mythic_sync folder _does_ exist
				containerList = append(containerList, service)
			}
		}
	}
	return containerList, nil
}
func getElementsOnDisk() ([]string, error) {
	var agentsOnDisk []string
	installedServicesFilePath := filepath.Join(getCwdFromExe(), InstalledServicesFolder)
	if !dirExists(installedServicesFilePath) {
		if err := os.Mkdir(installedServicesFilePath, 0775); err != nil {
			return nil, err
		}
	}
	if files, err := os.ReadDir(installedServicesFilePath); err != nil {
		log.Printf("[-] Failed to list contents of %s folder\n", InstalledServicesFolder)
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

func DockerStart(containers []string) error {
	// first stop everything that's currently running
	buildArguments = getBuildArguments()
	if err := DockerStop(containers); err != nil {
		return err
	}
	// make sure that ports are available for us to use
	if len(containers) == 0 {
		if err := TestPorts(); err != nil {
			return err
		}
	}
	updateNginxBlockLists()
	// get all the services on disk and in docker-compose currently
	if diskAgents, err := getElementsOnDisk(); err != nil {
		return err
	} else if dockerComposeContainers, err := GetAllExistingNonMythicServiceNames(); err != nil {
		return err
	} else if intendedMythicServices, err := GetIntendedMythicServiceNames(); err != nil {
		return err
	} else if currentMythicServices, err := GetCurrentMythicServiceNames(); err != nil {
		return err
	} else {
		for _, val := range currentMythicServices {
			if stringInSlice(val, intendedMythicServices) {
			} else {
				removeMythicServiceDockerComposeEntry(val)
			}
		}
		for _, val := range intendedMythicServices {
			if stringInSlice(val, currentMythicServices) {

			} else {
				addMythicServiceDockerComposeEntry(val)
			}
		}
		// if the user didn't explicitly call out starting certain containers, then do all of them
		if len(containers) == 0 {
			generateCerts()
			containers = append(dockerComposeContainers, intendedMythicServices...)
		}
		finalContainers := []string{}
		//fmt.Printf("container list: %v\n", containers)
		//fmt.Printf("dockerComposeContainers: %v\n", dockerComposeContainers)
		//fmt.Printf("mythicPossibleServices: %v\n", MythicPossibleServices)
		for _, val := range containers { // these are specified containers or all in docker compose
			if !stringInSlice(val, dockerComposeContainers) && !stringInSlice(val, MythicPossibleServices) {
				if stringInSlice(val, diskAgents) {
					// the agent mentioned isn't in docker-compose, but is on disk, ask to add
					add := askConfirm(fmt.Sprintf("\n%s isn't in docker-compose, but is on disk. Would you like to add it? ", val))
					if add {
						finalContainers = append(finalContainers, val)
						AddDockerComposeEntry(val, map[string]interface{}{})
					}
				} else {
					add := askConfirm(fmt.Sprintf("\n%s isn't in docker-compose and is not on disk. Would you like to install it from https://github.com/? ", val))
					if add {
						finalContainers = append(finalContainers, val)
						installServiceByName(val)
					}
				}
			} else {
				finalContainers = append(finalContainers, val)
			}

		}
		//fmt.Printf("final container list: %v\n", finalContainers)
		// update all the mythic service entries to make sure they're the latest
		for _, service := range finalContainers {
			if stringInSlice(service, MythicPossibleServices) {
				addMythicServiceDockerComposeEntry(service)
			}
		}
		if mythicEnv.GetBool("REBUILD_ON_START") {
			if err := runDockerCompose(append([]string{"up", "--build", "-d"}, finalContainers...)); err != nil {
				return err
			}
		} else {
			var needToBuild []string
			var alreadyBuilt []string
			for _, val := range finalContainers {
				if !imageExists(val) {
					needToBuild = append(needToBuild, val)
				} else {
					alreadyBuilt = append(alreadyBuilt, val)
				}
			}
			if len(needToBuild) > 0 {
				if err := runDockerCompose(append([]string{"up", "--build", "-d"}, needToBuild...)); err != nil {
					return err
				}
			}
			if err := runDockerCompose(append([]string{"up", "-d"}, alreadyBuilt...)); err != nil {
				return err
			}
		}
		DockerRemoveImages()
		TestMythicRabbitmqConnection()
		TestMythicConnection()
		Status()
		return nil
	}
}
func DockerStop(containers []string) error {
	if dockerComposeContainers, err := GetAllExistingNonMythicServiceNames(); err != nil {
		return err
	} else if currentMythicServices, err := GetCurrentMythicServiceNames(); err != nil {
		return err
	} else {
		if len(containers) == 0 {
			containers = append(dockerComposeContainers, currentMythicServices...)
		}
		if stringInSlice("mythic_react", containers) {
			if mythicEnv.GetBool("mythic_react_debug") {
				// only need to remove the container if we're switching between debug and regular
				if err = runDockerCompose(append([]string{"rm", "-s", "-v", "-f"}, "mythic_react")); err != nil {
					fmt.Printf("[-] Failed to remove mythic_react")
					return err
				}
			}
		}
		if mythicEnv.GetBool("REBUILD_ON_START") {
			return runDockerCompose(append([]string{"rm", "-s", "-v", "-f"}, containers...))
		} else {
			return runDockerCompose(append([]string{"stop"}, containers...))
		}
	}
}
func DockerBuild(containers []string) error {
	if len(containers) == 0 {
		return nil
	} else {
		for _, container := range containers {
			if stringInSlice(container, MythicPossibleServices) {
				// update the necessary docker compose entries for mythic services
				addMythicServiceDockerComposeEntry(container)
			}
		}
		if err := runDockerCompose(append([]string{"rm", "-s", "-v", "-f"}, containers...)); err != nil {
			return err
		} else if err := runDockerCompose(append([]string{"up", "--build", "-d"}, containers...)); err != nil {
			return err
		}
		DockerRemoveImages()
		return nil
	}
}
func DockerRemoveImages() error {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		panic(err)
	}
	defer cli.Close()

	images, err := cli.ImageList(ctx, types.ImageListOptions{})
	if err != nil {
		panic(err)
	}

	for _, image := range images {
		//fmt.Printf("image: %v\n", image.RepoTags)
		if stringInSlice("<none>:<none>", image.RepoTags) {
			cli.ImageRemove(ctx, image.ID, types.ImageRemoveOptions{
				Force:         true,
				PruneChildren: true,
			})
		}
	}
	return nil
}
func DockerRemoveContainers(containers []string) error {
	if err := runDockerCompose(append([]string{"rm", "-s", "-v", "-f"}, containers...)); err != nil {
		return err
	} else {
		return nil
	}
}
func DockerBuildReactUI() error {
	if _, err := runDocker([]string{"exec", "mythic_react", "/bin/sh", "-c", "npm run react-build"}); err != nil {
		return err
	}
	return nil
}
func DockerSave(containers []string) error {
	if err := generateSavedImageFolder(); err != nil {
		return errors.New(fmt.Sprintf("[-] Failed to generate folder to save images: %v\n", err))
	} else if cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation()); err != nil {
		return errors.New(fmt.Sprintf("[-] Failed to connect to Docker: %v\n", err))
	} else {
		savedContainers := containers
		if len(savedContainers) == 0 {
			if diskAgents, err := getElementsOnDisk(); err != nil {
				return errors.New(fmt.Sprintf("[-] Failed to get agents on disk: %v\n", err))
			} else if currentMythicServices, err := GetCurrentMythicServiceNames(); err != nil {
				return errors.New(fmt.Sprintf("[-] Failed to get mythic service list: %v\n", err))
			} else {
				savedContainers = append([]string{}, diskAgents...)
				savedContainers = append(savedContainers, currentMythicServices...)
			}
		}
		savedImagePath := filepath.Join(getCwdFromExe(), "saved_images", "mythic_save.tar")
		finalSavedContainers := []string{}
		for i, _ := range savedContainers {
			if imageExists(savedContainers[i]) {
				containerName := fmt.Sprintf("%s:latest", savedContainers[i])
				finalSavedContainers = append(finalSavedContainers, containerName)
			} else {
				fmt.Printf("[-] No image locally for %s\n", savedContainers[i])
			}
		}
		fmt.Printf("[*] Saving the following images:\n%v\n", finalSavedContainers)
		fmt.Printf("[*] This will take a while for Docker to compress and generate the layers...\n")
		if ioReadCloser, err := cli.ImageSave(context.Background(), finalSavedContainers); err != nil {
			return errors.New(fmt.Sprintf("[-] Failed to get contents of docker image: %v\n", err))
		} else if outFile, err := os.Create(savedImagePath); err != nil {
			return errors.New(fmt.Sprintf("[-] Failed to create output file: %v\n", err))
		} else {
			defer outFile.Close()
			fmt.Printf("[*] Saving to %s\nThis will take a while...\n", savedImagePath)
			if _, err = io.Copy(outFile, ioReadCloser); err != nil {
				return errors.New(fmt.Sprintf("[-] Failed to write contents to file: %v\n", err))
			}
		}
		return nil
	}
}
func DockerLoad() error {
	savedImagePath := filepath.Join(getCwdFromExe(), "saved_images", "mythic_save.tar")
	if cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation()); err != nil {
		return errors.New(fmt.Sprintf("[-] Failed to connect to Docker: %v\n", err))
	} else if ioReadCloser, err := os.OpenFile(savedImagePath, os.O_RDONLY, 0x600); err != nil {
		return errors.New(fmt.Sprintf("[-] Failed to read tar file: %v\n", err))
	} else if _, err := cli.ImageLoad(context.Background(), ioReadCloser, false); err != nil {
		return errors.New(fmt.Sprintf("[-] Failed to load image into Docker: %v\n", err))
	} else {
		fmt.Printf("[+] loaded docker images!\n")
		return nil
	}
}
func DockerHealth(containers []string) {
	for _, container := range containers {
		outputString, err := runDocker([]string{"inspect", "--format", "{{json .State.Health }}", container})
		if err != nil {
			fmt.Printf("failed to check status: %s", err.Error())
		} else {
			fmt.Printf("%s:\n%s\n\n", container, outputString)
		}
	}
}
