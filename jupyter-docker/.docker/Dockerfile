FROM jupyter/minimal-notebook:python-3.11

# for offline builds, add ability for custom PIP repositories
ARG PIP_INDEX
ARG PIP_INDEX_URL
ARG PIP_TRUSTED_HOST

RUN pip3 install mythic==0.2.5

WORKDIR /projects

#CMD start.sh jupyter lab --ServerApp.open_browser=false --IdentityProvider.token='' --ServerApp.base_url="/jupyter" --ServerApp.default_url="/jupyter"

ENV JUPYTERHUB_SERVICE_PREFIX "/jupyter/"
ENV JUPYTER_TOKEN "mythic"

COPY ["jupyter/", "."]

CMD start.sh jupyter lab --ServerApp.open_browser=false --IdentityProvider.token=${JUPYTER_TOKEN:-mythic} --ServerApp.base_url="/jupyter" --ServerApp.default_url="/jupyter"
# sudo docker run -p 8888:8888 -v `pwd`/jupyter:/projects jupyter
