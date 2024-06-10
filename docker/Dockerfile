FROM node:lts-alpine
#Set production mode deployment
ENV NODE_ENV "production"
WORKDIR /chat-e2ee
# todo break apart client and server dep installs/builds
COPY . /chat-e2ee/ 

RUN npm install 

RUN npm run build 

# todo - multi part build (lets us slim down container to not unclude all the webpack stuff)

RUN rm .env.sample

EXPOSE 3000
USER node

ENTRYPOINT [ "npm", "run", "docker_start" ]
