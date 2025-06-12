package rabbitmq

import (
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/grpc"
)

type ServiceHealth struct {
	DatabaseSuccess          bool            `json:"database_success,omitempty"`
	DatabaseErrorMessage     string          `json:"database_error_message,omitempty"`
	RabbitmqSuccess          bool            `json:"rabbitmq_success,omitempty"`
	RabbitmqErrorMessage     string          `json:"rabbitmq_error_message"`
	InstalledServicesSuccess map[string]bool `json:"installed_services_success,omitempty"`
	GRPCSuccess              bool            `json:"grpc_success,omitempty"`
	GRPCErrorMessage         string          `json:"grpc_error_message"`
}

func HealthCheck(detailed bool) ServiceHealth {
	// check connectivity to the database
	// check connectivity to rabbitmq
	// check installed services health (online or not and installed)
	// check grpc is running
	result := ServiceHealth{}
	err := database.DB.Ping()
	if err != nil {
		result.DatabaseErrorMessage = err.Error()
		return result
	}
	result.DatabaseSuccess = true
	if detailed {
		payloadTypes := []databaseStructs.Payloadtype{}
		c2Profiles := []databaseStructs.C2profile{}
		translationServices := []databaseStructs.Translationcontainer{}
		consumingServices := []databaseStructs.ConsumingContainer{}
		err = database.DB.Select(&payloadTypes, `SELECT
		"name", container_running
		FROM payloadtype
		WHERE deleted=false`)
		if err != nil {
			result.DatabaseErrorMessage = err.Error()
			return result
		}
		err = database.DB.Select(&c2Profiles, `SELECT
		"name", container_running
		FROM c2profile
		WHERE deleted=false`)
		if err != nil {
			result.DatabaseErrorMessage = err.Error()
			return result
		}
		err = database.DB.Select(&translationServices, `SELECT
		"name", container_running
		FROM translationcontainer
		WHERE deleted=false`)
		if err != nil {
			result.DatabaseErrorMessage = err.Error()
			return result
		}
		err = database.DB.Select(&consumingServices, `SELECT
    "name", container_running 
    FROM consuming_container
    WHERE deleted=false`)
		if err != nil {
			result.DatabaseErrorMessage = err.Error()
			return result
		}
		result.DatabaseSuccess = true
		result.InstalledServicesSuccess = make(map[string]bool)
		for _, pt := range payloadTypes {
			result.InstalledServicesSuccess[pt.Name] = pt.ContainerRunning
		}
		for _, c2 := range c2Profiles {
			result.InstalledServicesSuccess[c2.Name] = c2.ContainerRunning
		}
		for _, tr := range translationServices {
			result.InstalledServicesSuccess[tr.Name] = tr.ContainerRunning
		}
		for _, ct := range consumingServices {
			result.InstalledServicesSuccess[ct.Name] = ct.ContainerRunning
		}
	}

	result.GRPCSuccess, result.GRPCErrorMessage = grpc.TranslationContainerServer.CheckListening()
	rabbitmqSuccess, rabbitmqError := RabbitMQConnection.CheckConsumerExists(MYTHIC_EXCHANGE,
		PT_TASK_CREATE_TASKING_RESPONSE, false)
	if rabbitmqError != nil {
		result.RabbitmqErrorMessage = rabbitmqError.Error()
		result.RabbitmqSuccess = rabbitmqSuccess
	} else {
		result.RabbitmqSuccess = rabbitmqSuccess
	}
	return result
}
