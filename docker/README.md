#### Build docker image for chat-e2ee

We have provided a Dockerfile which can be used to set-up the entire system with a single command.

##### Requirements

    1. Docker compatible operating System.
    2. Docker CE 18.0 +
    3. MongoDB
    4. Recaptcha 2.0 account with client and server keys

##### Building the docker image

From the project root directory, issue the following command :
You need to provide the client side recaptcha-key as a build time argument.

```
docker build . -f docker/Dockerfile --build-arg recaptcha_client_key=<your_client_recaptcha_key> -t chat-e2e:latest
```

##### Running the docker container

1. Create a .env file
   Create a new .env file which exports Mongo DB URI and secret keys, it will contain following ENV variables.

```
GOOGLE_RECAPTCHA_SECRET=''
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
