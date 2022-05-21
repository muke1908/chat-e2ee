FROM node:12.18.3-buster

#Set production mode deployment
ENV NODE_ENV "production"

#copy the content of current directory to /app inside container
COPY . /chat-e2ee

WORKDIR /chat-e2ee 

RUN npm install --unsafe-perm

RUN npm run build 

RUN rm .env.sample

ENTRYPOINT [ "npm", "run", "docker_start" ]
