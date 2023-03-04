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

func HealthCheck() ServiceHealth {
	// check connectivity to the database
	// check connectivity to rabbitmq
	// check installed services health (online or not and installed)
	// check grpc is running
	result := ServiceHealth{}
	payloadTypes := []databaseStructs.Payloadtype{}
	c2Profiles := []databaseStructs.C2profile{}
	translationServices := []databaseStructs.Translationcontainer{}
	if err := database.DB.Ping(); err != nil {
		result.DatabaseErrorMessage = err.Error()
		return result
	} else if err = database.DB.Select(&payloadTypes, `SELECT
		"name", container_running
		FROM payloadtype
		WHERE deleted=false`); err != nil {
		result.DatabaseErrorMessage = err.Error()
		return result
	} else if err = database.DB.Select(&c2Profiles, `SELECT
		"name", container_running
		FROM c2profile
		WHERE deleted=false`); err != nil {
		result.DatabaseErrorMessage = err.Error()
		return result
	} else if err = database.DB.Select(&translationServices, `SELECT
		"name", container_running
		FROM translationcontainer
		WHERE deleted=false`); err != nil {
		result.DatabaseErrorMessage = err.Error()
		return result
	} else {
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
		result.GRPCSuccess, result.GRPCErrorMessage = grpc.TranslationContainerServer.CheckListening()
		if rabbitmqSuccess, rabbitmqError := RabbitMQConnection.CheckConsumerExists(MYTHIC_EXCHANGE,
			PT_TASK_CREATE_TASKING_RESPONSE, false); rabbitmqError != nil {
			result.RabbitmqErrorMessage = rabbitmqError.Error()
			result.RabbitmqSuccess = rabbitmqSuccess
		} else {
			result.RabbitmqSuccess = rabbitmqSuccess
		}
		return result
	}
}
