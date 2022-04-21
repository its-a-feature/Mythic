#! /bin/bash
if [ "$EUID" -ne 0 ]
  then echo "[-] Please run as root"
  exit
fi
# --------------------------------------------------------
# -- DEFINE FUNCTIONS TO INSTALL DOCKER BASED ON DISTRO --
# --------------------------------------------------------

# --------------------------------------------------------
# --------- FUNCTION TOINSTALL DOCKER ON UBUNTU ----------
# --------------------------------------------------------

install_docker_ubuntu() {
    # Install the required services.
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg-agent \
        software-properties-common

    # Get GPG key for Docker repo
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

    # Add docker repo
    add-apt-repository -y \
       "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
       $(lsb_release -cs) \
       stable"

    # Update apt cache
    apt-get update

    # Install the docker-ce package
    apt-get install -y --no-install-recommends docker-ce

    # Download and install docker-compose latest version
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

    # Make docker-compose executable 
    chmod +x /usr/local/bin/docker-compose
}

# --------------------------------------------------------
# --------- FUNCTION TOINSTALL DOCKER ON DEBIAN ----------
# --------------------------------------------------------

install_docker_debian() {
    # Install required packages.
    apt install -y apt-transport-https ca-certificates curl gnupg2 software-properties-common

    # Add GPG key for Docker repo
    curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add -

    # Add repo for Docker
    add-apt-repository -y "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable"

    # Update apt cache
    apt update

    # Install the docker-ce package
    apt-get install -y --no-install-recommends docker-ce

    # Get Docker-compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

    # Make docker-compose executable
    chmod +x /usr/local/bin/docker-compose
}

# --------------------------------------------------------
# --------- FUNCTION TOINSTALL DOCKER ON KALI ----------
# --------------------------------------------------------

# --------------------------------------------------------
# -- GET CURRENT LINUX DISTRO AND CALL APPROPRIATE FUNC -- 
# --------------------------------------------------------

install_docker_kali() {
    # Update apt cache
    apt update

    # Install Docker and Docker Compose
    apt install docker docker-compose -y
}

# Get Linux Distro
linuxDistro=$(/usr/bin/lsb_release -i)

# Run appropriate function 
if [[ "$linuxDistro" == *"Ubuntu"* ]]; then
        echo "Detected Distribution: Ubuntu. Installing Docker for Ubuntu."
        install_docker_ubuntu
elif [[ "$linuxDistro" == *"Debian"* ]]; then
        echo "Debian!"
        echo $linuxDistro
elif [[ "$linuxDistro" == *"Kali"* ]]; then
        echo "Kali!"
        echo $linuxDistro
else
        echo "FATAL ERROR: Not supported distro! We currently only support: Debian, Ubuntu and Kali."
fi
