// once server shit is added, this is gonna be a nightmare file

// update 01/24/2021 - oh yeah baybee it's nightmare time

import React, {useState} from 'react'

import {
    BrowserRouter as Router,
    Switch,
    Route,
    Link,
    Redirect
} from "react-router-dom";

import { ipcRenderer } from 'electron';

import './lobby.scss';

interface romPath {
    path: string;
    name: string;
};


function startGame(event: React.FormEvent<HTMLFormElement>, path: string) {
    console.log(path);
    ipcRenderer.send('start_bizhawk', path);
    event.preventDefault();
}

function changeSettings(settings: LobbySettings, prop: string, value: string | number): LobbySettings {
    return ipcRenderer.sendSync('update_lobby_settings', settings, prop, value);
}

/*
OK, so it's time to change this guy up a bit
First things first, let's think about lobby control flow (UI-wise), assuming proper config
    -> Create/Join Lobby
    -> Wait for all to lock start
    -> On all start, start game!
    -> Let main process handle things (maybe display some stuff)
    -> Figure out other stuff ??

What this means UI wise:
    -> Two tabs for Create/Join sections
    -> On create/join lobby, go to 'hidden' lobby tab

Alternatively:
    -> Instead of tabs, just split it right down the middle
    -> Use router here I guess?

For now, mimic the alpha site's options
    -> Share usernames
    -> Left create needs game version and lobby size
    -> Right join needs lobby code and pw (lol)
*/

// interface for lobby settings
// TODO: add gamepath/romPath into this
//       no need for it to be separate tbh
interface LobbySettings {
    username: string;
    lobby_size: number;
    lobby_code: string;
    lobby_password: string;
}

const Lobby = () => {

    const romlist: romPath[] = ipcRenderer.sendSync('get_roms_list');

    const bizhawk_path: string = ipcRenderer.sendSync('get_bizhawk_path');

    // TODO: just get bool 'server_URL_valid'
    const server_URL: string = ipcRenderer.sendSync('get_server_url');

    const [gamepath, updateGamepath] = useState<string>(romlist.length > 0 ? romlist[0].path : '');

    // i imagine it's better to just make a single lobby_settings object to update/retrieve!
    const [lobby_settings, updateLobbySettings] = useState<LobbySettings>(ipcRenderer.sendSync('get_lobby_settings'));

    const options = 
        romlist.length > 0
            ? romlist.map((rominfo: romPath) => 
                <option key={rominfo.path} value={rominfo.path}>{rominfo.name}</option>)
            : <option value=''>No Roms found...</option>;

    return (
        <>
        <div className="horiz-split">
            <div>
                <h2>Create Lobby</h2>
                <form onSubmit={(event) => startGame(event, gamepath)}>
                    <div className="form-section">
                        <label>Username</label>
                        <div>
                            <input type="text" name="" id="" value={lobby_settings.username} 
                                onChange={event =>
                                    updateLobbySettings(changeSettings(lobby_settings, 'username', event.target.value))
                                }
                            />
                        </div>
                    </div>
                    <div className="form-section">
                        <label>Game selection</label>
                        <div className="custom-select">
                            <select value={gamepath} onChange={event => updateGamepath(event.target.value)}>
                                {options}
                            </select>
                        </div>
                    </div>
                    <div className="form-section">
                        <label>Lobby Size</label>
                        <div>
                            <input type="number" name="" id="" min="2" max="10" value={lobby_settings.lobby_size}
                                onChange={event => 
                                    updateLobbySettings(changeSettings(lobby_settings, 'lobby_size', Number(event.target.value)))
                                }
                            />
                        </div>
                    </div>
                    <div className="start">
                        <button 
                            type="submit"
                            disabled={(romlist.length === 0) || (bizhawk_path === '')}
                        >Create
                        </button>
                    </div>
                </form>
            </div>
            <div className="vert-line"/>
            <div>
                <h2>Join Lobby</h2>
                <form onSubmit={(event) => startGame(event, gamepath)}>
                    <div className="form-section">
                        <label>Username</label>
                        <div>
                            <input type="text" name="" id="" value={lobby_settings.username} 
                                onChange={event => 
                                    updateLobbySettings(changeSettings(lobby_settings, 'username', event.target.value))
                                }
                            />
                        </div>
                    </div>
                    <div className="form-section">
                        <label>Lobby Code</label>
                        <div>
                            <input type="text" name="" id="" value={lobby_settings.lobby_code} 
                                onChange={event => 
                                    updateLobbySettings(changeSettings(lobby_settings, 'lobby_code', event.target.value))
                                }
                            />
                        </div>
                    </div>
                    <div className="form-section">
                        <label>Lobby Password</label>
                        <div>
                            <input type="text" name="" id="" value={lobby_settings.lobby_password} 
                                onChange={event => 
                                    updateLobbySettings(changeSettings(lobby_settings, 'lobby_password', event.target.value))
                                }
                            />
                        </div>
                    </div>
                    <div className="start">
                        <button 
                            type="submit"
                            disabled={(romlist.length === 0) || (bizhawk_path === '')}
                        >Join
                        </button>
                    </div>
                </form>
            </div>
        </div>
        </>
    )
}

export default Lobby;