package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"os"

	"./pkg/servers"
)

var cf *os.File
func main() {
	cf, err := os.Open("config.json")

	if err != nil {
		log.Println("Error opening config file ", err.Error())
		os.Exit(-1)
	}

	config, _ := ioutil.ReadAll(cf)

	c2config := servers.C2Config{}
	err = json.Unmarshal(config, &c2config)
	if err != nil {
		log.Println("Error in unmarshal call for config ", err.Error())
		os.Exit(-1)
	}

	// start the server instance with the config
	c2server := servers.NewInstance().(servers.Server)

	c2server.Run(c2config)

}
