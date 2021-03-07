import React, {useState, useEffect, useContext} from 'react'
import io from 'socket.io-client';
import {useHistory} from 'react-router-dom';
import { ipcRenderer } from 'electron';

import { LobbySettingsContext, LocalPathSettingsContext } from '../contexts';
import { LobbySettings } from '../../common/LobbySettings';

import gameType from '../../common/gba_checker'

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

// TODO: only send necessary lobby info on game-start signal
//       also, need to send over game version, not gamepath, to server
//       not sure if that will necessitate a different object, or expanding
//       the lobby settings object's fields
const LobbyConnecting = () => {

    let history = useHistory();

    const [lobby_settings, updateLobbySettings] = useContext(LobbySettingsContext);

    const [local_path_settings, updateLocalPathSettings] = useContext(LocalPathSettingsContext);

    const [status_messages, updateMessages] = useState<string[]>([]);

    const updateMessagesCallback = (msg: string) => {
        updateMessages(arr => [...arr.slice(arr.length > 10 ? 1 : 0), msg]);
    }

    const [logged_on, updateLogStatus] = useState<boolean>(ipcRenderer.sendSync('get-lobby-init-mode') === 'success');

    useEffect( () => {
        const socket_server: SocketIOClient.Socket = io.connect(local_path_settings.server_url, {reconnection: true});
        const lobby_init_mode: string = ipcRenderer.sendSync('get-lobby-init-mode');

        if (lobby_init_mode === "create" || lobby_init_mode === "join" || lobby_init_mode === "resume") {
            const server_settings: LobbySettings = Object.assign({}, lobby_settings);
            server_settings.gamepath = gameType(lobby_settings.gamepath) || '';
            socket_server.emit(lobby_init_mode, server_settings, WithTimeout((a: LobbySettings, status: string) => {
                
                if (status === 'ok') {

                    ipcRenderer.send('lobby-init', 'success');
                    updateLogStatus(true)

                    // update the lobby settings
                    a.gamepath = lobby_settings.gamepath
                    updateLobbySettings({type: 'set', action: a});

                    // start loop for sending game data, etc (eye roll)
                    // I think I could just do a generic emit,
                    // passing 'upload-team' and 'beat-gym' as arg[0]
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
                        ipcRenderer.send('start_bizhawk', local_path_settings.bizhawk_path, lobby_settings.gamepath);
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
                ipcRenderer.send('user-error', 'Server Error', `Request to ${local_path_settings.server_url} timed out...`);
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
        <h2>{logged_on ? lobby_settings.lobby_code : ""}</h2>
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

export default LobbyConnecting;