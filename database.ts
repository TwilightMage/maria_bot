import config from "./config.json" assert { type: "json" };
import {Sequelize, Model, DataTypes, InferCreationAttributes, InferAttributes, CreationOptional} from 'sequelize';
import * as utils from "./utils";

const sequelize = new Sequelize('db', '', '', {
    dialect: 'sqlite',
    storage: config.database,
    pool: {
        max: 5,
        min: 0,
        idle: 10000
    },
    logging: config.log_database ? (msg) => console.log(`${utils.io.marks.query} ${msg}`) : false,
    logQueryParameters: true
})

export class Conversation extends Model<InferAttributes<Conversation>, InferCreationAttributes<Conversation>> {
    declare id: CreationOptional<number>
    declare user: string
    declare server: string
    declare channel: string
    declare message: string
    declare replies: string
    declare time: number
    declare valid: CreationOptional<boolean>
    declare hastebins: CreationOptional<string>

    reply_list() {
        return this.replies.split(' ')
    }
}

Conversation.init( {
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
        server: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        channel: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        replies: {
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
        },
        hastebins: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '{}'
        }
    },
    {
        sequelize,
        timestamps: false
    }
)

export class Event extends Model<InferAttributes<Event>, InferCreationAttributes<Event>> {
    declare id: CreationOptional<number>
    declare time: number
    declare type: string
    declare message: string
    declare query: string
}

Event.init( {
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
        sequelize,
        timestamps: false
    }
)

export class Global extends Model<InferAttributes<Global>, InferCreationAttributes<Global>> {
    declare name: string
    declare value: string | null

}

Global.init( {
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
        sequelize,
        timestamps: false
    }
)

export class Person extends Model<InferAttributes<Person>, InferCreationAttributes<Person>> {
    declare user: string
    declare bio_3: string
    declare bio_2: string
    declare bio_src: string
    declare name: string
    declare is_female: boolean
}

Person.init({
        user: {
            type: DataTypes.TEXT,
            allowNull: false,
            primaryKey: true
        },
        bio_3: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        bio_2: {
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
        sequelize,
        timestamps: false
    }
)

export class RolePool extends Model<InferAttributes<RolePool>, InferCreationAttributes<RolePool>> {
    declare id: CreationOptional<number>
    declare text_id: string
    declare server_id: string
    declare title: CreationOptional<string> | null
    declare description: CreationOptional<string> | null
    declare message_channel_id: string
    declare message_id: string

    async get_roles() {
        return await Role.findAll({where: {pool_id: this.id}})
    }
}

RolePool.init( {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        text_id: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        server_id: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        title: {
            type: DataTypes.TEXT,
        },
        description: {
            type: DataTypes.TEXT,
        },
        message_channel_id: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        message_id: {
            type: DataTypes.TEXT,
            allowNull: false,
        }
    },
    {
        sequelize,
        timestamps: false,
        indexes: [
            {
                type: 'UNIQUE',
                fields: ['server_id', 'message_channel_id', 'message_id']
            }
        ]
    }
)

export class Role extends Model<InferAttributes<Role>, InferCreationAttributes<Role>> {
    declare id: CreationOptional<number>
    declare role: string
    declare emoji: string
    declare pool_id: number

    async get_pool() {
        return await RolePool.findOne({where: {id: this.pool_id}})
    }
}

Role.init( {
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
        }
    },
    {
        sequelize,
        timestamps: false,
        indexes: [
            {
                type: 'UNIQUE',
                fields: ['role', 'pool_id']
            }
        ]
    }
)

export class ServerConfig extends Model<InferAttributes<ServerConfig>, InferCreationAttributes<ServerConfig>> {
    declare server_id: string
    declare bot_role: CreationOptional<string> | null
    declare roles_channel: CreationOptional<string> | null
    declare potd_channel: CreationOptional<string> | null
}

ServerConfig.init({
        server_id: {
            type: DataTypes.TEXT,
            primaryKey: true,
            allowNull: false
        },
        bot_role: {
            type: DataTypes.TEXT
        },
        roles_channel: {
            type: DataTypes.TEXT
        },
        potd_channel: {
            type: DataTypes.TEXT
        }
    },
    {
        sequelize,
        timestamps: false
    }
)

Role.belongsTo(RolePool, {foreignKey: 'pool_id', targetKey: 'id'})
RolePool.hasMany(Role, {foreignKey: 'pool_id', sourceKey: 'id'})

await Conversation.sync()
await Event.sync()
await Global.sync()
await Person.sync()
await RolePool.sync()
await Role.sync()
await ServerConfig.sync()