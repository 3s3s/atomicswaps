'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
exports.DEBUG = true;

exports.MAX_CONNECTIONS = 10;
exports.MAX_DATA_LENGTH = 1024*10; //10 kb should be enought

exports.seeders = ["82.118.22.155:10443", "trade.multicoins.org:10443"];

const SSL_KEY_PATH = __dirname+"/server/ssl_cert/privkey.pem";
const SSL_CERT_PATH = __dirname+"/server/ssl_cert/fullchain.pem";

exports.SQLITE_PATH = __dirname+"/server/sqlite.db";

exports.my_portSSL = 10443;

exports.SSL_options = typeof window !== 'undefined' ? {} : {
    key: require("fs").readFileSync(SSL_KEY_PATH),
    cert: require("fs").readFileSync(SSL_CERT_PATH)
};

exports.WEB_SOCKETS = {};

exports.dbTables = [
    {
       'name' : 'peers',
       'cols' : [
           ['address', 'TEXT UNIQUE PRIMARY KEY'],
           ['time', 'INTEGER']
         ]
    },
]; 

