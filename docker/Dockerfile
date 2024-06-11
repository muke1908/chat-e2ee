FROM node:lts-alpine

WORKDIR /chat-e2ee
# todo break apart client and server dep installs/builds so that they can be cached b/w builds
COPY . /chat-e2ee/ 

RUN npm install 

RUN npm run build

# todo - multi part build (lets us slim down container to not unclude all the webpack stuff)

RUN rm .env.sample

EXPOSE 3001
USER node
#Set production mode deployment
ENV NODE_ENV "production"
ENTRYPOINT [ "npm", "run", "docker_start" ]
