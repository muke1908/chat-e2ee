#!/bin/bash

#change this to your target
CHAT_APP_URL='https://chate2ee.fun/'
TARGET_DIR=${HOME}

#install nativefier
sudo npm install -g nativefier

#build the application
nativefier ${CHAT_APP_URL} ${TARGET_DIR}