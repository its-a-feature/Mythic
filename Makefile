.PHONY: default
default: linux ;

linux:
	cd Mythic_CLI && make && mv mythic-cli ../

macos:
	cd Mythic_CLI && make build_all_macos && mv mythic-cli ../

macos_local:
	cd Mythic_CLI && make build_binary_macos_local
