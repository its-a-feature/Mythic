#! /bin/bash
RED='\033[1;31m'
NC='\033[0m' # No Color
GREEN='\033[1;32m'
BLUE='\033[1;34m'
# stand up the docker services and build if needed, started them detached
if ! which realpath > /dev/null; then
  apt-get install -y realpath
  if [ $? -ne 0 ]
  then
    echo -e "${RED}[-]${NC} Failed to install 'realpath'. Aborting"
    exit 1
  fi
fi
if ! which jq > /dev/null; then
  apt-get install -y jq
  if [ $? -ne 0 ]
  then
    echo -e "${RED}[-]${NC} Failed to install 'jq'. Aborting"
    exit 1
  fi
fi
if ! which git > /dev/null; then
  apt-get install -y git
  if [ $? -ne 0 ]
  then
    echo -e "${RED}[-]${NC} Failed to install 'git'. Aborting"
    exit 1
  fi
fi
echo -e "${BLUE}[*]${NC} Making 'temp' folder"
mkdir temp
echo -e "${BLUE}[*]${NC} Pulling down remote repo via git"
git clone --recurse-submodules --single-branch $1 temp
if [ $? -ne 0 ]
then
  echo -e "${RED}[-]${NC} Failed to pull down remote repo. Aborting"
  exit 1
fi
echo -e "${GREEN}[+]${NC} Successfully cloned down the remote repo!"
exclude_payload_type=`jq ".exclude_payload_type" "temp/config.json"`
if [[ $? -ne 0  ]]
then
  echo -e "${RED}[-]${NC} Failed to find exclude_payload_type"
  exit 1
fi
exclude_documentation_payload=`jq ".exclude_documentation_payload" "temp/config.json"`
if [[ $? -ne 0  ]]
then
  echo -e "${RED}[-]${NC} Failed to find exclude_documentation_payload"
  exit 1
fi
exclude_documentation_c2=`jq ".exclude_documentation_c2" "temp/config.json"`
if [[ $? -ne 0  ]]
then
  echo -e "${RED}[-]${NC} Failed to find exclude_documentation_c2"
  exit 1
fi
exclude_c2_profiles=`jq ".exclude_c2_profiles" "temp/config.json"`
if [[ $? -ne 0  ]]
then
  echo -e "${RED}[-]${NC} Failed to find exclude_c2_profiles"
  exit 1
fi
exclude_agent_icons=`jq ".exclude_agent_icons" "temp/config.json"`
if [[ $? -ne 0  ]]
then
  echo -e "${RED}[-]${NC} Failed to find exclude_agent_icons"
  exit 1
fi
if $exclude_payload_type
then
  echo -e "${BLUE}[*]${NC} Skipping the Payload Type folder"
else
  echo -e "${BLUE}[*]${NC} Copying the Payload Type folder"
  if [ "$(ls ./temp/Payload_Type/)" ]; then
    cp -R ./temp/Payload_Type/* ./Payload_Types/
    find ./temp/Payload_Type/ -name "payload_service.sh" -exec chmod +x {} \;
    echo -e "${GREEN}[+]${NC} Successfully copied the Payload Type folder"
  else
    echo -e "${BLUE}[+]${NC} Payload Type folder is empty"
  fi

fi
if $exclude_documentation_payload
then
  echo -e "${BLUE}[*]${NC} Skipping the Payload Type's documentation folder"
else
  echo -e "${BLUE}[*]${NC} Copying the Payload Type's documentation folder"
  if [ "$(ls ./temp/documentation-payload/)" ]; then
    cp -R ./temp/documentation-payload/* ./documentation-docker/content/Agents/
    echo -e "${GREEN}[+]${NC} Successfully copied the Payload Type's documentation folder"
  else
    echo -e "${BLUE}[+]${NC} Payload Type's documentation folder is empty"
  fi
  echo -e "${BLUE}[*]${NC} Copying the Wrapper documentation folder"
  if [ "$(ls ./temp/documentation-wrapper/)" ]; then
    cp -R ./temp/documentation-wrapper/* ./documentation-docker/content/Wrappers/
    echo -e "${GREEN}[+]${NC} Successfully copied the Wrapper's documentation folder"
  else
    echo -e "${BLUE}[+]${NC} Payload Type's documentation folder is empty"
  fi

fi
if $exclude_c2_profiles
then
  echo -e "${BLUE}[*]${NC} Skipping the C2 Profile folder"
else
  echo -e "${BLUE}[*]${NC} Copying the C2 Profile folder"
  if [ "$(ls ./temp/C2_Profiles/)" ]; then
    cp -R ./temp/C2_Profiles/* ./C2_Profiles/
    echo -e "${GREEN}[+]${NC} Successfully copied the C2 Profiles folder"
  else
    echo -e "${BLUE}[+]${NC} C2 Profiles' folder is empty"
  fi
fi
if $exclude_documentation_c2
then
  echo -e "${BLUE}[*]${NC} Skipping the C2 Profile's documentation folder"
else
  echo -e "${BLUE}[*]${NC} Copying the C2 Profile's documentation folder"
  if [ "$(ls ./temp/documentation-c2/)" ]; then
    cp -R ./temp/documentation-c2/* "./documentation-docker/content/C2 Profiles/"
    echo -e "${GREEN}[+]${NC} Successfully copied the C2 Profiles documentation folder"
  else
    echo -e "${BLUE}[+]${NC} C2 Profiles documentation folder is empty"
  fi
fi
if $exclude_agent_icons
then
  echo -e "${BLUE}[*]${NC} Skipping the Payload Type's agent icon folder"
else
  echo -e "${BLUE}[*]${NC} Copying the Payload Type's agent icon folder"
  if [ "$(ls ./temp/agent_icons/)" ]; then
    cp -R ./temp/agent_icons/* ./mythic-docker/app/static/
    echo -e "${GREEN}[+]${NC} Successfully copied the Payload Type's icon folder"
  else
    echo -e "${BLUE}[+]${NC} Payload Type's agent icon folder is empty"
  fi
fi
echo -e "${BLUE}[*]${NC} Removing temp directory"
#rm -rf temp
echo -e "${GREEN}[+]${NC} Successfully installed the remote agent!"
echo -e "${BLUE}[+]${NC} Restart Mythic via ./start_mythic.sh for the new agent to be pulled in!"
