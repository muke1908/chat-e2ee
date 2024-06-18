FROM node:lts-alpine as BUILD

WORKDIR /chat-e2ee
# todo break apart client and server dep installs/builds so that they can be cached b/w builds
COPY . /chat-e2ee/ 

RUN npm install 

RUN npm run build

# todo - multi part build (lets us slim down container to not unclude all the webpack stuff)

FROM node:lts-alpine

WORKDIR /chat-e2ee
COPY package*.json /chat-e2ee/
RUN mkdir -p /chat-e2ee/client/build
COPY --from=BUILD  /chat-e2ee/dist /chat-e2ee/dist
COPY --from=BUILD /chat-e2ee/client/build /chat-e2ee/client/build

# dont install dev deps
ENV NODE_ENV "production"
# dont run scripts to avoid pulling all client build deps + stuff
RUN npm ci --ignore-scripts=true --omit dev

EXPOSE 3001
USER node
#Set production mode deployment

ENTRYPOINT [ "npm", "run", "docker_start" ]
