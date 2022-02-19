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
        g_constants.dbTables[i]["Update"] = function (SET, WHERE) { 
            Update(g_constants.dbTables[i], SET, WHERE);
        }
        g_constants.dbTables[i]['Delete'] = function (WHERE, callback = null) {
            Delete(g_constants.dbTables[i], WHERE, callback);
        };
        g_constants.dbTables[i]['Select'] = function (cols = "*", where = "", other = "") {
            const name = g_constants.dbTables[i].name;
            return new Promise(ok => {
                SelectAll(cols, name, where, other, (err, rows) => {
                    if (err || !rows) return ok([]);
                    //console.log("select return no error");
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
        
        if (i != table.cols.length-1) cols += ', ';
    }
    
    if (table.commands) cols += ", "+table.commands;

    cols += ')';
    
    database.run('CREATE TABLE IF NOT EXISTS ' + table.name + cols, err => {
        if (err) console.error(err.message);
    });
}

function Update(tableObject, SET, WHERE)
{
    try {
        database.run(`UPDATE ${tableObject.name} SET ${SET} WHERE ${WHERE}`, err => {
            if (err)
                console.log(err);
        })
    }
    catch(e) {
        console.log(e)
    }

}
function Insert(tableObject, values)
{
    try {
        const callbackERR = values[values.length-1];
        
        let keys = 0;
        for (let k=0; k<tableObject.cols.length; k++) {
            if (tableObject.cols[k][0].indexOf("PRIMARY") == 0 || tableObject.cols[k][0].indexOf("UNIQUE") == 0)
                keys++;
        }
        
        if (values.length-1 != tableObject.cols.length-keys ) {       
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
        
        database.run('REPLACE INTO ' + tableObject.name + ' VALUES ' + vals, err => {
            if (callbackERR) setTimeout(callbackERR, 1, err); 
            if (err) 
                console.error('INSERT error: ' + err.message);
        });
    }
    catch(e) {
        console.error("Insert catch error "+e.message);
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
            if (err) {
                try {
                    console.error("SELECT ERROR: query="+query+" message=" + JSON.stringify(err));
                }catch(e) {
                    console.error(e.message)
                }
            }
            
            query = null;
            if (callback) setTimeout(callback, 1, err, rows);
        });
    }
    catch (e) {
        console.error(e.message);
        if (callback) setTimeout(callback, 1, e, []); //callback(e);
    }
}

function Delete(tableObject, where, callback)
{
    try
    {
        database.run('DELETE FROM ' + tableObject.name + ' WHERE ' + where, err => {
            if (callback) setTimeout(callback, 1, err); //callback(err)
            if (!err) 
                return;
            console.error('DELETE error: ' + err.message);
        });
    }
    catch(e)
    {
        if (callback) setTimeout(callback, 1, e); //callback(e);
        console.error("Delete catch error "+e.message);
    }
}
