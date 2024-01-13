package manager

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/utils"
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
	RemoveContainers(services []string) error
	// GetVolumes returns a map of volumes and their configurations specified to be used (not necessarily what's actually created)
	GetVolumes() (map[string]interface{}, error)
	// SetVolumes updates the information about volumes that should be expected to exist or tracked
	SetVolumes(map[string]interface{})
	// GetServiceConfiguration gets the current configuration for a Mythic or 3rd party service
	GetServiceConfiguration(string) (map[string]interface{}, error)
	// SetServiceConfiguration sets the specified configuration for a Mythic or specified 3rd party service
	SetServiceConfiguration(string, map[string]interface{}) error
	// StopServices should stop the listed services from running
	StopServices(services []string, deleteImages bool) error
	// RemoveServices should stop and remove services from the configuration so that they aren't started again
	RemoveServices(services []string) error
	// StartServices should build images if needed and start the associated containers
	StartServices(services []string, rebuildOnStart bool) error
	// BuildServices should re-build specific images and start those new containers
	BuildServices(services []string) error
	// GetInstalled3rdPartyServicesOnDisk returns the names of the installed services on disk
	GetInstalled3rdPartyServicesOnDisk() ([]string, error)
	// GetAllExistingNonMythicServiceNames reads current configuration and returns all non-mythic services
	GetAllExistingNonMythicServiceNames() ([]string, error)
	// GetCurrentMythicServiceNames reads current configuration and returns all mythic services
	GetCurrentMythicServiceNames() ([]string, error)
	// GetPathTo3rdPartyServicesOnDisk returns the path where a 3rd party services Dockerfile lives on disk
	GetPathTo3rdPartyServicesOnDisk() string
	// GetHealthCheck returns the output from the health checks of the specified services
	GetHealthCheck(services []string)
	// BuildUI a new instance of the Mythic React UI and save it in the mythic-react-docker folder
	BuildUI() error
	// GetLogs fetches logCount of the most recent logs from the service container
	GetLogs(service string, logCount int)
	// TestPorts check to make sure all ports are available for services to use
	TestPorts()
}

var currentManager CLIManager

func init() {
	currentManager = &DockerComposeManager{
		InstalledServicesPath:   "InstalledServices",
		InstalledServicesFolder: filepath.Join(utils.GetCwdFromExe(), "InstalledServices"),
	}
}
func GetManager() CLIManager {
	return currentManager
}
