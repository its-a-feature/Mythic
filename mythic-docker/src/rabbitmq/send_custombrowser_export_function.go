package rabbitmq

type ExportFunctionMessage struct {
	TreeType      string `json:"tree_type"`
	ContainerName string `json:"container_name"`
	Host          string `json:"host"`
	Path          string `json:"path"`
	OperationID   int    `json:"operation_id"`
}
type ExportFunctionMessageResponse struct {
	Success     bool   `json:"success"`
	Error       string `json:"error"`
	OperationID int    `json:"operation_id"`
}

func (r *rabbitMQConnection) SendCbExportFunction(msg ExportFunctionMessage) error {
	err := r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetCustomBrowserExportFunctionRoutingKey(msg.ContainerName),
		"",
		msg,
		false,
	)
	return err
}
