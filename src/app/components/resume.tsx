import React from 'react'

import {useHistory} from 'react-router-dom';

import { ipcRenderer } from 'electron';

import './lobby.scss';

// interface for lobby settings
// TODO: add gamepath/romPath into this
//       no need for it to be separate tbh
interface LobbySettings {
    username: string;
    gamepath: string;
    lobby_size: number;
    lobby_code: string;
    lobby_password: string;
    gym_status: number;
};

const Resume = () => {

    let history = useHistory();

    // TODO: this should probably just check for valid bizhawk path
    const bizhawk_path: string = ipcRenderer.sendSync('get_bizhawk_path');

    const server_URL_valid: boolean = ipcRenderer.sendSync('check_server_url');

    return (
        <>
        <div>
            <h3>
                Resume from file
            </h3>
        </div>
        <div>
            <button disabled={bizhawk_path === '' || !server_URL_valid}
                onClick={event=>{
                    event.preventDefault();
                    const start_lobby: boolean = ipcRenderer.sendSync('get-load-file');
                    if (start_lobby) {
                        history.push('/lobby/connect')
                    }
                }}
            >
                Load
            </button>
        </div>
        </>
    )
}

/*
example {lobby_code}.json

{
    game-path: '',
    savestate-path: '',
    gym-status: 123,
    player-list: [
        goof1,
        goof2,
        goof3,
        goof4,
        ...
    ],
    check-sums: [
        fjdkal,
        fjdkla,
        fdjojf,
        d9jf92,
        ...
    ],
}

*/

export default Resume;