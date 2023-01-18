import config from "./config.json" assert { type: "json" };
import {Sequelize, Model, DataTypes} from 'sequelize';
import * as utils from "./utils.js";

const sequelize = new Sequelize('db', null, null, {
    dialect: 'sqlite',
    storage: config.database,
    pool: {
        max: 5,
        min: 0,
        idle: 10000
    },
    logging: (msg) => console.log(`${utils.io.marks.query} ${msg}`),
    logQueryParameters: true
});

export const Chat = sequelize.define('Chat', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        user: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        reply: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        chat_message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        chat_conversation: {
            type: DataTypes.TEXT,
            allowNull: false,
        }
    },
    {
        tableName: 'chat',
        timestamps: false
    });

export const UserConversation = sequelize.define('UserConversation', {
        user: {
            type: DataTypes.TEXT,
            allowNull: false,
            primaryKey: true,
        },
        conversation: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    },
    {
        tableName: 'user_conversation',
        timestamps: false
    });

export const Conversation = sequelize.define('Conversation', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        user: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        reply: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        time: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        valid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        }
    },
    {
        tableName: 'conversations',
        timestamps: false
    });

export const Event = sequelize.define('Event', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        time: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        type: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        query: {
            type: DataTypes.TEXT,
            allowNull: false,
        }
    },
    {
        tableName: 'events_log',
        timestamps: false
    });

export const Global = sequelize.define('Global', {
        name: {
            type: DataTypes.TEXT,
            allowNull: false,
            primaryKey: true
        },
        value: {
            type: DataTypes.TEXT,
        }
    },
    {
        tableName: 'globals',
        timestamps: false
    });

export const Person = sequelize.define('Person', {
        user: {
            type: DataTypes.TEXT,
            allowNull: false,
            primaryKey: true
        },
        bio: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        bio_src: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        name: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        is_female: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    },
    {
        tableName: 'person_knowledge',
        timestamps: false
    });

export const RolePool = sequelize.define('RolePool', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        message_id: {
            type: DataTypes.TEXT,
            allowNull: false,
        }
    },
    {
        tableName: 'role_pools',
        timestamps: false
    });

export const Role = sequelize.define('Role', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        role: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        emoji: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        pool_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'RolePool',
                key: 'id'
            }
        }
    },
    {
        tableName: 'roles',
        timestamps: false
    });
