package rabbitmq

import (
	"sync"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

var chatContainerCache = make(map[int]*databaseStructs.ConsumingContainer)
var chatContainerCacheLock sync.RWMutex

// GetChatContainer gets all chat container context
func GetChatContainer(containerID int) (databaseStructs.ConsumingContainer, error) {
	chatContainerCacheLock.RLock()
	container, ok := chatContainerCache[containerID]
	chatContainerCacheLock.RUnlock()
	if ok {
		return *container, nil
	}
	container = &databaseStructs.ConsumingContainer{}
	err := database.DB.Get(container, `SELECT *
		FROM consuming_container
		WHERE id=$1 AND type=$2 AND deleted=false`, containerID, CONSUMING_SERVICES_TYPE_CHAT)
	if err != nil {
		return databaseStructs.ConsumingContainer{}, err
	}
	chatContainerCacheLock.Lock()
	chatContainerCache[containerID] = container
	chatContainerCacheLock.Unlock()
	return *container, nil
}
func invalidateChatContainerCache(containerID int) {
	chatContainerCacheLock.Lock()
	delete(chatContainerCache, containerID)
	chatContainerCacheLock.Unlock()
}
