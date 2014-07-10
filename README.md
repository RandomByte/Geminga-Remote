Geminga-Remote
=============

Remote node for [Geminga](https://github.com/RandomByte/Geminga)

# Installation
1. Clone this repository
2. Run '$ npm install' to install all dependencies
3. Copy config.example.json to config.json and fill it with your data (see chapter "Configuration")
4. Generate a token for the Geminga server by running '$ node geminga-remote.js token'
5. Run geminga-remote.js with the actions you'd like to use! For example using [supervisor](https://github.com/isaacs/node-supervisor) '$ supervisor -q -- geminga-remote.js shutdown getUptime vpn-start vpn-stop >> /var/log/geminga-remote.log'
