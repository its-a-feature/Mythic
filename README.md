# Mythic
A cross-platform, post-exploit, red teaming framework built with python3, docker, docker-compose, and a web browser UI. It's designed to provide a collaborative and user friendly interface for operators, managers, and reporting throughout red teaming. 

## Details
* Check out a [series of YouTube videos](https://www.youtube.com/playlist?list=PLHVFedjbv6sNLB1QqnGJxRBMukPRGYa-H) showing how Mythic looks/works and highlighting a few key features
* Check out the [blog post](https://posts.specterops.io/a-change-of-mythic-proportions-21debeb03617) on the rebranding. 
* BSides Seattle 2019 Slides: [Ready Player 2: Multiplayer Red Teaming against macOS](https://www.slideshare.net/CodyThomas6/ready-player-2-multiplayer-red-teaming-against-macos)    
* BSides Seattle 2019 Demo Videos: [Available on my Youtube](https://www.youtube.com/playlist?list=PLHVFedjbv6sOz8OGuLdomdkr6-7VdMRQ9)  
* Objective By the Sea 2019 talk on JXA: https://objectivebythesea.com/v2/talks/OBTS_v2_Thomas.pdf  
* Objective By the sea 2019 Video: https://www.youtube.com/watch?v=E-QEsGsq3uI&list=PLliknDIoYszvTDaWyTh6SYiTccmwOsws8&index=17  

* Current Version is found in the VERSION file

## Installing Agents and C2 Profiles

The Mythic repository itself does not host any Payload Types or any C2 Profiles. Instead, Mythic provides a command, `./mythic-cli install github <url> [branch name] [-f]`, that can be used to install agents into a current Mythic instance.

Payload Types are hosted on the [MythicAgents](https://github.com/MythicAgents) organization and C2 Profiles are hosted on the [MythicC2Profiles](https://github.com/MythicC2Profiles) organization.

To install an agent, simply run the script and provide an argument of the path to the agent on GitHub:
```bash
sudo ./mythic-cli install github https://github.com/MythicAgents/apfell
```

The same is true for installing C2 Profiles:
```bash
sudo ./mythic-cli install github https://github.com/MythicC2Profiles/http
```

This is a slight departure from previous Mythic versions which included a few default Payload Types and C2 Profiles within this repository. This change allows the agents and c2 profiles to be updated at a much more regular pace and finally separates out the Mythic Core components from the rest of Mythic. 

## Mythic Container Configurations & PyPi Packages

Mythic uses Docker and Docker-compose for all of its components, which allows Mythic to provide a wide range of components and features without having requirements exist on the host. However, it can be helpful to have insight into how the containers are configured. All of Mythic's docker containers are hosted on DockerHub under [itsafeaturemythic](https://hub.docker.com/search?q=itsafeaturemythic&type=image).

Additionally, Mythic uses a number of custom PyPi packages to help control and sync information between all of the containers as well as providing an easy way to script access to the server.

All of this can be found on the [MythicMeta](https://github.com/MythicMeta):  
* Dockerfile configurations for all Docker images uploaded to DockerHub
* PyPi source code for all packages uploaded to PyPi
* Scripting source code

## Current Container PyPi Package requirements

Supported payload types must have the `mythic_payloadtype_container` PyPi package of 0.0.43.  
* The Payload Type container reports this as version 7.  

Supported c2 profiles must have the `mythic_c2_container` PyPi package of 0.0.22.  
* The C2 Profile container reports this as version 3.  

Supported translation containers must have the `mythic_translator_containter` PyPi package of 0.0.10.
* The Translator container reports this as version 3.  

## Documentation

All documentation for the Mythic project is being maintained on the [docs.mythic-c2.net](https://docs.mythic-c2.net) website.


## Contributions

A bunch of people have suffered through bug reports, changes, and fixes to help make this project better. Thank you!

The following people have contributed a lot to the project. As you see their handles throughout the project on Payload Types and C2 Profiles, be sure to reach out to them for help and contributions:
- [@djhohnstein](https://twitter.com/djhohnstein)
- [@xorrior](https://twitter.com/xorrior)
- [@Airzero24](https://twitter.com/airzero24)

## Sponsors

Mythic is very fortunate that the following people/corporations have sponsored the continued development efforts of Mythic at the $20+/month rate:

- Matthew Conway (@mattreduce): April 2022 - Present

## Liability

This is an open source project meant to be used with authorization to assess the security posture and for research purposes.
