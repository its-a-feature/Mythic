package manager

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/utils"
	"log"
	"path/filepath"
)

type CLIManager interface {
	// GetManagerName returns the human understandable name of the manager that's being used
	GetManagerName() string
	// IsServiceRunning checks if a service by the specified name is currently running or not
	IsServiceRunning(service string) bool
	// CheckRequiredManagerVersion checks if the version of the management software installed is a valid version or not
	CheckRequiredManagerVersion() bool
	// GenerateRequiredConfig creates any necessary base configuration files needed by the manager, like a docker-compose.yml file
	GenerateRequiredConfig()
	// DoesImageExist check if a local image exists for the service or if it needs to be built first
	DoesImageExist(service string) bool
	// RemoveImages deletes unused images from the system to help free up space
	RemoveImages() error
	// SaveImages saves off the backing built images for the specified services
	SaveImages(services []string, outputPath string) error
	// LoadImages loads the images specified at the outputPath
	LoadImages(outputPath string) error
	// RemoveContainers stop existing containers and removes them completely
	RemoveContainers(services []string, keepVolume bool) error
	// GetVolumes returns a map of volumes and their configurations specified to be used (not necessarily what's actually created)
	GetVolumes() (map[string]interface{}, error)
	// SetVolumes updates the information about volumes that should be expected to exist or tracked
	SetVolumes(map[string]interface{})
	// GetServiceConfiguration gets the current configuration for a Mythic or 3rd party service
	GetServiceConfiguration(string) (map[string]interface{}, error)
	// SetServiceConfiguration sets the specified configuration for a Mythic or specified 3rd party service
	SetServiceConfiguration(string, map[string]interface{}) error
	// StopServices should stop the listed services from running
	StopServices(services []string, deleteImages bool, keepVolume bool) error
	// RemoveServices should stop and remove services from the configuration so that they aren't started again
	RemoveServices(services []string, keepVolume bool) error
	// StartServices should build images if needed and start the associated containers
	StartServices(services []string, rebuildOnStart bool) error
	// BuildServices should re-build specific images and start those new containers
	BuildServices(services []string, keepVolume bool) error
	// GetInstalled3rdPartyServicesOnDisk returns the names of the installed services on disk
	GetInstalled3rdPartyServicesOnDisk() ([]string, error)
	// GetAllExistingNonMythicServiceNames reads current configuration and returns all non-mythic services
	GetAllInstalled3rdPartyServiceNames() ([]string, error)
	// GetCurrentMythicServiceNames reads current configuration and returns all mythic services
	GetCurrentMythicServiceNames() ([]string, error)
	// GetPathTo3rdPartyServicesOnDisk returns the path where a 3rd party services Dockerfile lives on disk
	GetPathTo3rdPartyServicesOnDisk() string
	// GetHealthCheck returns the output from the health checks of the specified services
	GetHealthCheck(services []string)
	// BuildUI a new instance of the Mythic React UI and save it in the mythic-react-docker folder
	BuildUI() error
	// GetLogs fetches logCount of the most recent logs from the service container
	GetLogs(service string, logCount int, follow bool)
	// TestPorts check to make sure all ports are available for services to use
	TestPorts(services []string)
	// PrintConnectionInfo lists out connection information for the various services (web endpoints, open ports, etc)
	PrintConnectionInfo()
	// Status prints out the current status of all the containers and volumes in use
	Status(verbose bool)
	// PrintAllServices prints out all the 3rd party services on disk and currently installed
	PrintAllServices()
	// ResetDatabase deletes the current database or volume
	ResetDatabase(useVolume bool)
	// ResetRabbitmq deletes the current rabbitmq storage or volume
	ResetRabbitmq(useVolume bool)
	// BackupDatabase saves a copy of the database to the specified path
	BackupDatabase(backupPath string, useVolume bool) error
	// RestoreDatabase restores a saved copy of the database from the specified path
	RestoreDatabase(backupPath string, useVolume bool) error
	// BackupFiles saves the files associated with Mythic's uploads/downloads to the specified path
	BackupFiles(backupPath string, useVolume bool) error
	// RestoreFiles restores a saved copy of Mythic's uploads/downloads from the specified path
	RestoreFiles(backupPath string, useVolume bool) error
	// PrintVolumeInformation prints out all the volumes in use by Mythic
	PrintVolumeInformation()
	// RemoveVolume removes the named volume
	RemoveVolume(volumeName string) error
	// CopyIntoVolume copies from a source io.Reader to the destination filename on the destination volume
	CopyIntoVolume(containerName string, sourceFile string, destinationFileName string, destinationVolume string) error
	// CopyFromVolume copies from the source filename in the volume to the destination filename outside of the volume
	CopyFromVolume(containerName string, sourceVolumeName string, sourceFileName string, destinationName string) error
}

var currentManager CLIManager

func Initialize() {
	envManager := config.GetMythicEnv().GetString("global_manager")
	switch envManager {
	case "docker":
		currentManager = &DockerComposeManager{
			InstalledServicesPath:   "InstalledServices",
			InstalledServicesFolder: filepath.Join(utils.GetCwdFromExe(), "InstalledServices"),
		}
	default:
		log.Fatalf("[-] Unknown manger specified in .env for global_manager")
	}

}
func GetManager() CLIManager {
	return currentManager
}
