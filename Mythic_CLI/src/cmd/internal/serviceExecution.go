package internal

import (
	"context"
	"errors"
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/manager"
	"github.com/MythicMeta/Mythic_CLI/cmd/utils"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
	"io"
	"log"
	"os"
	"sort"
	"strconv"
	"strings"
	"text/tabwriter"
)

// ServiceStart is entrypoint from commands to start containers
func ServiceStart(containers []string) error {
	// first stop all the containers or the ones specified
	_ = manager.GetManager().StopServices(containers, config.GetMythicEnv().GetBool("REBUILD_ON_START"))

	// get all the services on disk and in docker-compose currently
	diskAgents, err := manager.GetManager().GetInstalled3rdPartyServicesOnDisk()
	if err != nil {
		return err
	}
	dockerComposeContainers, err := manager.GetManager().GetAllExistingNonMythicServiceNames()
	if err != nil {
		return err
	}
	intendedMythicServices, err := config.GetIntendedMythicServiceNames()
	if err != nil {
		return err
	}
	currentMythicServices, err := manager.GetManager().GetCurrentMythicServiceNames()
	if err != nil {
		return err
	}
	for _, val := range currentMythicServices {
		if utils.StringInSlice(val, intendedMythicServices) {
		} else {
			_ = manager.GetManager().RemoveServices([]string{val})
		}
	}
	for _, val := range intendedMythicServices {
		if utils.StringInSlice(val, currentMythicServices) {

		} else {
			AddMythicService(val)
		}
	}
	// if the user didn't explicitly call out starting certain containers, then do all of them
	if len(containers) == 0 {
		containers = append(dockerComposeContainers, intendedMythicServices...)
	}
	finalContainers := []string{}
	for _, val := range containers { // these are specified containers or all in docker compose
		if !utils.StringInSlice(val, dockerComposeContainers) && !utils.StringInSlice(val, config.MythicPossibleServices) {
			if utils.StringInSlice(val, diskAgents) {
				// the agent mentioned isn't in docker-compose, but is on disk, ask to add
				add := config.AskConfirm(fmt.Sprintf("\n%s isn't in docker-compose, but is on disk. Would you like to add it? ", val))
				if add {
					finalContainers = append(finalContainers, val)
					Add3rdPartyService(val, map[string]interface{}{})
				}
			} else {
				add := config.AskConfirm(fmt.Sprintf("\n%s isn't in docker-compose and is not on disk. Would you like to install it from https://github.com/? ", val))
				if add {
					finalContainers = append(finalContainers, val)
					installServiceByName(val)
				}
			}
		} else {
			finalContainers = append(finalContainers, val)
		}
	}
	for _, service := range finalContainers {
		if utils.StringInSlice(service, config.MythicPossibleServices) {
			AddMythicService(service)
		}
	}
	manager.GetManager().TestPorts()
	err = manager.GetManager().StartServices(finalContainers, config.GetMythicEnv().GetBool("REBUILD_ON_START"))
	err = manager.GetManager().RemoveImages()
	if err != nil {
		fmt.Printf("[-] Failed to remove images\n%v\n", err)
		return err
	}
	updateNginxBlockLists()
	generateCerts()
	TestMythicRabbitmqConnection()
	TestMythicConnection()
	Status(false)
	return nil
}
func ServiceStop(containers []string) error {
	return manager.GetManager().StopServices(containers, config.GetMythicEnv().GetBool("REBUILD_ON_START"))
}
func ServiceBuild(containers []string) error {
	for _, container := range containers {
		if utils.StringInSlice(container, config.MythicPossibleServices) {
			// update the necessary docker compose entries for mythic services
			AddMythicService(container)
		}
	}
	err := manager.GetManager().BuildServices(containers)
	if err != nil {
		return err
	}
	return nil
}
func ServiceRemoveContainers(containers []string) error {
	return manager.GetManager().RemoveContainers(containers)
}

// Docker Save / Load commands

func DockerSave(containers []string) error {
	return manager.GetManager().SaveImages(containers, "saved_images")
}
func DockerLoad() error {
	return manager.GetManager().LoadImages("saved_images")
}
func DockerHealth(containers []string) {
	manager.GetManager().GetHealthCheck(containers)
}

// Build new Docker UI

func DockerBuildReactUI() error {
	if config.GetMythicEnv().GetBool("MYTHIC_REACT_DEBUG") {
		err := manager.GetManager().BuildUI()
		if err != nil {
			log.Fatalf("[-] Failed to build new UI from debug build")
		}
	}
	log.Printf("[-] Not using MYTHIC_REACT_DEBUG to generate new UI, aborting...\n")
	return nil
}

// Docker Volume commands

func VolumesList() error {
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
		fmt.Printf("[-] Failed to get disk sizes: %v\n", err)
		os.Exit(1)
	}
	containers, err := cli.ContainerList(ctx, types.ContainerListOptions{Size: true})
	if err != nil {
		fmt.Printf("[-] Failed to get container list: %v\n", err)
		os.Exit(1)
	}
	if du.Volumes == nil {
		fmt.Printf("[-] No volumes known\n")
		return nil
	}
	var entries []string
	for _, currentVolume := range du.Volumes {
		name := currentVolume.Name
		size := "unknown"
		if currentVolume.UsageData != nil {
			size = utils.ByteCountSI(currentVolume.UsageData.Size)
		}
		if !strings.HasPrefix(currentVolume.Name, "mythic_") {
			continue
		}
		containerPieces := strings.Split(currentVolume.Name, "_")
		containerName := strings.Join(containerPieces[0:2], "_")
		container := "unused (0)"
		containerStatus := "offline"
		for _, c := range containers {
			if c.Image == containerName {
				containerStatus = c.Status
			}
			for _, m := range c.Mounts {
				if m.Name == currentVolume.Name {
					container = c.Image + " (" + strconv.Itoa(int(currentVolume.UsageData.RefCount)) + ")"
				}
			}
		}
		entries = append(entries, fmt.Sprintf("%s\t%s\t%s\t%s\t%s",
			name,
			size,
			container,
			containerStatus,
			currentVolume.Mountpoint,
		))
	}
	sort.Strings(entries)
	for _, line := range entries {
		fmt.Fprintln(w, line)
	}

	defer w.Flush()
	return nil
}
func DockerRemoveVolume(volumeName string) error {
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
			err = cli.VolumeRemove(ctx, currentVolume.Name, true)
			if err != nil {
				return err
			}
		}
	}
	return nil
}
func ensureVolume(volumeName string) error {
	containerNamePieces := strings.Split(volumeName, "_")
	containerName := strings.Join(containerNamePieces[0:2], "_")
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
	containers, err := cli.ContainerList(ctx, types.ContainerListOptions{Size: true})
	if err != nil {
		return err
	}
	for _, container := range containers {
		if container.Image == containerName {
			for _, mnt := range container.Mounts {
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
func DockerCopyIntoVolume(sourceFile io.Reader, destinationFileName string, destinationVolume string) {
	err := ensureVolume(destinationVolume)
	if err != nil {
		fmt.Printf("[-] Failed to ensure volume exists: %v\n", err)
		os.Exit(1)
	}
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		fmt.Printf("[-] Failed to connect to docker api: %v\n", err)
		os.Exit(1)
	}
	defer cli.Close()
	containers, err := cli.ContainerList(ctx, types.ContainerListOptions{Size: true})
	if err != nil {
		fmt.Printf("[-] Failed to get container list: %v\n", err)
		os.Exit(1)
	}
	for _, container := range containers {
		for _, mnt := range container.Mounts {
			if mnt.Name == destinationVolume {
				err = cli.CopyToContainer(ctx, container.ID, mnt.Destination+"/"+destinationFileName, sourceFile, types.CopyToContainerOptions{
					CopyUIDGID: true,
				})
				if err != nil {
					fmt.Printf("[-] Failed to write file: %v\n", err)
					os.Exit(1)
				} else {
					fmt.Printf("[+] Successfully wrote file\n")
				}
				return
			}
		}
	}
	fmt.Printf("[-] Failed to find that volume name in use by any containers")
	os.Exit(1)
}
func DockerCopyFromVolume(sourceVolumeName string, sourceFileName string, destinationName string) {
	err := ensureVolume(sourceVolumeName)
	if err != nil {
		fmt.Printf("[-] Failed to ensure volume exists: %v\n", err)
		os.Exit(1)
	}
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		fmt.Printf("[-] Failed to connect to docker api: %v\n", err)
		os.Exit(1)
	}
	defer cli.Close()
	containers, err := cli.ContainerList(ctx, types.ContainerListOptions{Size: true})
	if err != nil {
		fmt.Printf("[-] Failed to get container list: %v\n", err)
		os.Exit(1)
	}
	for _, container := range containers {
		for _, mnt := range container.Mounts {
			if mnt.Name == sourceVolumeName {
				reader, _, err := cli.CopyFromContainer(ctx, container.ID, mnt.Destination+"/"+sourceFileName)
				if err != nil {
					fmt.Printf("[-] Failed to read file: %v\n", err)
					return
				}
				destination, err := os.Create(destinationName)
				if err != nil {
					fmt.Printf("[-] Failed to open destination filename: %v\n", err)
					return
				}
				defer destination.Close()
				_, err = io.Copy(destination, reader)
				if err != nil {
					fmt.Printf("[-] Failed to get file from volume: %v\n", err)
					return
				}
				fmt.Printf("[+] Successfully wrote file\n")
				return
			}
		}
	}
	fmt.Printf("[-] Failed to find that volume name in use by any containers")
	os.Exit(1)
}
