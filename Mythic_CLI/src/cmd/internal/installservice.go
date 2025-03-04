package internal

import (
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/manager"
	"github.com/MythicMeta/Mythic_CLI/cmd/utils"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/viper"
)

func InstallFolder(installPath string, overWrite bool, keepVolume bool, installURL string) error {
	installLocation := installPath
	if installURL != "" {
		installLocation = installURL
	}
	workingPath := utils.GetCwdFromExe()
	if !utils.FileExists(filepath.Join(installPath, "config.json")) {
		log.Fatal("[-] Failed to find config.json in cloned down repo\n")
	}
	var installConfig = viper.New()
	installConfig.SetConfigName("config")
	installConfig.SetConfigType("json")
	log.Printf("[*] Parsing config.json\n")
	installConfig.AddConfigPath(installPath)
	if err := installConfig.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Printf("[-] Error while reading in installConfig file: %s", err)
			return err
		} else {
			log.Printf("[-] Error while parsing installConfig file: %s", err)
			return err
		}
	}
	latestVersion := installConfig.GetStringMapString("remote_images")
	for key, val := range latestVersion {
		config.SetNewConfigStrings(fmt.Sprintf("%s_remote_image", key), val)
		if !config.GetMythicEnv().InConfig(fmt.Sprintf("%s_use_volume", key)) {
			config.SetNewConfigStrings(fmt.Sprintf("%s_use_volume", key), "false")
		}
		if !config.GetMythicEnv().InConfig(fmt.Sprintf("%s_use_build_context", key)) {
			config.SetNewConfigStrings(fmt.Sprintf("%s_use_build_context", key), "false")
		}
	}
	if !installConfig.GetBool("exclude_payload_type") {
		// handle the payload type copying here
		files, err := ioutil.ReadDir(filepath.Join(installPath, "Payload_Type"))
		if err != nil {
			log.Printf("[-] Failed to list contents of new Payload_Type folder: %v\n", err)
			return err
		}
		for _, f := range files {
			if f.IsDir() {
				log.Printf("[*] Processing Payload Type %s\n", f.Name())

				if utils.DirExists(filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), f.Name())) {
					if overWrite || config.AskConfirm("[*] "+f.Name()+" already exists. Replace current version? ") {
						log.Printf("[*] Stopping current container\n")
						if manager.GetManager().IsServiceRunning(strings.ToLower(f.Name())) {
							if err := ServiceStop([]string{f.Name()}, keepVolume); err != nil {
								log.Printf("[-] Failed to stop current container: %v\n", err)
								return err
							}
						}
						log.Printf("[*] Removing current version\n")
						err = os.RemoveAll(filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), f.Name()))
						if err != nil {
							log.Printf("[-] Failed to remove current version: %v\n", err)
							log.Printf("[-] Continuing to the next payload\n")
							continue
						} else {
							log.Printf("[+] Successfully removed the current version\n")
						}
					} else {
						log.Printf("[!] Skipping Payload Type, %s\n", f.Name())
						continue
					}
				}
				log.Printf("[*] Copying new version of payload into place\n")
				err = utils.CopyDir(filepath.Join(installPath, "Payload_Type", f.Name()),
					filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), f.Name()))
				if err != nil {
					log.Printf("[-] Failed to copy directory over: %v\n", err)
					continue
				}
				log.Printf("[*] Adding service into docker-compose\n")
				if installConfig.IsSet("docker-compose") {
					err = Add3rdPartyService(f.Name(), installConfig.GetStringMap("docker-compose"), !keepVolume)
					if err != nil {
						log.Printf("[-] Failed to add service to docker-compose: %v\n", err)
					} else {
						err = manager.GetManager().BuildServices([]string{f.Name()}, keepVolume)
						if err != nil {
							log.Printf("[-] Failed to start service: %v\n", err)
						}
					}
				} else {
					err = Add3rdPartyService(f.Name(), make(map[string]interface{}), !keepVolume)
					if err != nil {
						log.Printf("[-] Failed to add service to docker-compose: %v\n", err)
					} else {
						err = manager.GetManager().BuildServices([]string{f.Name()}, keepVolume)
						if err != nil {
							log.Printf("[-] Failed to start service: %v\n", err)
						}
					}
				}
			}
			config.SetNewConfigStrings(fmt.Sprintf("%s_install_location", f.Name()), installLocation)
		}
		log.Printf("[+] Successfully installed service\n")
	} else {
		log.Printf("[*] Skipping over Payload Type\n")
	}
	if !installConfig.GetBool("exclude_c2_profiles") {
		// handle the c2 profile copying here
		files, err := ioutil.ReadDir(filepath.Join(installPath, "C2_Profiles"))
		if err != nil {
			log.Printf("[-] Failed to list contents of C2_Profiles folder from clone\n")
			return err
		}
		for _, f := range files {
			if f.IsDir() {
				log.Printf("[*] Processing C2 Profile %s\n", f.Name())
				if utils.DirExists(filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), f.Name())) {
					if overWrite || config.AskConfirm("[*] "+f.Name()+" already exists. Replace current version? ") {
						log.Printf("[*] Stopping current container\n")
						if manager.GetManager().IsServiceRunning(strings.ToLower(f.Name())) {
							if err := ServiceStop([]string{f.Name()}, keepVolume); err != nil {
								log.Printf("[-] Failed to stop container: %v\n", err)
								return err
							}
						}
						log.Printf("[*] Removing current version\n")
						err = os.RemoveAll(filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), f.Name()))
						if err != nil {
							log.Printf("[-] Failed to remove current version: %v\n", err)
							log.Printf("[-] Continuing to the next c2 profile\n")
							continue
						} else {
							log.Printf("[+] Successfully removed the current version\n")
						}
					} else {
						log.Printf("[!] Skipping C2 Profile, %s\n", f.Name())
						continue
					}
				}
				log.Printf("[*] Copying new version into place\n")
				err = utils.CopyDir(filepath.Join(installPath, "C2_Profiles", f.Name()),
					filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), f.Name()))
				if err != nil {
					log.Printf("[-] Failed to copy directory over\n")
					continue
				}
				// now add payload type to yaml installConfig
				log.Printf("[*] Adding c2, %s, into docker-compose\n", f.Name())
				err = Add3rdPartyService(f.Name(), make(map[string]interface{}), !keepVolume)
				if err != nil {
					log.Printf("[-] Failed to add %s to docker-compose: %v\n", f.Name(), err)
				} else {
					err = manager.GetManager().BuildServices([]string{f.Name()}, keepVolume)
					if err != nil {
						log.Printf("[-] Failed to start service: %v\n", err)
					}
				}
			}
			config.SetNewConfigStrings(fmt.Sprintf("%s_install_location", f.Name()), installLocation)
		}
		log.Printf("[+] Successfully installed c2\n")
	} else {
		log.Printf("[*] Skipping over C2 Profile\n")
	}
	if !installConfig.GetBool("exclude_documentation_payload") {
		// handle payload documentation copying here
		files, err := ioutil.ReadDir(filepath.Join(installPath, "documentation-payload"))
		if err != nil {
			log.Printf("[-] Failed to list contents of documentation_payload folder from clone: %v\n", err)
		} else {
			for _, f := range files {
				if f.IsDir() {
					log.Printf("[*] Processing Documentation for %s\n", f.Name())
					if !config.GetMythicEnv().GetBool("documentation_use_volume") {
						if utils.DirExists(filepath.Join(workingPath, "documentation-docker", "content", "Agents", f.Name())) {
							if overWrite || config.AskConfirm("[*] "+f.Name()+" documentation already exists. Replace current version? ") {
								log.Printf("[*] Removing current version\n")
								err = os.RemoveAll(filepath.Join(workingPath, "documentation-docker", "content", "Agents", f.Name()))
								if err != nil {
									log.Printf("[-] Failed to remove current version: %v\n", err)
									log.Printf("[-] Continuing to the next payload documentation\n")
									continue
								} else {
									log.Printf("[+] Successfully removed the current version\n")
								}
							} else {
								log.Printf("[!] Skipping documentation for , %s\n", f.Name())
								continue
							}
						}
						log.Printf("[*] Copying new documentation into place\n")
						err = utils.CopyDir(filepath.Join(installPath, "documentation-payload", f.Name()), filepath.Join(workingPath, "documentation-docker", "content", "Agents", f.Name()))
						if err != nil {
							log.Printf("[-] Failed to copy directory over\n")
							continue
						}
					} else {
						err = moveFileToVolume("mythic_documentation", "mythic_documentation_volume",
							filepath.Join("content", "Agents"),
							filepath.Join(installPath, "documentation-payload", f.Name()))
						if err != nil {
							log.Printf("[-] Failed to install documentation for payload: %v\n", err)
							continue
						}
					}

				}
			}
			log.Printf("[+] Successfully installed Payload documentation\n")
		}

	} else {
		log.Printf("[*] Skipping over Payload Documentation\n")
	}
	if !installConfig.GetBool("exclude_documentation_c2") {
		// handle the c2 documentation copying here
		files, err := ioutil.ReadDir(filepath.Join(installPath, "documentation-c2"))
		if err != nil {
			log.Printf("[-] Failed to list contents of documentation_payload folder from clone")
		} else {
			for _, f := range files {
				if f.IsDir() {
					log.Printf("[*] Processing Documentation for %s\n", f.Name())
					if !config.GetMythicEnv().GetBool("mythic_documentation_use_volume") {
						if utils.DirExists(filepath.Join(workingPath, "documentation-docker", "content", "C2 Profiles", f.Name())) {
							if overWrite || config.AskConfirm("[*] "+f.Name()+" documentation already exists. Replace current version? ") {
								log.Printf("[*] Removing current version\n")
								err = os.RemoveAll(filepath.Join(workingPath, "documentation-docker", "content", "C2 Profiles", f.Name()))
								if err != nil {
									log.Printf("[-] Failed to remove current version: %v\n", err)
									log.Printf("[-] Continuing to the next c2 documentation\n")
									continue
								} else {
									log.Printf("[+] Successfully removed the current version\n")
								}
							} else {
								log.Printf("[!] Skipping documentation for %s\n", f.Name())
								continue
							}
						}
						log.Printf("[*] Copying new documentation version into place\n")
						err = utils.CopyDir(filepath.Join(installPath, "documentation-c2", f.Name()),
							filepath.Join(workingPath, "documentation-docker", "content", "C2 Profiles", f.Name()))
						if err != nil {
							log.Printf("[-] Failed to copy directory over\n")
							continue
						}
					} else {
						err = moveFileToVolume("mythic_documentation", "mythic_documentation_volume",
							filepath.Join("content", "C2 Profiles"),
							filepath.Join(installPath, "documentation-c2", f.Name()))
						if err != nil {
							log.Printf("[-] Failed to install documentation for c2: %v\n", err)
							continue
						}

					}

				}
			}
			log.Printf("[+] Successfully installed c2 documentation\n")
		}

	} else {
		log.Printf("[*] Skipping over C2 Documentation\n")
	}
	if !installConfig.GetBool("exclude_documentation_wrapper") {
		// handle payload documentation copying here
		files, err := ioutil.ReadDir(filepath.Join(installPath, "documentation-wrapper"))
		if err != nil {
			log.Printf("[-] Failed to list contents of documentation-wrapper folder from clone: %v\n", err)
		} else {
			for _, f := range files {
				if f.IsDir() {
					log.Printf("[*] Processing Documentation for %s\n", f.Name())
					if !config.GetMythicEnv().GetBool("mythic_documentation_use_volume") {
						if utils.DirExists(filepath.Join(workingPath, "documentation-docker", "content", "Wrappers", f.Name())) {
							if overWrite || config.AskConfirm("[*] "+f.Name()+" documentation already exists. Replace current version? ") {
								log.Printf("[*] Removing current version\n")
								err = os.RemoveAll(filepath.Join(workingPath, "documentation-docker", "content", "Wrappers", f.Name()))
								if err != nil {
									log.Printf("[-] Failed to remove current version: %v\n", err)
									log.Printf("[-] Continuing to the next wrapper documentation\n")
									continue
								} else {
									log.Printf("[+] Successfully removed the current version\n")
								}
							} else {
								log.Printf("[!] Skipping documentation for , %s\n", f.Name())
								continue
							}
						}
						log.Printf("[*] Copying new documentation into place\n")
						err = utils.CopyDir(filepath.Join(installPath, "documentation-wrapper", f.Name()),
							filepath.Join(workingPath, "documentation-docker", "content", "Wrappers", f.Name()))
						if err != nil {
							log.Printf("[-] Failed to copy directory over\n")
							continue
						}
					} else {
						err = moveFileToVolume("mythic_documentation", "mythic_documentation_volume",
							filepath.Join("content", "Wrappers"),
							filepath.Join(installPath, "documentation-wrapper", f.Name()))
						if err != nil {
							log.Printf("[-] Failed to install documentation for wrapper: %v\n", err)
							continue
						}
					}
				}
			}
			log.Printf("[+] Successfully installed Wrapper documentation\n")
		}
	} else {
		log.Printf("[*] Skipping over Wrapper Documentation\n")
	}
	if manager.GetManager().IsServiceRunning("mythic_documentation") {
		log.Printf("[*] Restarting mythic_documentation container to pull in changes\n")
		ServiceStop([]string{"mythic_documentation"}, true)
		manager.GetManager().BuildServices([]string{"mythic_documentation"}, true)
		//ServiceStart([]string{"mythic_documentation"}, true)
	}
	return nil
}
func GitClone(url string, branch string) (string, error) {
	workingPath := utils.GetCwdFromExe()
	if utils.DirExists(filepath.Join(workingPath, "tmp")) {
		err := os.RemoveAll(filepath.Join(workingPath, "tmp"))
		if err != nil {
			log.Printf("[-] tmp directory couldn't be deleted for a fresh install: %v\n", err)
			return "", err
		}
	}
	err := os.Mkdir(filepath.Join(workingPath, "tmp"), 0755)
	if err != nil {
		log.Printf("[-] Failed to make temp directory for cloning: %v\n", err)
		return "", err
	}
	//log.Printf("[*] Cloning branch \"%s\" from %s\n", branch, url)
	err = runGitClone([]string{"-c", "http.sslVerify=false", "clone", "--depth", "1", "--recurse-submodules", "--single-branch", "--branch", branch, url, filepath.Join(workingPath, "tmp")}, false)
	if err != nil {
		return "", err
	}
	return filepath.Join(workingPath, "tmp"), nil
}
func RemoveGitClone() error {
	workingPath := utils.GetCwdFromExe()
	return os.RemoveAll(filepath.Join(workingPath, "tmp"))
}
func InstallService(url string, branch string, overWrite bool, keepVolume bool) error {
	// make our temp directory to clone into
	workingPath := utils.GetCwdFromExe()
	log.Printf("[*] Creating temporary directory\n")
	if utils.DirExists(filepath.Join(workingPath, "tmp")) {
		err := os.RemoveAll(filepath.Join(workingPath, "tmp"))
		if err != nil {
			log.Printf("[-] tmp directory couldn't be deleted for a fresh install: %v\n", err)
			return err
		}
	}
	err := os.Mkdir(filepath.Join(workingPath, "tmp"), 0755)
	defer os.RemoveAll(filepath.Join(workingPath, "tmp"))
	if err != nil {
		log.Printf("[-] Failed to make temp directory for cloning: %v\n", err)
		return err
	}
	installURL := url
	if branch == "" {
		log.Printf("[*] Cloning %s\n", url)
		err = runGitClone([]string{"-c", "http.sslVerify=false", "clone", "--depth", "1", "--recurse-submodules", "--single-branch", url, filepath.Join(workingPath, "tmp")}, true)
	} else {
		log.Printf("[*] Cloning branch \"%s\" from %s\n", branch, url)
		err = runGitClone([]string{"-c", "http.sslVerify=false", "clone", "--depth", "1", "--recurse-submodules", "--single-branch", "--branch", branch, url, filepath.Join(workingPath, "tmp")}, true)
	}
	if err != nil {
		log.Printf("[-] Failed to clone down repository: %v\n", err)
		return err
	}
	if branch == "" {
		fileContents, err := os.ReadFile(filepath.Join(workingPath, "tmp", ".git", "HEAD"))
		if err != nil {
			log.Printf("[-] Failed to read .git HEAD: %v\n", err)
			branch = "main"
		} else {
			pieces := strings.Split(string(fileContents), "/")
			if len(pieces) == 0 {
				log.Printf("[-] Failed to parse HEAD ref\n")
				branch = "main"
			} else {
				branch = strings.TrimSpace(pieces[len(pieces)-1])
			}
		}
	}
	installURL = fmt.Sprintf("%s;%s", url, branch)

	if err = InstallFolder(filepath.Join(workingPath, "tmp"), overWrite, keepVolume, installURL); err != nil {
		log.Printf("[-] Failed to install: %v\n", err)
		return err
	} else {
		return nil
	}
}
func installServiceByName(service string) error {
	// just have a service name, check MythicAgents, MythicC2Profiles, or error
	agentURL := fmt.Sprintf("https://github.com/MythicAgents/%s", service)
	c2URL := fmt.Sprintf("https://github.com/MythicC2Profiles/%s", service)
	if err := runGitLsRemote([]string{"lfs-remote", agentURL, "HEAD"}); err != nil {
		if err = runGitLsRemote([]string{"lfs-remote", c2URL, "HEAD"}); err != nil {
			log.Printf("[-] Failed to find an agent or c2 profile by that name")
			return err
		} else {
			// this exists as a c2 profile repo, so we can pull that down
			return InstallService(c2URL, "", true, false)
		}
	} else {
		// this exists as an agent repo, so we can pull that down
		return InstallService(agentURL, "", true, false)
	}
}
func UninstallService(services []string) {
	workingPath := utils.GetCwdFromExe()
	for _, service := range services {
		if utils.StringInSlice(strings.ToLower(service), config.MythicPossibleServices) {
			log.Fatalf("[-] Trying to uninstall Mythic services not allowed\nIf you need to remove it locally send the corresponding environment host name to an IP address or hostname")
		}
		found := false
		if utils.DirExists(filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), service)) {
			log.Printf("[*] Stopping and removing container\n")
			if manager.GetManager().IsServiceRunning(strings.ToLower(service)) {
				if err := ServiceStop([]string{strings.ToLower(service)}, false); err != nil {
					log.Printf("[-] Failed to stop container: %v\n", err)
					return
				}
			}
			log.Printf("[*] Removing %s from docker-compose\n", strings.ToLower(service))
			err := manager.GetManager().RemoveServices([]string{strings.ToLower(service)}, false)
			if err != nil {
				log.Printf("[-] Failed to remove docker compose entry: %v\n", err)
				return
			}
			log.Printf("[*] Removing Payload Type folder from disk\n")
			found = true
			err = os.RemoveAll(filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), service))
			if err != nil {
				log.Fatalf("[-] Failed to remove folder: %v\n", err)
			}
			log.Printf("[+] Successfully removed %s's folder\n", service)

			if utils.DirExists(filepath.Join(workingPath, "documentation-docker", "content", "Agents", service)) {
				log.Printf("[*] Removing Payload Type's Documentation from disk\n")
				err = os.RemoveAll(filepath.Join(workingPath, "documentation-docker", "content", "Agents", service))
				if err != nil {
					log.Fatalf("[-] Failed to remove Payload Type's Documentation: %v\n", err)
				}
				log.Printf("[+] Successfully removed Payload Type's Documentation\n")

			}
			if utils.DirExists(filepath.Join(workingPath, "documentation-docker", "content", "C2 Profiles", service)) {
				log.Printf("[*] Removing C2 Profile's Documentation\n")
				err = os.RemoveAll(filepath.Join(workingPath, "documentation-docker", "content", "C2 Profiles", service))
				if err != nil {
					log.Fatalf("[-] Failed to remove C2 Profile's Documentation: %v\n", err)
				}
				log.Printf("[+] Successfully removed C2 Profile's Documentation\n")

			}
			if utils.DirExists(filepath.Join(workingPath, "documentation-docker", "content", "Wrappers", service)) {
				log.Printf("[*] Removing C2 Profile's Documentation\n")
				err = os.RemoveAll(filepath.Join(workingPath, "documentation-docker", "content", "Wrappers", service))
				if err != nil {
					log.Fatalf("[-] Failed to remove C2 Profile's Documentation: %v\n", err)
				}
				log.Printf("[+] Successfully removed C2 Profile's Documentation\n")

			}
		}

		if found {
			log.Printf("[+] Successfully Uninstalled %s\n", service)
			if manager.GetManager().IsServiceRunning("mythic_documentation") {
				log.Printf("[*] Restarting mythic_documentation container to pull in changes\n")
				ServiceStop([]string{"mythic_documentation"}, true)
				ServiceStart([]string{"mythic_documentation"}, true)
			}
			return
		} else {
			log.Fatalf("[-] Failed to find any service folder by that name\n")
		}
	}
}

// Mythic Sync Specific

func InstallMythicSyncFolder(installPath string) error {
	service := "mythic_sync"
	if manager.GetManager().IsServiceRunning(service) {
		err := manager.GetManager().StopServices([]string{service}, config.GetMythicEnv().GetBool("REBUILD_ON_START"), false)
		if err != nil {
			log.Printf("[-] Failed to stop current docker container: %v\n", err)
			return err
		}
	}
	if utils.DirExists(filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), service)) {
		err := os.RemoveAll(filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), service))
		if err != nil {
			log.Printf("[-] %s directory couldn't be deleted for a fresh install: %v\n",
				filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), service), err)
			return err
		}
	}
	err := utils.CopyDir(installPath, filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), service))
	if err != nil {
		log.Printf("[-] Failed to create %s directory to install mythic_sync: %v\n", service, err)
		return err
	}
	AddMythicService(service, true)
	log.Printf("[+] Successfully installed mythic_sync!\n")
	if manager.GetManager().IsServiceRunning("mythic_server") {
		log.Printf("[*] Starting mythic_sync")
		err = ServiceStart([]string{strings.ToLower(service)}, false)
		if err != nil {
			log.Printf("[-] Failed to start mythic_sync: %v\n", err)
		}
	}
	return nil
}
func InstallMythicSync(url string, branch string) error {
	// make our temp directory to clone into
	workingPath := utils.GetCwdFromExe()
	log.Printf("[*] Creating temporary directory\n")
	if utils.DirExists(filepath.Join(workingPath, "tmp")) {
		if err := os.RemoveAll(filepath.Join(workingPath, "tmp")); err != nil {
			log.Printf("[-] %s directory couldn't be deleted for a fresh install: %v\n", filepath.Join(workingPath, "tmp"), err)
			return err
		}
	}
	err := os.Mkdir(filepath.Join(workingPath, "tmp"), 0755)
	defer os.RemoveAll(filepath.Join(workingPath, "tmp"))
	if err != nil {
		log.Fatalf("[-] Failed to make temp directory for cloning: %v\n", err)
	}
	if branch == "" {
		log.Printf("[*] Cloning %s\n", url)
		err = runGitClone([]string{"-c", "http.sslVerify=false", "clone", "--depth", "1", "--recurse-submodules", "--single-branch", url, filepath.Join(workingPath, "tmp")}, true)
	} else {
		log.Printf("[*] Cloning branch \"%s\" from %s\n", branch, url)
		err = runGitClone([]string{"-c", "http.sslVerify=false", "clone", "--depth", "1", "--recurse-submodules", "--single-branch", "--branch", branch, url, filepath.Join(workingPath, "tmp")}, true)
	}
	if err != nil {
		log.Printf("[-] Failed to clone down repository: %v\n", err)
		return err
	}
	return InstallMythicSyncFolder(filepath.Join(workingPath, "tmp"))

}
func UninstallMythicSync() {
	service := "mythic_sync"
	if manager.GetManager().IsServiceRunning(service) {
		ServiceStop([]string{service}, false)
	}
	RemoveService(service)
	if utils.DirExists(filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), service)) {
		err := os.RemoveAll(filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), service))
		if err != nil {
			log.Fatalf("[-] %s directory couldn't be deleted: %v\n", service, err)
		} else {
			log.Printf("[+] Successfully removed %s from disk\n", service)
			return
		}
	} else {
		log.Printf("[+] %s was not installed on disk\n", service)
		return
	}
}
