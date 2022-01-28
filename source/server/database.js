'use strict';

const g_constants = require("../constants")
const sqlite3 = require('sqlite3');

let database = {}
exports.Init = function()
{
    database = new sqlite3.Database(g_constants.SQLITE_PATH);
    database.configure("busyTimeout", 1);

    for (let i=0; i<g_constants.dbTables.length; i++)
    {
        g_constants.dbTables[g_constants.dbTables[i]['name']] = g_constants.dbTables[i];
        
        g_constants.dbTables[i]["Insert"] = function () { 
            Insert(g_constants.dbTables[i], arguments);
        }
        g_constants.dbTables[i]['Delete'] = function () {
            Delete(g_constants.dbTables[i], arguments);
        };
        g_constants.dbTables[i]['Select'] = function (cols = "*", where = "", other = "") {
            const name = g_constants.dbTables[i].name;
            return new Promise(ok => {
                SelectAll(cols, name, where, other, (err, rows) => {
                    if (err || !rows) return ok([]);
                    console.log("select return no error");
                    ok(rows);
                });
            });
        }            
        CreateTable(g_constants.dbTables[i]);
    }
}

function CreateTable(table)
{
    var cols = ' (';
    for (var i=0; i<table.cols.length; i++) {
        cols += table.cols[i][0] + ' ' + table.cols[i][1];
        
        if (i != table.cols.length-1)
            cols += ', ';
    }
    
    if (table.commands) cols += ", "+table.commands;

    cols += ')';
    
    database.run('CREATE TABLE IF NOT EXISTS ' + table.name + cols, err => {
        if (err)
            console.log(err.message);
    });
}


function Insert(tableObject, values)
{
    try {
        const callbackERR = values[values.length-1];
        
        let keys = 0;
        for (let k=0; k<tableObject.cols.length; k++)
        {
            if (tableObject.cols[k][0].indexOf("PRIMARY") == 0 || tableObject.cols[k][0].indexOf("UNIQUE") == 0)
                keys++;
        }
        
        if (values.length-1 != tableObject.cols.length-keys ) 
        {
            console.log('ERROR: Insert to table "'+tableObject.name+'" failed arguments count: ' + (values.length-1));
            
            if (callbackERR)
                return setTimeout(callbackERR, 1, new Error('ERROR: Insert to table "'+tableObject.name+'" failed arguments count: ' + (values.length-1))); //callbackERR(true);
        }
        
        var vals = ' (';
        for (var i=0; i<values.length-1; i++) {
            vals += "'" + escape(values[i]) + "'";
            
            if (i != values.length-2)
                vals += ', ';
        }
        vals += ')';
        
        console.log('INSERT INTO ' + tableObject.name + ' VALUES ' + vals);
        
        database.run('REPLACE INTO ' + tableObject.name + ' VALUES ' + vals, err => {
            if (callbackERR) setTimeout(callbackERR, 1, err); 
            if (err) 
                console.log('INSERT error: ' + err.message);
            else
                console.log('INSERT success');
        });
    }
    catch(e) {
        console.log("Insert catch error "+e.message);
    }
}

function SelectAll(cols, table, where, other, callback) 
{
    try {
        let query = "SELECT " + cols + " FROM " + table;
        if (where.length)
            query += " WHERE " + where;
        if (other.length)
             query += " " + other; 
             
        if (!callback) 
            console.log("WARNING: SelectAll callback undefined!!!");

        database.all(query, (err, rows) => {
            if (err) 
            {
                try {
                    console.log("SELECT ERROR: query="+query+" message=" + JSON.stringify(err));
                }catch(e) {
                    console.log(e.message)
                }
            }
            
            query = null;
            if (callback) setTimeout(callback, 1, err, rows);
        });
    }
    catch (e) {
        console.log(e.message);
        if (callback) setTimeout(callback, 1, e, []); //callback(e);
    }
}

function Delete(tableObject, where, callback)
{
    try
    {
        remoteRun('DELETE FROM ' + tableObject.name + ' WHERE ' + where, err => {
            if (callback) setTimeout(callback, 1, err); //callback(err)
            if (!err) 
                return;
            console.log('DELETE error: ' + err.message);
        });
    }
    catch(e)
    {
        if (callback) setTimeout(callback, 1, e); //callback(e);
        console.log("Delete catch error "+e.message);
    }
}
