FROM node:lts-alpine
#Set production mode deployment
ENV NODE_ENV "production"

COPY package*.json /chat-e2ee

WORKDIR /chat-e2ee 

RUN npm install 

#copy the content of current directory to /app inside container
COPY . /chat-e2ee

RUN npm run build 

# todo - multi part build (lets us slim down container to not unclude all the webpack stuff)

RUN rm .env.sample

EXPOSE 3000
USER node

ENTRYPOINT [ "npm", "run", "docker_start" ]
