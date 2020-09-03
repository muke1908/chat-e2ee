FROM node:12.18.3-buster

#Set production mode deployment
ENV NODE_ENV "Production"

#copy the content of current directory to /app inside container
COPY . /app

WORKDIR /app 

RUN npm install && npm run postinstall

RUN npm run build

RUN rm .env.sample

ENTRYPOINT [ "npm", "run", "docker_start" ]
