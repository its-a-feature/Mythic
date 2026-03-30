package rabbitmq

import (
	"errors"
	"sync"

	"github.com/its-a-feature/Mythic/utils"
)

var containerAuthMap = make(map[string]string)
var containerAuthMapLock sync.RWMutex

func NewContainerAuth(containerName string) string {
	containerAuthMapLock.Lock()
	defer containerAuthMapLock.Unlock()
	if _, ok := containerAuthMap[containerName]; ok {
		return containerAuthMap[containerName]
	}
	containerAuthMap[containerName] = utils.GenerateRandomPassword(36)
	return containerAuthMap[containerName]
}

func GetContainerFromAuth(password string) (string, error) {
	containerAuthMapLock.RLock()
	defer containerAuthMapLock.RUnlock()
	for key, value := range containerAuthMap {
		if value == password {
			return key, nil
		}
	}
	return "", errors.New("container not found")
}
