import websocket from 'websocket';
import Cache from "./cache";
import config from "./config.json";
import EventEmitter from 'events'

export default class DiscordGateway extends EventEmitter {
    ws: websocket.client;
    connection: websocket.connection;
    dead: boolean = false;
    session_id: string = null;
    seq: number = null;
    heart_beats_in_process: number = 0;
    heart_beat_timer: NodeJS.Timer = null;
    reconnect_timer: NodeJS.Timer = null;

    constructor() {
        super();

        const gateway = this;

        this.ws = new websocket.client();

        this.ws.on('connectFailed', (error) => {
            console.log('Gateway connect error: ' + error.toString());
        });

        this.ws.on('connect', (connection) => {
            console.log('Gateway connected');

            this.connection = connection

            this.session_id = Cache.getValue('session_id');
            this.seq = Cache.getValue('seq', null);
            this.heart_beats_in_process = 0;
            this.heart_beat_timer = null;

            connection.on('error', function(error) {
                console.log("Gateway connection error: " + error.toString());
            })

            connection.on('close', function(code) {
                console.log('Gateway connection closed:', code);
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
                        Cache.setValue('seq', gateway.seq);
                    }

                    gateway.handleOp(op, t, d)
                } else {
                    console.log(`Received message: ${JSON.stringify(message)}`);
                }
            })
        })
    }

    public reconnect() {
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

        this.ws.connect('wss://gateway.discord.gg/?v=9&encoding=json')
    }

    private handleOp(op: number, t: string, d: any) {
        const sendOp = (op, d) => {
            this.connection.sendUTF(JSON.stringify({op: op, d: d}));
            console.log(`Sent op ${op}: ${JSON.stringify(d)}`);
        }

        const sendHeartBeat = () => {
            if (this.heart_beats_in_process >= 3) {
                console.error(`Gateway has ${this.heart_beats_in_process} unresponded heartbeats, restarting...`);
                clearInterval(this.heart_beat_timer)
                this.dead = true;
            } else {
                this.heart_beats_in_process++;
                sendOp(1, this.seq);
            }
        }

        const sendIdentify = () => {
            sendOp(2, {
                token: config.token,
                intents: 1 << 9 | 1 << 10,
                properties: {
                    "$os": 'windows',
                    "$browser": 'draco',
                    "$device": 'draco'
                }
            });
        }

        const reidentify = () => {
            this.seq = null;
            sendIdentify();
        }

        const sendResume = () => {
            sendOp(6, {
                token: config.token,
                session_id: this.session_id,
                seq: this.seq
            });
        }

        const op_name = op === 0 ? `${op} (${t})` : `${op}`;

        console.log(`Received op ${op_name} [${this.seq}]: ${JSON.stringify(d)}`);

        switch (op) {
            case 0:
                this.emit(t, d);
                switch (t) {
                    case 'READY':
                        this.session_id = d.session_id;
                        Cache.setValue('session_id', this.session_id);
                        break;
                }
                break;
            case 9:
                setTimeout(reidentify, 5000);
                break;
            case 10:
                sendHeartBeat();
                this.heart_beat_timer = setInterval(sendHeartBeat, d.heartbeat_interval);
                if (this.session_id !== undefined) sendResume();
                else reidentify();
                break;
            case 11:
                this.heart_beats_in_process--;
                break;
        }
    }
}