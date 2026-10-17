package rabbitmq

import (
	"fmt"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

// sendConsumingContainerTopicMessage publishes one principal-scoped copy per subscriber.
func (r *rabbitMQConnection) sendConsumingContainerTopicMessage(containerType, subscription, baseRoutingKey string, body interface{}) error {
	containers := []databaseStructs.ConsumingContainer{}
	if err := database.DB.Select(&containers, `SELECT * FROM consuming_container WHERE type=$1 AND deleted=false`, containerType); err != nil {
		return err
	}
	var firstErr error
	for _, container := range containers {
		subscribed := false
		for _, value := range container.Subscriptions.StructValue() {
			if fmt.Sprint(value) == subscription {
				subscribed = true
				break
			}
		}
		if !subscribed {
			continue
		}
		routingKey := fmt.Sprintf("%s.%s", container.Name, baseRoutingKey)
		if err := r.SendStructMessage(MYTHIC_TOPIC_EXCHANGE, routingKey, "", body, true, nil); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}
