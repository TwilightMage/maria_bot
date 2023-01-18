import websocket from 'websocket';
import config from "./config.json" assert { type: "json" };
import login from "./login.json" assert { type: "json" };
import EventEmitter from 'events'
import * as utils from "./utils.js";

export default class DiscordGateway extends EventEmitter {
    ws;
    connection;
    dead = false;
    session_id = null;
    seq = null;
    heart_beats_in_process = 0;
    heart_beat_timer = null;
    reconnect_timer = null;
    ignore_opcodes = [1, 11]

    static opNames = ['00 Dispatch', '01 Heartbeat', '02 Identify', '03 Presence Update', '04 Voice State Update', '05', '06 Resume', '07 Reconnect', '08 Request Guild Members', '09 Invalid Session', '10 Hello', '11 Heartbeat ACK'];

    constructor() {
        super();

        const gateway = this;

        this.ws = new websocket.client();

        this.ws.on('connectFailed', (error) => {
            console.log(`${utils.io.marks.status} Gateway connect error: ${error.toString()}`);
            this.dead = true
        });

        this.ws.on('connect', async (connection) => {
            console.log(`${utils.io.marks.status} Gateway connected!`);

            this.connection = connection

            this.session_id = await utils.getGlobal('session_id');
            this.seq = await utils.getGlobal('seq', null);
            this.heart_beats_in_process = 0;
            this.heart_beat_timer = null;

            connection.on('error', function(error) {
                console.log(`${utils.io.marks.status} Gateway connection error: ${error.toString()}`);
            })

            connection.on('close', function(code) {
                console.log(`${utils.io.marks.status} Gateway connection closed: ${code}`);
                gateway.dead = true;
            })

            connection.on('message', async function(message) {
                if (message.type === 'utf8') {
                    const json = JSON.parse(message.utf8Data);
                    const op = json.op;
                    const d = json.d;
                    const t = json.t;

                    if (json.s !== null) {
                        gateway.seq = json.s;
                        await utils.setGlobal('seq', gateway.seq);
                    }

                    gateway.handleOp(op, t, d)
                } else {
                    console.log(`${utils.io.marks.status} Received message: ${JSON.stringify(message)}`);
                }
            })

            this.sendHeartBeat();
            this.heart_beat_timer = setInterval(() => this.sendHeartBeat(), 45000);
            if (this.session_id !== undefined) this.sendResume();
            else this.reidentify();
        })
    }

    reconnect() {
        this.dead = false;

        clearInterval(this.reconnect_timer);
        clearInterval(this.heart_beat_timer)

        if (this.connection != null) {
            this.connection.drop();
            this.connection = null;
        }

        this.reconnect_timer = setInterval(() => {
            if (this.dead) {
                this.reconnect();
            }
        }, 1000);

        this.ws.connect('wss://gateway.discord.gg/?v=10&encoding=json')
    }

    sendOp(op, d) {
        this.connection.sendUTF(JSON.stringify({op: op, d: d}));
        if (!this.ignore_opcodes.includes(op)) {
            console.log(`${utils.io.marks.out} ${utils.io.colors.FgCyan}${DiscordGateway.opNames[op]}${utils.io.colors.Reset}: ${JSON.stringify(d)}`);
        }
    }

    sendHeartBeat() {
        if (this.heart_beats_in_process >= 3) {
            console.error(`Gateway has ${this.heart_beats_in_process} unresponded heartbeats, restarting...`);
            clearInterval(this.heart_beat_timer)
            this.dead = true;
        } else {
            this.heart_beats_in_process++;
            this.sendOp(1, this.seq);
        }
    }

    sendIdentify() {
        this.sendOp(2, {
            token: login.discord_key,
            intents: 1 << 9 | 1 << 10 | 1 << 15,
            properties: {
                "$os": 'windows',
                "$browser": 'draco',
                "$device": 'draco'
            }
        });
    }

    reidentify() {
        this.seq = null;
        this.sendIdentify();
    }

    sendResume() {
        this.sendOp(6, {
            token: config.token,
            session_id: this.session_id,
            seq: this.seq
        });
    }

    handleOp(op, t, d) {
        if (!this.ignore_opcodes.includes(op)) {
            let op_name = !!t ? `00 ${t}` : DiscordGateway.opNames[op]
            console.log(`${utils.io.marks.in} ${utils.io.colors.FgCyan}${op_name}${utils.io.colors.Reset} [${this.seq}]: ${JSON.stringify(d)}`);
        }

        switch (op) {
            case 0:
                this.emit(t, d);
                switch (t) {
                    case 'READY':
                        this.session_id = d.session_id;
                        utils.setGlobal('session_id', this.session_id);
                        break;
                }
                break;
            case 9:
                this.reidentify();
                break;
            case 10:
                this.sendHeartBeat();
                this.heart_beat_timer = setInterval(() => this.sendHeartBeat(), d.heartbeat_interval);
                if (this.session_id !== undefined) this.sendResume();
                else this.reidentify();
                break;
            case 11:
                this.heart_beats_in_process--;
                break;
        }
    }
}