#!/bin/sh
cd vite
npm install
npm run build
cd ..
cd server
npm install
node ./main.js
