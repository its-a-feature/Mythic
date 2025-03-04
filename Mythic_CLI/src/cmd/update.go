package cmd

import (
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/MythicMeta/Mythic_CLI/cmd/manager"
	"github.com/spf13/cobra"
	"golang.org/x/mod/semver"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// configCmd represents the config command
var updateCmd = &cobra.Command{
	Use:   "update [branch name]",
	Short: "Check for Mythic updates",
	Long:  `Check for a Mythic update against a specific branch or against HEAD by default.`,
	Run:   updateCheck,
}
var agents []string
var allAgents bool
var installAgentUpdates bool

func init() {
	rootCmd.AddCommand(updateCmd)
	updateCmd.Flags().StringVarP(
		&branch,
		"branch",
		"b",
		"",
		`Check update status from a specific branch instead of HEAD`,
	)
	updateCmd.Flags().StringArrayVarP(
		&agents,
		"services",
		"s",
		nil,
		`Check for potential updates for specific installed services instead of Mythic`,
	)
	updateCmd.Flags().BoolVarP(
		&allAgents,
		"all-services",
		"a",
		false,
		`Check for potential updates for all installed services instead of Mythic`,
	)
	updateCmd.Flags().BoolVarP(
		&installAgentUpdates,
		"install-agent-updates",
		"i",
		false,
		`Force install updates for installed services if they exist`,
	)
}

func updateCheck(cmd *cobra.Command, args []string) {
	var tr = &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	var client = &http.Client{
		Timeout:   5 * time.Second,
		Transport: tr,
	}
	if agents == nil && !allAgents {
		urlBase := "https://raw.githubusercontent.com/its-a-feature/Mythic/"

		targetURL := urlBase + "master"
		if len(args) == 1 {
			branch = args[0]
		}
		if len(branch) > 0 {
			targetURL = urlBase + branch
		}

		_, err := checkMythicVersion(client, targetURL)
		if err != nil {
			log.Fatalf("Failed to check mythic version: %v", err)
		}
		_, err = checkUIVersion(client, targetURL)
		if err != nil {
			log.Fatalf("Failed to check UI version: %v", err)
		}
		_, err = checkCLIVersion(client, targetURL)
		if err != nil {
			log.Fatalf("Failed to check cli version: %v", err)
		}
		return
	}
	err := checkAgentVersions(agents, allAgents)
	if err != nil {
		log.Fatalf("Failed to check agent versions: %v", err)
	}
}
func checkMythicVersion(client *http.Client, urlBase string) (needsUpdate bool, err error) {
	targetURL := urlBase + "/VERSION"
	if req, err := http.NewRequest("GET", targetURL, nil); err != nil {
		log.Printf("[!] Failed to make new request: %v\n", err)
		return false, err
	} else if resp, err := client.Do(req); err != nil {
		log.Printf("[!] Error client.Do: %v\n", err)
		return false, err
	} else if resp.StatusCode != 200 {
		log.Printf("[!] Error resp.StatusCode: %v\n", resp.StatusCode)
		return false, err
	} else {
		defer resp.Body.Close()
		if body, err := io.ReadAll(resp.Body); err != nil {
			log.Printf("[!] Failed to read file contents: %v\n", err)
			return false, err
		} else if fileContents, err := os.ReadFile("VERSION"); err != nil {
			log.Printf("[!] Failed to get Mythic version: %v\n", err)
			return false, err
		} else {
			remoteVersion := "v" + string(body)
			localVersion := "v" + string(fileContents)
			versionComparison := semver.Compare(localVersion, remoteVersion)
			log.Printf("[*] Mythic Local Version:  %s\n", localVersion)
			log.Printf("[*] Mythic Remote Version: %s\n", remoteVersion)
			if !semver.IsValid(localVersion) {
				log.Printf("[-] Local version isn't valid\n")
				return false, errors.New("Local version isn't valid\n")
			} else if !semver.IsValid(remoteVersion) {
				log.Printf("[-] Remote version isn't valid\n")
				return false, errors.New("Remote version isn't valid\n")
			} else if versionComparison == 0 {
				log.Printf("[+] Mythic is up to date!\n")
				return false, nil
			} else if versionComparison < 0 {
				log.Printf("[+] Mythic update available!\n")
				if semver.Major(localVersion) != semver.Major(remoteVersion) {
					log.Printf("[!] Major version update available. This means a major update in how Mythic operates\n")
					log.Printf("This will require a completely new clone of Mythic\n")
				} else if semver.MajorMinor(localVersion) != semver.MajorMinor(remoteVersion) {
					log.Printf("[!] Minor version update available. This means there has been some database updates, but not a major change to how Mythic operates.\n")
					log.Printf("This will require doing a 'git pull' and making a new 'mythic-cli' via 'sudo make'. Then restart Mythic\n")
				} else {
					log.Printf("[+] A patch is available. This means no database schema has changed and only bug fixes applied. This is safe to update now.\n")
					log.Printf("This will require doing a 'git pull' and making a new 'mythic-cli' via 'sudo make'. Then restart Mythic\n")
				}
				return true, nil
			} else {
				log.Printf("[+] Local version is ahead of remote!\n")
				return false, nil
			}
		}
	}
}
func checkUIVersion(client *http.Client, urlBase string) (needsUpdate bool, err error) {
	targetURL := urlBase + "/MythicReactUI/src/index.js"
	if req, err := http.NewRequest("GET", targetURL, nil); err != nil {
		log.Printf("[!] Failed to make new request: %v\n", err)
		return false, err
	} else if resp, err := client.Do(req); err != nil {
		log.Printf("[!] Error client.Do: %v\n", err)
		return false, err
	} else if resp.StatusCode != 200 {
		log.Printf("[!] Error trying to fetch UI version resp.StatusCode: %v\n", resp.StatusCode)
		return false, err
	} else {
		defer resp.Body.Close()
		if body, err := io.ReadAll(resp.Body); err != nil {
			log.Printf("[!] Failed to read file contents: %v\n", err)
			return false, err
		} else if fileContents, err := os.ReadFile(filepath.Join(".", "MythicReactUI", "src", "index.js")); err != nil {
			log.Printf("[!] Failed to get MythicReactUI version: %v\n", err)
			return false, err
		} else {
			remoteVersion := "v" + getUIVersionFromFileContents(string(body))
			localVersion := "v" + string(getUIVersionFromFileContents(string(fileContents)))
			versionComparison := semver.Compare(localVersion, remoteVersion)
			log.Printf("[*] UI Local Version:  %s\n", localVersion)
			log.Printf("[*] UI Remote Version: %s\n", remoteVersion)
			if !semver.IsValid(localVersion) {
				log.Printf("[-] Local version isn't valid\n")
				return false, errors.New("Local version isn't valid\n")
			} else if !semver.IsValid(remoteVersion) {
				log.Printf("[-] Remote version isn't valid\n")
				return false, errors.New("Remote version isn't valid\n")
			} else if versionComparison == 0 {
				log.Printf("[+] Your UI is up to date!\n")
				return false, nil
			} else if versionComparison < 0 {
				log.Printf("[+] UI update available! This is safe to update now.\n")
				return true, nil
			} else {
				log.Printf("[+] Local version is ahead of remote!\n")
				return false, nil
			}
		}
	}
}
func getUIVersionFromFileContents(contents string) string {
	fileLines := strings.Split(contents, "\n")
	for _, line := range fileLines {
		if strings.Contains(line, "mythicUIVersion") {
			uiVersionPieces := strings.Split(line, "=")
			uiVersion := uiVersionPieces[1]
			return uiVersion[2 : len(uiVersion)-2]
		}
	}
	return "Failed to find version"
}
func checkCLIVersion(client *http.Client, urlBase string) (needsUpdate bool, err error) {
	targetURL := urlBase + "/Mythic_CLI/src/cmd/config/vars.go"
	if req, err := http.NewRequest("GET", targetURL, nil); err != nil {
		log.Printf("[!] Failed to make new request: %v\n", err)
		return false, err
	} else if resp, err := client.Do(req); err != nil {
		log.Printf("[!] Error client.Do: %v\n", err)
		return false, err
	} else if resp.StatusCode != 200 {
		log.Printf("[!] Error trying to fetch mythic-cli version resp.StatusCode: %v\n", resp.StatusCode)
		return false, err
	} else {
		defer resp.Body.Close()
		if body, err := io.ReadAll(resp.Body); err != nil {
			log.Printf("[!] Failed to read file contents: %v\n", err)
			return false, err
		} else {
			remoteVersion := getCLIVersionFromFileContents(string(body))
			localVersion := config.Version
			versionComparison := semver.Compare(localVersion, remoteVersion)
			log.Printf("[*] mythic-cli Local Version:  %s\n", localVersion)
			log.Printf("[*] mythic-cli Remote Version: %s\n", remoteVersion)
			if !semver.IsValid(localVersion) {
				log.Printf("[-] Local version isn't valid\n")
				return false, errors.New("Local version isn't valid\n")
			} else if !semver.IsValid(remoteVersion) {
				log.Printf("[-] Remote version isn't valid\n")
				return false, errors.New("Remote version isn't valid\n")
			} else if versionComparison == 0 {
				log.Printf("[+] Your mythic-cli is up to date!\n")
				return false, nil
			} else if versionComparison < 0 {
				log.Printf("[+] mythic-cli update available! This is safe to update now.\n")
				log.Printf("Update with the following:\n")
				log.Printf("1. git pull\n")
				log.Printf("2. make")
				return true, nil
			} else {
				log.Printf("[+] Local version is ahead of remote!\n")
				return false, nil
			}
		}
	}
}
func getCLIVersionFromFileContents(contents string) string {
	fileLines := strings.Split(contents, "\n")
	for _, line := range fileLines {
		if strings.Contains(line, "Version =") {
			uiVersionPieces := strings.Split(line, "=")
			uiVersion := uiVersionPieces[1]
			return uiVersion[2 : len(uiVersion)-1]
		}
	}
	return "Failed to find version"
}
func checkConfigJsonVersion(body []byte, agentName string) (updateVersion string, err error) {
	currentVersion := config.GetMythicEnv().GetString(fmt.Sprintf("%s_remote_image", agentName))
	configMap := map[string]interface{}{}
	err = json.Unmarshal(body, &configMap)
	if err != nil {
		log.Printf("[!] Failed to unmarshal json: %v\n", err)
		return "", err
	}
	if _, ok := configMap["remote_images"]; !ok {
		log.Printf("[*] No remote images found, can't check for updates for %s\n", agentName)
		return "", nil
	}
	remoteImages := configMap["remote_images"].(map[string]interface{})
	for agent, image := range remoteImages {
		if agent == agentName {
			if image.(string) != currentVersion {
				return fmt.Sprintf("%s -> %s", currentVersion, image.(string)), nil
			}
			return "", nil
		}
	}
	log.Printf("[!] No matching remote image found for %s, can't check for updates\n", agentName)
	return "", nil
}
func checkAgentVersions(agents []string, allAgents bool) error {
	agentUpdateMessages := ""
	localAgents := agents
	if len(localAgents) == 0 || allAgents {
		dockerComposeContainers, err := manager.GetManager().GetAllInstalled3rdPartyServiceNames()
		if err != nil {
			return err
		}
		localAgents = dockerComposeContainers
	}
	for _, agent := range localAgents {
		installLocation := config.GetMythicEnv().GetString(fmt.Sprintf("%s_install_location", agent))
		if installLocation == "" {
			log.Printf("[-] No tracked install location for %s, install again to start tracking location\n", agent)
			agentUpdateMessages += fmt.Sprintf("[-] No tracked install location for %s, install again to start tracking location\n", agent)
			continue
		}
		if strings.HasPrefix(installLocation, "http") {
			// check a remote location
			targetInfoPieces := strings.Split(installLocation, ";")
			if len(targetInfoPieces) != 2 {
				log.Printf("[!] Invalid install location for agent %s: %s\n", agent, installLocation)
				agentUpdateMessages += fmt.Sprintf("[!] Invalid install location for agent %s: %s\n", agent, installLocation)
				continue
			}
			workingPath, err := internal.GitClone(targetInfoPieces[0], targetInfoPieces[1])
			if err != nil {
				log.Printf("[!] Failed to clone working path for %s: %v\n", agent, err)
				agentUpdateMessages += fmt.Sprintf("[!] Failed to clone working path for %s: %v\n", agent, err)
				continue
			}
			configDataBytes, err := os.ReadFile(filepath.Join(workingPath, "config.json"))
			internal.RemoveGitClone()
			if err != nil {
				log.Printf("[!] Failed to read config.json for %s: %v\n", agent, err)
				agentUpdateMessages += fmt.Sprintf("[!] Failed to read config.json for %s: %v\n", agent, err)
				continue
			}
			needsUpdate, err := checkConfigJsonVersion(configDataBytes, agent)
			if err != nil {
				log.Printf("[!] Failed to parse config.json for %s: %v\n", agent, err)
				agentUpdateMessages += fmt.Sprintf("[!] Failed to parse config.json for %s: %v\n", agent, err)
				continue
			}
			if needsUpdate != "" {
				log.Printf("[+] %s has an update available! %s\n", agent, needsUpdate)
				agentUpdateMessages += fmt.Sprintf("[+] %s has an update available! %s\n", agent, needsUpdate)
				if installAgentUpdates {
					localKeepVolume := keepVolume
					if !keepVolume {
						localKeepVolume = !config.GetMythicEnv().GetBool("REBUILD_ON_START")
					}
					err = internal.InstallService(targetInfoPieces[0], targetInfoPieces[1], true, localKeepVolume)
					if err != nil {
						log.Printf("[!] Failed to install updated %s: %v\n", agent, err)
						agentUpdateMessages += fmt.Sprintf("[!] Failed to install updated %s: %v\n", agent, err)
					} else {
						log.Printf("[+] Successfully installed updated %s\n", agent)
						agentUpdateMessages += fmt.Sprintf("[+] Successfully installed updated %s\n", agent)
					}
				}
			} else {
				log.Printf("[*] %s is up to date! Version: %s\n", agent, config.GetMythicEnv().GetString(fmt.Sprintf("%s_remote_image", agent)))
				agentUpdateMessages += fmt.Sprintf("[*] %s is up to date! Version: %s\n", agent, config.GetMythicEnv().GetString(fmt.Sprintf("%s_remote_image", agent)))
			}
		} else {
			// checking a folder on disk
			configDataBytes, err := os.ReadFile(filepath.Join(installLocation, "config.json"))
			if err != nil {
				log.Printf("[!] Failed to read config.json for %s: %v\n", agent, err)
				agentUpdateMessages += fmt.Sprintf("[!] Failed to read config.json for %s: %v\n", agent, err)
				continue
			}
			needsUpdate, err := checkConfigJsonVersion(configDataBytes, agent)
			if err != nil {
				log.Printf("[!] Failed to parse config.json for %s: %v\n", agent, err)
				agentUpdateMessages += fmt.Sprintf("[!] Failed to parse config.json for %s: %v\n", agent, err)
				continue
			}
			if needsUpdate != "" {
				log.Printf("[+] %s has an update available! %s\n", agent, needsUpdate)
				agentUpdateMessages += fmt.Sprintf("[+] %s has an update available! %s\n", agent, needsUpdate)
				if installAgentUpdates {
					localKeepVolume := keepVolume
					if !keepVolume {
						localKeepVolume = !config.GetMythicEnv().GetBool("REBUILD_ON_START")
					}
					err = internal.InstallFolder(installLocation, true, localKeepVolume, "")
					if err != nil {
						log.Printf("[!] Failed to parse config.json for %s: %v\n", agent, err)
						agentUpdateMessages += fmt.Sprintf("[!] Failed to parse config.json for %s: %v\n", agent, err)
						continue
					} else {
						log.Printf("[+] Successfully installed updated %s\n", agent)
						agentUpdateMessages += fmt.Sprintf("[+] Successfully installed updated %s\n", agent)
					}
				}
			} else {
				log.Printf("[*] %s is up to date!\n", agent)
				agentUpdateMessages += fmt.Sprintf("[*] %s is up to date!\n", agent)
			}
		}
	}
	if installAgentUpdates {
		agentUpdateMessages = fmt.Sprintf("----------------\n[*] Update Summary\n----------------\n") + agentUpdateMessages
		fmt.Print(agentUpdateMessages)
	}

	return nil
}
