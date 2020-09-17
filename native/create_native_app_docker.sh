#!/bin/bash

docker pull jiahaog/nativefier
V_MOUNT_PATH=${HOME}  #change this to your desired path

#change this to your target
CHAT_APP_URL='https://chate2ee.fun/'

docker run -v ${V_MOUNT_PATH}:/target/ jiahaog/nativefier ${CHAT_APP_URL} /target/