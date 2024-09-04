package internal

import (
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/manager"
	"github.com/MythicMeta/Mythic_CLI/cmd/utils"
	"log"
	"slices"
)

// ServiceStart is entrypoint from commands to start containers
func ServiceStart(containers []string, keepVolume bool) error {
	// first stop all the containers or the ones specified
	_ = manager.GetManager().StopServices(containers, config.GetMythicEnv().GetBool("REBUILD_ON_START"), keepVolume)

	// get all the services on disk and in docker-compose currently
	diskAgents, err := manager.GetManager().GetInstalled3rdPartyServicesOnDisk()
	if err != nil {
		return err
	}
	dockerComposeContainers, err := manager.GetManager().GetAllInstalled3rdPartyServiceNames()
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
			_ = manager.GetManager().RemoveServices([]string{val}, keepVolume)
		}
	}
	for _, val := range intendedMythicServices {
		AddMythicService(val, !keepVolume)
	}
	// if the user didn't explicitly call out starting certain containers, then do all of them
	if len(containers) == 0 {
		containers = append(dockerComposeContainers, intendedMythicServices...)
		// make sure the ports are open that we're going to need
		TestPorts()
	}
	finalContainers := []string{}
	for _, val := range containers { // these are specified containers or all in docker compose
		if !utils.StringInSlice(val, dockerComposeContainers) && !utils.StringInSlice(val, config.MythicPossibleServices) {
			if utils.StringInSlice(val, diskAgents) {
				// the agent mentioned isn't in docker-compose, but is on disk, ask to add
				add := config.AskConfirm(fmt.Sprintf("\n%s isn't in docker-compose, but is on disk. Would you like to add it? ", val))
				if add {
					finalContainers = append(finalContainers, val)
					Add3rdPartyService(val, map[string]interface{}{}, !keepVolume)
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
	// make sure we always update the config when starting in case .env variables changed\
	for _, service := range finalContainers {
		if utils.StringInSlice(service, config.MythicPossibleServices) {
			AddMythicService(service, !keepVolume)
		} else {
			Add3rdPartyService(service, map[string]interface{}{}, !keepVolume)
		}
	}
	manager.GetManager().TestPorts(finalContainers)
	err = manager.GetManager().StartServices(finalContainers, config.GetMythicEnv().GetBool("REBUILD_ON_START"))
	if err != nil {
		log.Printf("[-] Failed to start services: %v", err)
		return err
	}
	err = manager.GetManager().RemoveImages()
	if err != nil {
		log.Printf("[-] Failed to remove images\n%v\n", err)
		return err
	}
	updateNginxBlockLists()
	generateCerts()
	TestMythicRabbitmqConnection()
	TestMythicConnection()
	Status(false)
	return nil
}
func ServiceStop(containers []string, keepVolume bool) error {
	return manager.GetManager().StopServices(containers, config.GetMythicEnv().GetBool("REBUILD_ON_START"), keepVolume)
}
func ServiceBuild(containers []string, keepVolume bool) error {
	composeServices, err := manager.GetManager().GetAllInstalled3rdPartyServiceNames()
	if err != nil {
		log.Fatalf("[-] Failed to get installed service list: %v", err)
	}
	for _, container := range containers {
		if utils.StringInSlice(container, config.MythicPossibleServices) {
			// update the necessary docker compose entries for mythic services
			AddMythicService(container, !keepVolume)
		} else if utils.StringInSlice(container, composeServices) {
			err = Add3rdPartyService(container, map[string]interface{}{}, !keepVolume)
			if err != nil {
				log.Printf("[-] Failed to add 3rd party service: %v", err)
				return err
			}
		}
	}
	err = manager.GetManager().BuildServices(containers, keepVolume)
	if err != nil {
		return err
	}
	if slices.Contains(containers, "mythic_nginx") {
		updateNginxBlockLists()
		err = generateCerts()
		if err != nil {
			log.Printf("[-] Failed to generate certs: %v", err)
			return err
		}
		err = ServiceStart([]string{"mythic_nginx"}, keepVolume)
		if err != nil {
			log.Printf("[-] Failed to start services: %v", err)
			return err
		}
	}

	return nil
}
func ServiceRemoveContainers(containers []string) error {
	return manager.GetManager().RemoveContainers(containers, false)
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
		return manager.GetManager().BuildUI()
	}
	log.Fatalf("[-] Not using MYTHIC_REACT_DEBUG to generate new UI, aborting...\n")
	return nil
}

// Docker Volume commands

func VolumesList() {
	manager.GetManager().PrintVolumeInformation()
}
func DockerRemoveVolume(volumeName string) error {
	return manager.GetManager().RemoveVolume(volumeName)
}

func DockerCopyIntoVolume(containerName string, sourceFile string, destinationFileName string, destinationVolume string) {
	err := manager.GetManager().CopyIntoVolume(containerName, sourceFile, destinationFileName, destinationVolume)
	if err != nil {
		log.Printf("[-] Failed to copy into volume: %v", err)
		return
	}
}
func DockerCopyFromVolume(containerName string, sourceVolumeName string, sourceFileName string, destinationName string) {
	err := manager.GetManager().CopyFromVolume(containerName, sourceVolumeName, sourceFileName, destinationName)
	if err != nil {
		log.Printf("[-] Failed to copy from volume: %v", err)
		return
	}
}
