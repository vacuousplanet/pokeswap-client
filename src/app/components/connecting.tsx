import React, {useState, useEffect} from 'react'

import io from 'socket.io-client';

import {useHistory} from 'react-router-dom';

import { ipcRenderer } from 'electron';

interface ConnectingParams {
    mode: string;
};

interface ConnectingProps {
    socket_server: SocketIOClient.Socket;
}

interface LobbySettings {
    username: string;
    gamepath: string;
    lobby_size: number;
    lobby_code: string;
    lobby_password: string;
}

const LobbyConnecting = () => {

    let history = useHistory();

    const [server_settings, updateServerSettings] = useState(ipcRenderer.sendSync('get-server-settings'));

    const [status_message, updateMessage] = useState('');

    useEffect( () => {
        const socket_server: SocketIOClient.Socket = io.connect(ipcRenderer.sendSync('get_server_url'), {reconnection: true});
        const lobby_init_mode: string = ipcRenderer.sendSync('get-lobby-init-mode');

        if (lobby_init_mode === "create" || lobby_init_mode === "join") {
            socket_server.emit(lobby_init_mode, server_settings, (a: LobbySettings, status: string) => {
                if (status === 'ok') {

                    ipcRenderer.send('lobby-init', 'success');
                    // update the lobby
                    Object.entries(a).forEach(pair => {
                        if(pair[0] !== 'gamepath') {
                            console.log(pair)
                            ipcRenderer.send('update_lobby_settings', pair[0], pair[1]);
                        }
                    });


                    // update the server settings
                    updateServerSettings(a);

                    // add relevant listeners to the socket
                    socket_server.on('player-joined', (msg: string) => {
                        updateMessage(msg);
                    });
                
                    socket_server.on('player-ready', (msg: string) => {
                        updateMessage(msg);
                    });
                
                    socket_server.on('beat-gym', (msg: string) => {
                        updateMessage(msg);
                    });

                    // add game listeners
                    ipcRenderer.on('game-signal', (event, ...args) => {
                        // decode signal from game (like I guess just gym stuff?)
                        socket_server.emit('beat-gym');
                    });

                    ipcRenderer.on('player-ready', (event, ...args) => {
                        console.log('yo waddup');
                        console.log(socket_server.hasListeners('player-ready'));
                        socket_server.emit('ready');
                    });
                } else {
                    history.push('/lobby');
                }
            });
        }
    }, []);

    const [ready, toggleReady] = useState(ipcRenderer.sendSync('get-lobby-init-mode') === 'ready');

    return (
        <>
        <h2>{server_settings.lobby_code}</h2>
        <div>
            <button hidden={ready} onClick={
                (event) => {
                    // notify ipc
                    ipcRenderer.send('render-ready');
                    toggleReady(true);
                }
            }>
                Ready
            </button>
            <h4 hidden={!ready}>
                {status_message}
            </h4>
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