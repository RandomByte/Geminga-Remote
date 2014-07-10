var net         = require('net'),
    JSONSocket  = require('json-socket'),
    tcpServer   = net.createServer(),
    sys         = require('sys'),
    exec        = require('child_process').exec,
    fs          = require('fs'),
    path        = require('path'),
    crypto      = require('crypto'),
    config      = require('./config.json'),

    tokenFilePath       = __dirname + '/token',
    token,
    aPossibleActions    = ['checkConnectivity', 'shutdown', 'getUptime', 'vpn-start', 'vpn-stop'],
    aActiveActions      = ['checkConnectivity']; // default

if (!config || !config.port) {
    console.log("There's something missing in your config.json, please refer to config.example.json for an example");
    process.exit(1);
}

if (process.argv.length < 3) {
    console.log("No arguments given - exiting");
    console.log("To generate a Token, run 'node geminga-remote.js token'");
    process.exit(1);
}

console.log("Implicit active actions: " + aActiveActions.toString());

process.argv.forEach(function (val, index, array) {
    if (index < 2) {
        return; // Skip
    } else if (val === "token") {
        crypto.randomBytes(48, function(ex, buf) {
            token = buf.toString('hex');
            console.log("********** Token generated **********");
            console.log(token);
            console.log("*************************************");

            fs.writeFile(tokenFilePath, token, function(err) {
                if(err) {
                    console.log(err);
                    console.log("Error saving token file at " + tokenFilePath);
                    process.exit(1);
                } else {
                    console.log("Token file saved at " + tokenFilePath);
                    console.log("Exiting now");
                    process.exit(0);
                }
            }); 
        });

    } else if (aPossibleActions.indexOf(val) === -1) {
        console.log("Invalid command " + val);
        process.exit(1);
    } else {
        console.log("Active action: " + val);
        aActiveActions.push(val);

        if (index === process.argv.length - 1) {
            fs.readFile(tokenFilePath, 'utf8', function (err,data) {
                if (err) {
                    console.log(err);
                    console.log("Error while reading the token from " + tokenFilePath);
                    process.exit(1);
                } else {
                    token = data.toString().split("\n")[0];
                }
            });

            tcpServer.listen(config.port);
            console.log('Geminga remote running on port ' + config.port);
        }
    }
});

tcpServer.on('connection', function(netSocket) {
    socket = new JSONSocket(netSocket);

    console.log("Connection from " + netSocket.remoteAddress + ":" + netSocket.remotePort);

    socket.on('message', function(msg) {
        if (msg.token !== token) {
            socket.sendEndMessage({ error: "Token missmatch" });
        } else if (aActiveActions.indexOf(msg.command) === -1) {
            socket.sendEndMessage({ error: "Action not active on this system" });
        } else {
            console.log("Received command: " + msg.command);
            switch (msg.command) {
                case "checkConnectivity":
                    var oStartedRegex = /VPN '[a-zA-Z0-9]*' is running/,
                        oStoppedRegex = /VPN '[a-zA-Z0-9]*' is not running/,
                        res = {
                            data: "Successful connection from " +
                                        netSocket.remoteAddress + ":" + netSocket.remotePort,
                            states: []
                        };

                    if (aActiveActions.indexOf('vpn-start') !== -1 || aActiveActions.indexOf('vpn-stop') !== -1) {
                        exec('sudo service openvpn status', function(err, stdout, stderr) {
                            if (err) {
                                console.log('VPN status check returned error code ' + err.code + ' - but probably it is just stopped');
                                console.log(stderr);
                            }
                            if (oStartedRegex.exec(stdout)) {
                                console.log("VPN is running");
                                res.states.push({ name: 'vpn', state: 'started' });
                            } else if (oStoppedRegex.exec(stdout)) {
                                console.log("VPN is not running");
                                res.states.push({ name: 'vpn', state: 'stopped' });
                            } else {
                                console.log("Can't parse service status response: " + stdout);
                            }
                            socket.sendEndMessage(res);
                        });
                    } else {
                        socket.sendEndMessage(res);
                    }

                break;
                case "shutdown":
                    exec('sudo /sbin/shutdown -h +1', function(err, stdout, stderr) {
                        if (err) {
                            console.log('Shutdown command exited with error code ' + err.code);
                            console.log(stderr);
                        } else {
                            console.log("Shutdown successfully initiated - but nobody cares...");
                        }
                    });
                    socket.sendEndMessage({ data: "Shutdown initiated: T-1 minute" });
                break;
                case "vpn-start":
                    exec('sudo service openvpn start', function(err, stdout, stderr) {
                        if (err) {
                            console.log('VPN start command exited with error code ' + err.code);
                            console.log(stderr);
                            socket.sendEndMessage({ error: "Error while starting VPN" });
                        } else {
                            console.log("VPN starting");
                            socket.sendEndMessage({ data: "VPN starting" });
                        }
                    });
                break;
                case "vpn-stop":
                    exec('sudo service openvpn stop', function(err, stdout, stderr) {
                        if (err) {
                            console.log('VPN stop command exited with error code ' + err.code);
                            console.log(stderr);
                            socket.sendEndMessage({ error: "Error while stopping VPN" });
                        } else {
                            console.log("VPN starting");
                            socket.sendEndMessage({ data: "VPN stopping" });
                        }
                    });
                break;
            }
        }
    });
});