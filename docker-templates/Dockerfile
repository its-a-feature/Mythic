FROM golang:1.20-buster

ARG CA_CERTIFICATE
ARG NPM_REGISTRY
ARG PYPI_INDEX
ARG PYPI_INDEX_URL
ARG DOCKER_REGISTRY_MIRROR
ARG HTTP_PROXY
ARG HTTPS_PROXY

# install .net core
RUN wget https://packages.microsoft.com/config/debian/10/packages-microsoft-prod.deb -O packages-microsoft-prod.deb && \
    dpkg -i packages-microsoft-prod.deb && \
    rm packages-microsoft-prod.deb

# install mono, protoc protobufs, and .net core 
RUN apt-get -y update && \
    apt-get -y autoremove && \
    apt-get clean && \
    apt install --no-install-recommends -y apt-transport-https dirmngr gnupg ca-certificates && \
    apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 3FA7E0328081BFF6A14DA29AA6A19B38D3D831EF && \
    echo "deb https://download.mono-project.com/repo/debian stable-buster main" | tee /etc/apt/sources.list.d/mono-official-stable.list && \
    apt update && apt-get install --no-install-recommends software-properties-common apt-utils make build-essential libssl-dev zlib1g-dev libbz2-dev nuget \
    libreadline-dev libsqlite3-dev llvm libncurses5-dev libncursesw5-dev xz-utils tk-dev libffi-dev liblzma-dev mono-complete protobuf-compiler dotnet-sdk-7.0 gcc-mingw-w64  -y && \
    rm -rf /var/lib/apt/lists/*

# install python 3.11
RUN wget https://www.python.org/ftp/python/3.11.1/Python-3.11.1.tgz && \
    tar xvf Python-3.11.1.tgz && \
    Python-3.11.1/configure --with-ensurepip=install && \
    make -j8 && \
    make install

COPY requirements.txt /
RUN pip3 install -r /requirements.txt

RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install mvdan.cc/garble@latest

RUN mkdir -p "/Windows/assembly/GAC_MSIL/System.Management.Automation/1.0.0.0__31bf3856ad364e35"
COPY ["System.Management.Automation.dll", "/Windows/assembly/GAC_MSIL/System.Management.Automation/1.0.0.0__31bf3856ad364e35/System.Management.Automation.dll"]
RUN mkdir -p "/Windows/Microsoft.NET/assembly/GAC_MSIL/System.Management.Automation/v4.0_3.0.0.0__31bf3856ad364e35"
COPY ["System.Management.Automation.dll-v4", "/Windows/Microsoft.NET/assembly/GAC_MSIL/System.Management.Automation/v4.0_3.0.0.0__31bf3856ad364e35/System.Management.Automation.dll"]

# allow cross compilation for macOS
# Configure the container for OSX cross compilation
RUN ln -s /usr/include/asm-generic /usr/include/asm

RUN bash -c "$(wget -O - https://apt.llvm.org/llvm.sh)"
RUN apt-get install --no-install-recommends clang-15 clang-15++ cmake -y
RUN ln -s /usr/bin/clang-15 /usr/bin/clang
RUN ln -s /usr/bin/clang++-15 /usr/bin/clang++
ENV OSX_SDK 12.1
RUN cd / && git clone --depth 1 https://github.com/tpoechtrager/osxcross.git && \
  cd osxcross && curl -fsSL -O https://github.com/joseluisq/macosx-sdks/releases/download/${OSX_SDK}/MacOSX${OSX_SDK}.sdk.tar.xz && \
  mv MacOSX${OSX_SDK}.sdk.tar.xz tarballs/ && UNATTENDED=yes ./build.sh && rm -rf  /build/osxcross/tarballs/

ENV PATH /osxcross/target/bin:$PATH
ENV LD_LIBRARY_PATH=/osxcross/target/lib