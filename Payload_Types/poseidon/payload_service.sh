#!/bin/bash

python3.6 /Apfell_service/apfell_heartbeat.py &

hostname=$(hostname)

python3.6 /Apfell_service/apfell_service.py "$hostname"
