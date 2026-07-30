package rabbitmq

import (
	"github.com/its-a-feature/Mythic/logging"
	"golang.org/x/mod/semver"
)

// validContainerVersionMax container's version must be strictly less than this value
const validContainerVersionMax = "v1.6.0"

// validContainerVersionMin container's version must be strictly greater than or equal to this value'
const validContainerVersionMin = "v1.5.0"

func isValidContainerVersion(version string) bool {
	if !semver.IsValid(version) {
		logging.LogError(nil, "attempt to sync invalid container version", "version", version)
		return false
	}
	if semver.Compare(version, validContainerVersionMax) >= 0 {
		logging.LogError(nil, "attempt to sync a container version that's too great", "version", version, "max", validContainerVersionMax)
		return false
	}
	if semver.Compare(version, validContainerVersionMin) < 0 {
		logging.LogError(nil, "attempt to sync a container version that's too old", "version", version, "min", validContainerVersionMin)
		return false
	}
	return true
}
