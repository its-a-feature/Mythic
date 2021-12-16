FROM itsafeaturemythic/mythic_server:0.0.4
RUN python3.8 -m pip install pylatex
RUN python3.8 -m pip install pylatex[matplotlib] pylatex[matrices] pylatex[quantities]
RUN apt-get update && apt-get install latexmk texlive-latex-extra -y