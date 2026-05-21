package rabbitmq

import "github.com/its-a-feature/Mythic/logging"

type ExportFunctionMessage struct {
	TreeType         string `json:"tree_type"`
	ContainerName    string `json:"container_name"`
	Host             string `json:"host"`
	Path             string `json:"path"`
	OperationID      int    `json:"operation_id"`
	OperatorID       int    `json:"operator_id"`
	OperatorUsername string `json:"operator_username"`
	CallbackGroup    string `json:"callback_group"`
}
type ExportFunctionMessageResponse struct {
	Success           bool   `json:"success"`
	Error             string `json:"error"`
	OperationID       int    `json:"operation_id"`
	CompletionMessage string `json:"completion_message"`
	TreeType          string `json:"tree_type"`
}

func (r *rabbitMQConnection) SendCbExportFunction(msg ExportFunctionMessage, authContext RabbitMQAuthContext) error {
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context")
		return err
	}
	err = r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetCustomBrowserExportFunctionRoutingKey(msg.ContainerName),
		"",
		msg,
		false,
		headers,
	)
	return err
}
