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
# Clone the agent down to ./temp/
echo -e "${BLUE}[*]${NC} Making 'temp' folder"
mkdir temp
echo -e "${BLUE}[*]${NC} Pulling down remote repo via git"
if [ $# -eq 2 ]
then
        echo -e "${BLUE}[*]${NC} Installing From Branch: $2"
        git clone --recurse-submodules --single-branch --branch $2 $1 temp
else
        echo -e "${BLUE}[*]${NC} Installing From master"
        git clone --recurse-submodules --single-branch $1 temp
fi
if [ $? -ne 0 ]
then
  echo -e "${RED}[-]${NC} Failed to pull down remote repo. Aborting"
  exit 1
fi
echo -e "${GREEN}[+]${NC} Successfully cloned down the remote repo!"

# Parse configuration from config.json
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
  find ./temp/Payload_Type/ -maxdepth 1 -type d | grep -vE "Payload_Type/$" > ./temp/payloads.txt
  sed -i 's/\.\/temp\/Payload_Type\//\.\/Payload_Types\//g' ./temp/payloads.txt
  while read p; do
    type_name=`echo "$p" | rev | cut -d "/" -f 1 | rev`
    if [ -d "$p" ]; then
      rm -r $p > /dev/null;
      if [[ $? -eq 0 ]]
      then
        echo -e "${GREEN}[+]${NC} Removed previously installed Payload Type: $type_name"
      else
        echo -e "${RED}[-]${NC} Failed to remove previously installed Payload Type: $type_name"
      fi
    else
      echo -e "${BLUE}[*]${NC} No old Payload Type content for $type_name to remove."
    fi
  done < ./temp/payloads.txt
  echo -e "${BLUE}[*]${NC} Copying the Payload Type folder"
  if [ "$(ls ./temp/Payload_Type/)" ]; then
    cp -R ./temp/Payload_Type/* ./Payload_Types/
    find ./Payload_Types/ -name "payload_service.sh" -exec chmod +x {} \;
    echo -e "${GREEN}[+]${NC} Successfully copied the Payload Type folder"
  else
    echo -e "${BLUE}[+]${NC} Payload Type folder is empty"
  fi

fi

# Copy documentation for payload files
if $exclude_documentation_payload
then
  echo -e "${BLUE}[*]${NC} Skipping the Payload Type's documentation folder"
else
  # Out with the old
  echo -e "${BLUE}[*]${NC} Copying the Payload Type's documentation folder"
  if [ "$(ls ./temp/documentation-payload/)" ]; then
    find ./temp/documentation-payload/ -maxdepth 1 -type d | grep -vE "documentation-payload/$" > ./temp/documentation.txt
    sed -i 's/\.\/temp\/documentation-payload\//\.\/documentation-docker\/content\/Agents\//g' ./temp/documentation.txt
    while read p; do
      type_name=`echo "$p" | rev | cut -d "/" -f 1 | rev`
      if [ -d "$p" ]; then
        rm -r $p > /dev/null;
        if [[ $? -eq 0 ]]
        then
          echo -e "${GREEN}[+]${NC} Removed previously installed documentation for: $type_name"
        else
          echo -e "${RED}[-]${NC} Failed to remove previously installed documentation for: $type_name"
        fi
      else
        echo -e "${BLUE}[*]${NC} No old documentation found for $type_name to remove."
      fi
    done < ./temp/documentation.txt
    # In with the new
    cp -R ./temp/documentation-payload/* ./documentation-docker/content/Agents/
    echo -e "${GREEN}[+]${NC} Successfully copied the Payload Type's documentation folder"
  else
    echo -e "${BLUE}[+]${NC} Payload Type's documentation folder is empty"
  fi
  echo -e "${BLUE}[*]${NC} Copying the Wrapper documentation folder"
  if [ -d "./temp/documentation-wrapper/" ] && [ "$(ls ./temp/documentation-wrapper/)" ]; then
    cp -R ./temp/documentation-wrapper/* ./documentation-docker/content/Wrappers/
    echo -e "${GREEN}[+]${NC} Successfully copied the Wrapper's documentation folder"
  else
    echo -e "${BLUE}[+]${NC} Payload Type's wrapper documentation folder is empty"
  fi
fi

# Copy C2 Profiles
if $exclude_c2_profiles
then
  echo -e "${BLUE}[*]${NC} Skipping the C2 Profile folder"
else
  # Out with the old
  find ./temp/C2_Profiles/ -maxdepth 1 -type d | grep -vE "C2_Profiles/$" > ./temp/C2Profiles.txt
  sed -i 's/\.\/temp\/C2_Profiles\//\.\/C2_Profiles\//g' ./temp/C2Profiles.txt
  while read p; do
    type_name=`echo "$p" | rev | cut -d "/" -f 1 | rev`
    if [ -d "$p" ]; then
      rm -r $p > /dev/null;
      if [[ $? -eq 0 ]]
      then
        echo -e "${GREEN}[+]${NC} Removed previously installed C2 Profile: $type_name"
      else
        echo -e "${RED}[-]${NC} Failed to remove previously installed C2 Profile: $type_name"
      fi
    else
      echo -e "${BLUE}[*]${NC} No old C2 Profile for $type_name found to remove."
    fi
  done < ./temp/C2Profiles.txt

  # In with the new
  echo -e "${BLUE}[*]${NC} Copying the C2 Profile folder"
  if [ "$(ls ./temp/C2_Profiles/)" ]; then
    cp -R ./temp/C2_Profiles/* ./C2_Profiles/
    echo -e "${GREEN}[+]${NC} Successfully copied the C2 Profiles folder"
  else
    echo -e "${BLUE}[+]${NC} C2 Profiles' folder is empty"
  fi
fi

# Copy C2 Documentation
if $exclude_documentation_c2
then
  echo -e "${BLUE}[*]${NC} Skipping the C2 Profile's documentation folder"
else
  # Out with the old
  find ./temp/documentation-c2/ -maxdepth 1 -type d | grep -vE "documentation-c2/$" > ./temp/c2documentation.txt
  sed -i 's/\.\/temp\/documentation-c2\//\.\/documentation-docker\/content\/C2 Profiles\//g' ./temp/c2documentation.txt
  while read p; do
    type_name=`echo "$p" | rev | cut -d "/" -f 1 | rev`
    if [ -d "$p" ]; then
      rm -r $p > /dev/null;
      if [[ $? -eq 0 ]]
      then
        echo -e "${GREEN}[+]${NC} Removed previously installed documentation for profile: $type_name"
      else
        echo -e "${RED}[-]${NC} Failed to remove previously installed documentation for profile: $type_name"
      fi
    else
      echo -e "${BLUE}[*]${NC} No old documentation found for $type_name to remove."
    fi
  done < ./temp/c2documentation.txt

  # In with the new
  echo -e "${BLUE}[*]${NC} Copying the C2 Profile's documentation folder"
  if [ "$(ls ./temp/documentation-c2/)" ]; then
    cp -R ./temp/documentation-c2/* "./documentation-docker/content/C2 Profiles/"
    echo -e "${GREEN}[+]${NC} Successfully copied the C2 Profiles documentation folder"
  else
    echo -e "${BLUE}[+]${NC} C2 Profiles documentation folder is empty"
  fi
fi

# Copy agent icons
if $exclude_agent_icons
then
  echo -e "${BLUE}[*]${NC} Skipping the Payload Type's agent icon folder"
else
  # Out with the old
  find ./temp/agent_icons/ -type f -not -name ".keep" | grep -vE "agent_icons/$" > ./temp/agent_icons.txt
  sed -i 's/\.\/temp\/agent_icons\//\.\/mythic-docker\/app\/static\//g' ./temp/agent_icons.txt
  while read p; do
    type_name=`echo "$p" | rev | cut -d "/" -f 1 | rev`
    if [ -f "$p" ]; then
      rm $p > /dev/null;
      if [[ $? -eq 0 ]]
      then
        echo -e "${GREEN}[+]${NC} Removed icon: $type_name"
      else
        echo -e "${RED}[-]${NC} Failed to remove icon: $type_name"
      fi
    else
      echo -e "${BLUE}[*]${NC} No old agent icons found for $type_name to remove."
    fi
  done < ./temp/agent_icons.txt

  # In with the new
  echo -e "${BLUE}[*]${NC} Copying the Payload Type's agent icon folder"
  if [ "$(ls ./temp/agent_icons/)" ]; then
    cp -R ./temp/agent_icons/* ./mythic-docker/app/static/
    echo -e "${GREEN}[+]${NC} Successfully copied the Payload Type's icon folder"
  else
    echo -e "${BLUE}[+]${NC} Payload Type's agent icon folder is empty"
  fi
fi
echo -e "${BLUE}[*]${NC} Removing temp directory"
rm -rf temp
echo -e "${GREEN}[+]${NC} Successfully installed the remote agent!"
echo -e "${BLUE}[+]${NC} Restart Mythic via ./start_mythic.sh for the new agent to be pulled in!"
