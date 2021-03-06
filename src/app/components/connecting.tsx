import React, {useState, useEffect} from 'react'

import io from 'socket.io-client';

import {useHistory} from 'react-router-dom';

import { ipcRenderer } from 'electron';

interface LobbySettings {
    username: string;
    gamepath: string;
    lobby_size: number;
    lobby_code: string;
    lobby_password: string;
    gym_status: number;
}

const WithTimeout = (onSuccess: (a: LobbySettings, status: string) => void, onTimeout: () => void, timeout: number) => {
    let called = false;

    const timer = setTimeout(() => {
        if (called) return;
        called = true;
        onTimeout();
    }, timeout);

    return (...args: [LobbySettings, string]) => {
        if (called) return;
        called = true;
        clearTimeout(timer);
        onSuccess.apply(this, args);
    }
}

const LobbyConnecting = () => {

    let history = useHistory();

    const [server_settings, updateServerSettings] = useState<LobbySettings>(ipcRenderer.sendSync('get-server-settings'));

    const [status_messages, updateMessages] = useState<string[]>([]);

    const updateMessagesCallback = (msg: string) => {
        updateMessages(arr => [...arr.slice(arr.length > 10 ? 1 : 0), msg]);
    }

    const [logged_on, updateLogStatus] = useState<boolean>(ipcRenderer.sendSync('get-lobby-init-mode') === 'success');

    useEffect( () => {
        const server_URL = ipcRenderer.sendSync('get_server_url');
        const socket_server: SocketIOClient.Socket = io.connect(server_URL, {reconnection: true});
        const lobby_init_mode: string = ipcRenderer.sendSync('get-lobby-init-mode');

        if (lobby_init_mode === "create" || lobby_init_mode === "join" || lobby_init_mode === "resume") {
            socket_server.emit(lobby_init_mode, server_settings, WithTimeout((a: LobbySettings, status: string) => {
                
                if (status === 'ok') {

                    ipcRenderer.send('lobby-init', 'success');
                    updateLogStatus(true);
                    // update the lobby
                    Object.entries(a).forEach(pair => {
                        if(pair[0] !== 'gamepath') {
                            console.log(pair)
                            ipcRenderer.send('update_lobby_settings', pair[0], pair[1]);
                        }
                    });


                    // update the server settings
                    updateServerSettings(a);

                    // start loop for sending game data, etc (eye roll)
                    ipcRenderer.send('game-coms-loop-out');
                    ipcRenderer.on('game-coms-loop-in', (event, ...args) => {
                        console.log(`game signal: ${args[0]}`)
                        console.log(args[1]);
                        switch (args[0]) {
                            case 'team':
                                socket_server.emit('upload-team', args[1], updateMessagesCallback);
                                break;
                            case 'gym':
                                socket_server.emit('beat-gym', args[1], updateMessagesCallback);
                                break;
                            default:
                                break;
                        }
                        // resend signal for loopy-doopy time
                        ipcRenderer.send('game-coms-loop-out');
                    });

                    // add relevant listeners to the socket
                    socket_server.on('player-joined', updateMessagesCallback);

                    socket_server.on('player-ready', updateMessagesCallback);

                    socket_server.on('start-game', (player_list: string[], msg: string) => {
                        ipcRenderer.send('update_player_list', player_list);
                        updateMessagesCallback(msg);
                        // start bizhawk
                        ipcRenderer.send('start_bizhawk');
                    });
                    
                    socket_server.on('beat-gym', (gym_state: number, msg: string) => {
                        updateMessagesCallback(msg);
                        ipcRenderer.send('beat-gym', gym_state);
                    });

                    socket_server.on('new-teams-ready', () => {
                        socket_server.emit('download-team', (new_team: Uint8Array | undefined, status: string) => {
                            updateMessagesCallback(status);
                            if (new_team) {
                                ipcRenderer.send('new-team', new_team);
                            }
                        })
                    })

                    socket_server.on('player-disconnect', (msg: string) => {
                        ipcRenderer.send('player-disconnect');
                        updateMessagesCallback(msg)
                    });

                    socket_server.on('last-player', (msg: string) => {
                        // end session
                        ipcRenderer.send('last-player');
                        updateMessagesCallback(msg)
                    });

                    /*
                    // add game listeners
                    ipcRenderer.on('game-signal', (event, ...args) => {
                        // TODO: find a way to unify all of the codes!
                        console.log(`game signal: ${args[0]}`)
                        switch (args[0]) {
                            case 'team':
                                socket_server.emit('upload-team', args[1], updateMessagesCallback);
                                break;
                            case 'gym':
                                socket_server.emit('beat-gym', args[1], updateMessagesCallback);
                                break;
                            default:
                                break;
                        }
                    });
                    */

                    ipcRenderer.on('player-ready', (event, ...args) => {
                        console.log('yo waddup');
                        console.log(socket_server.hasListeners('player-ready'));
                        socket_server.emit('ready');
                    });

                    ipcRenderer.on('player-vote', (event, ...args) => {
                        socket_server.emit('continue-vote', args[0], (player_list: string[], status: string) => {
                            updateMessagesCallback(status)
                            if (status === "Ending session...") {
                                ipcRenderer.send('update_player_list', player_list);
                                ipcRenderer.send('end-session');
                                ipcRenderer.send('lobby-init', '');
                                history.push('/lobby')
                            } else if (status === "Continuing session...") {
                                ipcRenderer.send('update_player_list', player_list);
                                ipcRenderer.send('resume-emu');
                            }
                        });
                    });

                } else {
                    ipcRenderer.send('user-error', 'Server Error', status);
                    ipcRenderer.send('lobby-init', '');
                    history.push('/lobby');
                }
            }, () => {
                ipcRenderer.send('user-error', 'Server Error', `Request to ${server_URL} timed out...`);
                ipcRenderer.send('lobby-init', "");
                history.push('/lobby');
            }, 5000));
        }

        return () => {
            // TODO: tell main to handle game saving, maybe let server know
            socket_server.disconnect();
        }

    }, []);

    const [ready, toggleReady] = useState(ipcRenderer.sendSync('get-lobby-init-mode') === 'ready');

    return (
        <>
        <h2>{logged_on ? server_settings.lobby_code : ""}</h2>
        <div>
            <button hidden={ready || !logged_on} onClick={
                (event) => {
                    // notify ipc
                    ipcRenderer.send('render-ready');
                    toggleReady(true);
                }
            }>
                Ready
            </button>
            <div hidden={!ready}>
                {status_messages.map((msg: string, ind: number) =>
                    <div key={ind}>
                        <h4>
                            {msg}
                        </h4>
                    </div>
                )}
            </div>
        </div>
        </>
    )
    
}
/*
if (mode === 'create' || mode === 'join') {

    return (
        <>
        <div className="lds-holder">
                <div className="lds-ripple"><div></div><div></div><hr className="lds-hr"/></div>
                <h2>connecting to pokeswap servers...</h2>
        </div>
        </>
    );
});
}
*/
export default LobbyConnecting;