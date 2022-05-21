#### Build docker image for chat-e2ee

We have provided a Dockerfile which can be used to set-up the entire system with a single command.

##### Requirements

    1. Docker compatible operating System.
    2. Docker CE 18.0 +
    3. MongoDB

##### Building the docker image

From the project root directory, issue the following command :

```
docker build . -f docker/Dockerfile -t chat-e2e:latest
```

##### Running the docker container

1. Create a .env file
   Create a new .env file which exports Mongo DB URI and secret keys, it will contain following ENV variables.

```
MONGO_URI=mongodb+srv://<username>:<password>@cluster0-zbsik.mongodb.net
MONGO_DB_NAME=''
CHAT_LINK_DOMAIN=''
IMAGE_BB_API_KEY=''
```

2. Run the container by passing the env files

Run with host networking mode.

```
docker run --rm  --net=host --env-file <your_env_file> chat_e2e:latest
```

You can now open `http://<your-ip>:3001` in your browser.


#### Using Docker-compose
With docker-compose you can run the app as a complete package that includes mongodb as well.
To run the app using docker-compose, first create a .env file with following variables:
```
MONGO_USERNAME=
MONGO_PASSWORD=
MONGO_PORT=27017
MONGO_DB_NAME=
CHAT_LINK_DOMAIN=
IMAGE_BB_API_KEY=
```
You can also edit `.env.docker.sample` and rename it as `.env`.
Now, run the docker-compose build
```
docker-compose build
```

Once the build completes, run the docker-compose file :
```
docker-compose up
```

You will see two services up and running. Now go to `localhost:3001` to use the app.