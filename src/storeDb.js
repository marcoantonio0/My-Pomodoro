

const fs = require('fs');
const initSqlJs = require('../node_modules/sql.js/dist/sql-asm');
const path = require('path');

class Db {
    constructor(app){
        this.app = app;
        this.database = null;
    }

    async initiateDb(callback) {
        const SQL = await initSqlJs();
        let pathApp = path.join(this.app.getPath('appData'), this.app.name);
        if(fs.existsSync(path.join(pathApp,`${this.app.name}.sqlite`))) {
            const filebuffer = fs.readFileSync(path.join(pathApp,`${this.app.name}.sqlite`));
            this.database = new SQL.Database(filebuffer); 
        } else {
            this.database = new SQL.Database();
            this.database.run(`CREATE TABLE IF NOT EXISTS tasks (
                title TEXT NOT NULL,
                note TEXT,
                est_pomo INT,
                checked BOOLEAN,
                total_pomo INT,
                created_at TEXT
            );`);
            this.database.run(`CREATE TABLE IF NOT EXISTS configs (
                focus_time INT,
                break_time INT,
                longbreak_time INT,
                auto_break BOOLEAN,
                auto_pomo BOOLEAN,
                notification_time INT
            );`);
            this.database.run(`CREATE TABLE IF NOT EXISTS logs (
                pomo_day INTEGER,
                time_start INTEGER,
                time_end INTEGER,
                type_current VARCHAR(100)
            );`);
            this.database.run(`INSERT INTO configs (focus_time, break_time, longbreak_time, auto_break, auto_pomo, notification_time) VALUES
                (25, 5, 15, 0, 0, 5)
            `);
            const data = this.database.export();
            const buffer = new Buffer(data);
            fs.writeFileSync(path.join(pathApp,`${this.app.name}.sqlite`), buffer);
        }
        callback()
    }

    getDb(){
        return this.database;
    }

    exportDb(){
        let pathApp = path.join(this.app.getPath('appData'), this.app.name);
        const data = this.database.export();
        const buffer = new Buffer(data);
        fs.writeFileSync(path.join(pathApp,`${this.app.name}.sqlite`), buffer);
    }
   
}

module.exports = Db;
