// once server shit is added, this is gonna be a nightmare file

// update 01/24/2021 - oh yeah baybee it's nightmare time

import React, {useState} from 'react'

import {
    BrowserRouter as Router,
    Switch,
    Route,
    Link,
    Redirect,
    useRouteMatch
} from "react-router-dom";

import { ipcRenderer } from 'electron';

import './lobby.scss';

import LobbySetup from './setup';

/*

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

interface LobbySettings {
    username: string;
    lobby_size: number;
    lobby_code: string;
    lobby_password: string;
}
*/

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
    -> On create/join lobby, show wheel while server creates lobby
    -> Once ready, show 'connected' lobby screen/tab/route

Alternatively:
    -> Instead of tabs, just split it right down the middle
    -> Use router here I guess?

For now, mimic the alpha site's options
    -> Share usernames
    -> Left create needs game version and lobby size
    -> Right join needs lobby code and pw (lol)

---
---

Ok, now that the setup (create/join) page is templated, let's think about how to go about this
    -> On create/join lobby, we'll need to send information to the socketIO server
    -> While this happens, should display a different page
    -> So, on create/join buttons clicked (and valid), can use 'history.push()' to redirect to connecting page
    -> Once a responce is recieved from the socket server, the connecting page should redirect either back to 
       the original page, or a new lobby page!
*/


const Lobby = () => {

    let { path, url } = useRouteMatch();
    /*
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

    */

    // TODO (tmrw): create 'LobbyConnecting' component and connect basic socket comms

    return (
        <>
        <Switch>
            <Route exact path={path}>
                <LobbySetup/>
            </Route>
            <Route path={`${path}/connect/:mode`}>
                <div className="lds-holder">
                    <div className="lds-ripple"><div></div><div></div><hr className="lds-hr"/></div>
                    <h2>connecting to pokeswap servers...</h2>
                </div>
            </Route>
            <Route path={`${path}/connected`}>
                <h3>oh u in the big boy lobby now</h3>
            </Route>
        </Switch>
        </>
    );
}

export default Lobby;