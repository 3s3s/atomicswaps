'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
exports.DEBUG = true;

exports.MAX_CONNECTIONS = 10;

exports.seeders = ["82.118.22.155:10443", "144.76.71.116:10443"];

exports.SQLITE_PATH = __dirname+"/server/sqlite.db";

exports.my_port = 10080;

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

