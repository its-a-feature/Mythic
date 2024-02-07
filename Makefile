.PHONY: default
default: linux ;

linux:
	cd Mythic_CLI && make build_linux && mv mythic-cli ../

macos:
	cd Mythic_CLI && make build_macos && mv mythic-cli ../

local:
	cd Mythic_CLI && make build_local

linux_docker:
	cd Mythic_CLI && make build_linux_docker && mv mythic-cli ../

macos_docker:
	cd Mythic_CLI && make build_macos_docker && mv mythic-cli ../