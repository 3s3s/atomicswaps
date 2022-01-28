'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
exports.DEBUG = true;

exports.MAX_CONNECTIONS = 10;

const SSL_KEY_PATH = __dirname+"/../ssl_cert/privkey.pem";
const SSL_CERT_PATH = __dirname+"/../ssl_cert/fullchain.pem";

exports.SQLITE_PATH = __dirname+"/server/sqlite.db";

//exports.my_port = 10080;
exports.my_portSSL = 10443;

exports.SSL_options = {
    key: require("fs").readFileSync(SSL_KEY_PATH),
    cert: require("fs").readFileSync(SSL_CERT_PATH)
};

exports.WEB_SOCKETS = null;

exports.dbTables = [
    {
       'name' : 'peers',
       'cols' : [
           ['address', 'TEXT UNIQUE PRIMARY KEY'],
           ['time', 'INTEGER']
         ]
    },
]; 

