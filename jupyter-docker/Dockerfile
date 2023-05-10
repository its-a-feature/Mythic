FROM jupyter/base-notebook:python-3.10

RUN pip3 install mythic==0.1.0

WORKDIR /projects

#CMD start.sh jupyter lab --ServerApp.open_browser=false --IdentityProvider.token='' --ServerApp.base_url="/jupyter" --ServerApp.default_url="/jupyter"

ENV JUPYTERHUB_SERVICE_PREFIX "/jupyter/"

# sudo docker run -p 8888:8888 -v `pwd`/jupyter:/projects jupyter
