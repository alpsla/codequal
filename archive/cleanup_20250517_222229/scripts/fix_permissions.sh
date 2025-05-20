#!/bin/bash

# This script will make the make_scripts_executable.sh script executable and then run it

echo "Making make_scripts_executable.sh script executable..."
chmod +x /Users/alpinro/Code\ Prjects/codequal/scripts/make_scripts_executable.sh

echo "Running make_scripts_executable.sh..."
/Users/alpinro/Code\ Prjects/codequal/scripts/make_scripts_executable.sh

echo "All scripts should now be executable. Try running explore_deepwiki_k8s.sh again."
