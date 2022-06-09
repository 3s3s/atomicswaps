# Atomic swap client and server in node.js

Live version: https://3s3s.github.io/atomicswaps/browser/html/popup.html

Step-by-step install instructions:

1. Install nvm

For Linux:

```
[sudo] apt-get update
[sudo] apt-get install build-essential libssl-dev curl -y
curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh -o install_nvm.sh
bash install_nvm.sh
[sudo] reboot

nvm install 16.13.0
```

For Windows:

You can use terminal in Visual Studio Code https://code.visualstudio.com/download or in c9sdk https://cloud9-sdk.readme.io/docs/running-the-sdk

2. Clone repository and install modules (and submodules)

```
git clone https://github.com/3s3s/atomicswaps.git
cd atomicswaps
git submodule update --init --recursive
npm install
npm install -g forever
npm install -g browserify
```

3. Start P2P server

```
npm run server
```

Instead of running the server, you can compile the code for browser:

```
npm run compile
```

Or yuo can compile the code for the browser with a source map (for debug)

```
npm run compile_debug
```

The atomicswaps/browser directory will contain the code for the browser extension. It is compatible with Firefox and Chrome browsers.

Also you can run server as a background process (daemon)


```
npm run daemon
```

To stop the daemon jus type:

```
npm run daemon_stop
```
