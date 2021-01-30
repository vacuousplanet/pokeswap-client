import React, {useState} from 'react'

import {useHistory, useParams} from 'react-router-dom';

import { ipcRenderer } from 'electron';

interface ConnectingParams {
    mode: string;
};

const LobbyConnecting = () => {
    let { mode } = useParams<ConnectingParams>();

    let history = useHistory();

    ipcRenderer.send('pokeswap-server-init', mode);
    
    ipcRenderer.on('pokeswap-server-init-responce', (event, ...args) => {

        // if everythings good, redirect to connected lobby
        if (args[0] === "connected") {
            history.push('/lobby/connected');
        }

        // if everything bad bad, go back to fuckland idiot
        else {
            history.push('/lobby');
        }

    });

    return (
        <>
        <div className="lds-holder">
                <div className="lds-ripple"><div></div><div></div><hr className="lds-hr"/></div>
                <h2>connecting to pokeswap servers...</h2>
        </div>
        </>
    );
}