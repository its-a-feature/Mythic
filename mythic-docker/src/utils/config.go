package utils

import (
	"errors"
	"log"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/spf13/viper"
)

const mythicServerVersion = "3.3.1-rc79"

type Config struct {
	// server configuration
	AdminUser                           string
	AdminPassword                       string
	DefaultOperationName                string
	DefaultOperationWebhook             string
	DefaultOperationChannel             string
	AllowedIPBlocks                     []*net.IPNet
	DebugAgentMessage                   bool
	DebugLevel                          string
	ServerPort                          uint
	ServerBindLocalhostOnly             bool
	ServerDynamicPorts                  []uint32
	ServerDynamicPortsBindLocalhostOnly bool
	ServerDockerNetworking              string
	ServerGRPCPort                      uint
	GlobalServerName                    string
	MythicServerAllowInviteLinks        bool
	ServerVersion                       string

	// rabbitmq configuration
	RabbitmqHost     string
	RabbitmqPort     uint
	RabbitmqUser     string
	RabbitmqPassword string
	RabbitmqVHost    string

	// postgres configuration
	PostgresHost     string
	PostgresPort     uint
	PostgresDB       string
	PostgresUser     string
	PostgresPassword string

	// jwt configuration
	JWTSecret []byte
}

var (
	MythicConfig = Config{}
)

func Initialize() {
	mythicEnv := viper.New()
	// mythic config
	mythicEnv.SetDefault("mythic_debug_agent_message", false)
	mythicEnv.SetDefault("mythic_server_port", 17443)
	mythicEnv.SetDefault("mythic_server_bind_localhost_only", true)
	mythicEnv.SetDefault("mythic_server_dynamic_ports", "7000-7010")
	mythicEnv.SetDefault("mythic_server_dynamic_ports_bind_localhost_only", true)
	mythicEnv.SetDefault("mythic_docker_networking", "bridge")
	mythicEnv.SetDefault("mythic_server_grpc_port", 17444)
	mythicEnv.SetDefault("mythic_admin_user", "mythic_admin")
	mythicEnv.SetDefault("mythic_admin_password", "mythic_password")
	mythicEnv.SetDefault("allowed_ip_blocks", "0.0.0.0/0")
	mythicEnv.SetDefault("debug_level", "warning")
	mythicEnv.SetDefault("mythic_server_allow_invite_links", "false")
	// postgres configuration
	mythicEnv.SetDefault("postgres_host", "mythic_postgres")
	mythicEnv.SetDefault("postgres_port", 5432)
	mythicEnv.SetDefault("postgres_db", "mythic_db")
	mythicEnv.SetDefault("postgres_user", "mythic_user")
	mythicEnv.SetDefault("postgres_password", "")
	// rabbitmq configuration
	mythicEnv.SetDefault("rabbitmq_host", "mythic_rabbitmq")
	mythicEnv.SetDefault("rabbitmq_port", 5672)
	mythicEnv.SetDefault("rabbitmq_user", "mythic_user")
	mythicEnv.SetDefault("rabbitmq_password", "")
	mythicEnv.SetDefault("rabbitmq_vhost", "mythic_vhost")
	// jwt configuration
	mythicEnv.SetDefault("jwt_secret", "")
	// default operation configuration
	mythicEnv.SetDefault("default_operation_name", "Operation Chimera")
	mythicEnv.SetDefault("default_operation_webhook_url", "")
	mythicEnv.SetDefault("default_operation_webhook_channel", "")
	mythicEnv.SetDefault("global_server_name", "mythic")
	// pull in environment variables and configuration from .env if needed
	mythicEnv.SetConfigName(".env")
	mythicEnv.SetConfigType("env")
	mythicEnv.AddConfigPath(getCwdFromExe())
	mythicEnv.AutomaticEnv()
	if !fileExists(filepath.Join(getCwdFromExe(), ".env")) {
		_, err := os.Create(filepath.Join(getCwdFromExe(), ".env"))
		if err != nil {
			log.Fatalf("[-] .env doesn't exist and couldn't be created: %v", err)
		}
	}
	if err := mythicEnv.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Fatalf("[-] Error while reading in .env file: %v", err)
		} else {
			log.Fatalf("[-]Error while parsing .env file: %v", err)
		}
	}
	setConfigFromEnv(mythicEnv)
}

func setConfigFromEnv(mythicEnv *viper.Viper) {
	// mythic server configuration
	MythicConfig.ServerVersion = mythicServerVersion
	MythicConfig.DebugAgentMessage = mythicEnv.GetBool("mythic_debug_agent_message")
	MythicConfig.ServerPort = mythicEnv.GetUint("mythic_server_port")
	MythicConfig.ServerBindLocalhostOnly = mythicEnv.GetBool("mythic_server_bind_localhost_only")
	MythicConfig.ServerGRPCPort = mythicEnv.GetUint("mythic_server_grpc_port")
	dynamicPorts := mythicEnv.GetString("mythic_server_dynamic_ports")
	for _, port := range strings.Split(dynamicPorts, ",") {
		if strings.Contains(port, "-") {
			rangePieces := strings.Split(port, "-")
			if len(rangePieces) != 2 {
				log.Printf("[-] mythic_server_dynamic_ports value range was malformed: %s:%s\n", "port", port)
			} else {
				lowerRange, err := strconv.Atoi(rangePieces[0])
				if err != nil {
					log.Printf("[-] Failed to parse port for mythic_server_dynamic_ports: %v\n", err)
					continue
				}
				upperRange, err := strconv.Atoi(rangePieces[1])
				if err != nil {
					log.Printf("[-] Failed to parse port for mythic_server_dynamic_ports: %v\n", err)
					continue
				}
				if lowerRange > upperRange {
					log.Printf("[-] lower range port for mythic_server_dynamic_ports is higher than upper range: %s\n", port)
					continue
				}
				for i := lowerRange; i <= upperRange; i++ {
					MythicConfig.ServerDynamicPorts = append(MythicConfig.ServerDynamicPorts, uint32(i))
				}
			}
		} else {
			intPort, err := strconv.Atoi(port)
			if err == nil {
				MythicConfig.ServerDynamicPorts = append(MythicConfig.ServerDynamicPorts, uint32(intPort))
			} else {
				log.Printf("[-] Failed to parse port for mythic_server_dynamic_ports: %v - %v\n", port, err)
			}

		}
	}
	MythicConfig.ServerDynamicPortsBindLocalhostOnly = mythicEnv.GetBool("mythic_server_dynamic_ports_bind_localhost_only")
	MythicConfig.ServerDockerNetworking = mythicEnv.GetString("mythic_docker_networking")
	MythicConfig.AdminUser = mythicEnv.GetString("mythic_admin_user")
	MythicConfig.AdminPassword = mythicEnv.GetString("mythic_admin_password")
	MythicConfig.DefaultOperationName = mythicEnv.GetString("default_operation_name")
	MythicConfig.DefaultOperationWebhook = mythicEnv.GetString("default_operation_webhook_url")
	MythicConfig.DefaultOperationChannel = mythicEnv.GetString("default_operation_webhook_channel")
	MythicConfig.GlobalServerName = mythicEnv.GetString("global_server_name")
	MythicConfig.MythicServerAllowInviteLinks = mythicEnv.GetBool("mythic_server_allow_invite_links")
	allowedIPBlocks := []*net.IPNet{}
	for _, ipBlock := range strings.Split(mythicEnv.GetString("allowed_ip_blocks"), ",") {
		if _, subnet, err := net.ParseCIDR(ipBlock); err != nil {
			log.Printf("[-] Failed to parse CIDR block: %s\n", ipBlock)
		} else {
			allowedIPBlocks = append(allowedIPBlocks, subnet)
		}
	}
	MythicConfig.AllowedIPBlocks = allowedIPBlocks
	MythicConfig.DebugLevel = mythicEnv.GetString("debug_level")
	// postgres configuration
	MythicConfig.PostgresHost = mythicEnv.GetString("postgres_host")
	MythicConfig.PostgresPort = mythicEnv.GetUint("postgres_port")
	MythicConfig.PostgresDB = mythicEnv.GetString("postgres_db")
	MythicConfig.PostgresUser = mythicEnv.GetString("postgres_user")
	MythicConfig.PostgresPassword = mythicEnv.GetString("postgres_password")
	// rabbitmq configuration
	MythicConfig.RabbitmqHost = mythicEnv.GetString("rabbitmq_host")
	MythicConfig.RabbitmqPort = mythicEnv.GetUint("rabbitmq_port")
	MythicConfig.RabbitmqUser = mythicEnv.GetString("rabbitmq_user")
	MythicConfig.RabbitmqPassword = mythicEnv.GetString("rabbitmq_password")
	MythicConfig.RabbitmqVHost = mythicEnv.GetString("rabbitmq_vhost")
	// jwt configuration
	MythicConfig.JWTSecret = []byte(mythicEnv.GetString("jwt_secret"))
}

func getCwdFromExe() string {
	exe, err := os.Executable()
	if err != nil {
		log.Fatalf("[-] Failed to get path to current executable: %v", err)
	}
	return filepath.Dir(exe)
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return false
		}
	}
	return !info.IsDir()
}

func SetConfigValue(configKey string, configValue interface{}) error {
	switch configKey {
	case "MYTHIC_DEBUG_AGENT_MESSAGE":
		MythicConfig.DebugAgentMessage = configValue.(bool)
	case "MYTHIC_SERVER_ALLOW_INVITE_LINKS":
		MythicConfig.MythicServerAllowInviteLinks = configValue.(bool)
	case "MYTHIC_GLOBAL_SERVER_NAME":
		MythicConfig.GlobalServerName = configValue.(string)
	default:
		return errors.New("unknown configKey to update")
	}
	return nil
}

func GetGlobalConfig() map[string]interface{} {
	return map[string]interface{}{
		"MYTHIC_DEBUG_AGENT_MESSAGE":       MythicConfig.DebugAgentMessage,
		"MYTHIC_SERVER_ALLOW_INVITE_LINKS": MythicConfig.MythicServerAllowInviteLinks,
		"MYTHIC_GLOBAL_SERVER_NAME":        MythicConfig.GlobalServerName,
		"MYTHIC_SERVER_VERSION":            MythicConfig.ServerVersion,
	}
}
