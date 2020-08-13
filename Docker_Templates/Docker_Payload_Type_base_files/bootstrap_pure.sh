#!/bin/bash
#
# Contains the Go tool-chain pure-Go bootstrapper, that as of Go 1.5, initiates
# not only a few pre-built Go cross compilers, but rather bootstraps all of the
# supported platforms from the origin Linux amd64 distribution.
#
# Usage: bootstrap_pure.sh
#
# Environment variables for remote bootstrapping:
#   FETCH         - Remote file fetcher and checksum verifier (injected by image)
#   ROOT_DIST     - 64 bit Linux Go binary distribution package
#   ROOT_DIST_SHA - 64 bit Linux Go distribution package checksum
#
# Environment variables for local bootstrapping:
#   GOROOT - Path to the lready installed Go runtime
set -e

# Download, verify and install the root distribution if pulled remotely
if [ "$GOROOT" == "" ]; then
  $FETCH $ROOT_DIST $ROOT_DIST_SHA

  tar -C /usr/local -xzf `basename $ROOT_DIST`
  rm -f `basename $ROOT_DIST`

  export GOROOT=/usr/local/go
fi
export GOROOT_BOOTSTRAP=$GOROOT

echo "Bootstrapping linux/arm64..."
GOOS=linux GOARCH=arm64 CGO_ENABLED=1 CC=aarch64-linux-gnu-gcc-5 go install std

echo "Bootstrapping darwin/amd64..."
GOOS=darwin GOARCH=amd64 CGO_ENABLED=1 CC=o64-clang go install std

# Install xgo within the container to enable internal cross compilation
echo "Installing xgo-in-xgo..."
go get -u github.com/karalabe/xgo
ln -s /go/bin/xgo /usr/bin/xgo