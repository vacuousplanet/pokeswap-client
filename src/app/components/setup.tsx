import React, {useState} from 'react'

import {useHistory} from 'react-router-dom';

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
    console.log(`${prop}: ${value}`);
    return ipcRenderer.sendSync('update_lobby_settings', prop, value);
}

// interface for lobby settings
// TODO: add gamepath/romPath into this
//       no need for it to be separate tbh
interface LobbySettings {
    username: string;
    gamepath: string;
    lobby_size: number;
    lobby_code: string;
    lobby_password: string;
}

const LobbySetup = () => {

    let history = useHistory();

    const romlist: romPath[] = ipcRenderer.sendSync('get_roms_list');

    // TODO: this should probably just check for valid bizhawk path
    const bizhawk_path: string = ipcRenderer.sendSync('get_bizhawk_path');

    const server_URL_valid: boolean = ipcRenderer.sendSync('check_server_url');

    // i imagine it's better to just make a single lobby_settings object to update/retrieve!
    const [lobby_settings, updateLobbySettings] = useState<LobbySettings>(ipcRenderer.sendSync('get_lobby_settings'));

    const options = 
        romlist.length > 0
            ? romlist.map((rominfo: romPath) => 
                <option key={rominfo.path} value={rominfo.path}>{rominfo.name}</option>)
            : <option value=''>No Roms found...</option>;

    if (romlist.length > 0 && lobby_settings.gamepath === ''){
        updateLobbySettings(changeSettings(lobby_settings, 'gamepath', romlist[0].path));
    }
    
    return (
        <>
        <div className="horiz-split">
            <div>
                <h2>Create Lobby</h2>
                <form onSubmit={(event) => {
                    event.preventDefault();
                    ipcRenderer.send('lobby-init', 'create');
                    history.push("/lobby/connect");
                }}>
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
                            <select value={lobby_settings.gamepath}
                                onChange={event =>
                                    updateLobbySettings(changeSettings(lobby_settings, 'gamepath', event.target.value))
                                }
                            >
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
                            disabled={
                                (romlist.length === 0)
                                || (bizhawk_path === '')
                                || (lobby_settings.username === '')
                                || (lobby_settings.lobby_size < 2)
                                || (lobby_settings.lobby_size > 10)
                                || (!server_URL_valid)
                            }
                        >Create
                        </button>
                    </div>
                </form>
            </div>
            <div className="vert-line"/>
            <div>
                <h2>Join Lobby</h2>
                <form onSubmit={(event) => {
                    event.preventDefault();
                    ipcRenderer.send('lobby-init', 'join');
                    history.push("/lobby/connect");
                }}>
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
                            disabled={
                                (romlist.length === 0)
                                || (bizhawk_path === '')
                                || (lobby_settings.username === '')
                                || (lobby_settings.lobby_code === '')
                                || (!server_URL_valid)
                            }
                        >Join
                        </button>
                    </div>
                </form>
            </div>
        </div>
        </>
    )
}

export default LobbySetup;