import React, {useReducer} from 'react';
import Sidebar from './components/sidebar';
import {lobbySettingsReducer, localPathSettingsReducer} from './reducers';
import { LobbySettingsContext, LocalPathSettingsContext } from './contexts'
import './app.scss';

// TODO: load these from store
const App = () => {
    const lobby_settings = useReducer(lobbySettingsReducer, {
        username: '',
        gamepath: '',
        lobby_size: 2,
        lobby_code: '',
        lobby_password: '',
        gym_status: 0,
    });

    const local_path_settings = useReducer(localPathSettingsReducer, {
         bizhawk_path: '',
         rompaths: [],
         server_url: 'http://127.0.0.1:3000',
    });

    return (
        <LobbySettingsContext.Provider value={lobby_settings}>
            <LocalPathSettingsContext.Provider value={local_path_settings}>
                <Sidebar />
            </LocalPathSettingsContext.Provider>
        </LobbySettingsContext.Provider>
    )
}

export default App;