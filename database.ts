import config from "./config.json";
import sqlite3 from "sqlite3";

export default class Database {
    public static readonly connection: sqlite3.Database = new sqlite3.Database(config.database);
}
