package rabbitmq

import (
	"github.com/its-a-feature/Mythic/logging"
	"golang.org/x/mod/semver"
)

// validContainerVersionMax container's version must be strictly less than this value
const validContainerVersionMax = "v1.4"

func isValidContainerVersion(version string) bool {
	if semver.IsValid(validContainerVersionMax) {
		if semver.IsValid(version) {
			if semver.Compare(version, validContainerVersionMax) < 0 {
				return true
			} else {
				logging.LogError(nil, "attempt to sync a container out of bounds", "version", version)
			}
		} else {
			logging.LogError(nil, "attempt to sync invalid container version", "version", version)
		}
	} else {
		logging.LogError(nil, "internal container version is not valid, can't sync", "version", validContainerVersionMax)
	}
	return false
}
