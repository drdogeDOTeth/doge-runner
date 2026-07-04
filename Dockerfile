# DOGE RUNNER / DOGE KADE REMIX — static site image
# The games are self-contained HTML files; nginx just serves them.

FROM nginx:alpine

COPY index.html arcade.html /usr/share/nginx/html/

# nginx:alpine listens on 80 by default; Coolify routes to it via Traefik
EXPOSE 80
