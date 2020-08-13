#!/bin/bash
#
# Contains a simple fetcher to download a file from a remote URL and verify its
# SHA1 or SHA256 checksum (selected based on provided length).
#
# Usage: fetch.sh <remote URL> <SHA1/SHA256 checksum>
set -e

# Skip the download if no operands specified
if [ "$1" == "" -o "$2" == "" ]; then
  echo "Fetch operands missing, skipping..."
  exit
fi

# Pull the file from the remote URL
file=`basename $1`
echo "Downloading $1..."
wget -q $1

# Generate a desired checksum report and check against it
echo "$2  $file" > $file.sum
if [ "${#2}" == "40" ]; then
  sha1sum -c $file.sum
else
  sha256sum -c $file.sum
fi
rm $file.sum