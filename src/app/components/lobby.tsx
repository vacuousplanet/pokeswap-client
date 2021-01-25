// once server shit is added, this is gonna be a nightmare file

import React, {useState} from 'react'
import { ipcRenderer } from 'electron';

import './lobby.scss';

type romPath = {
    path: string;
    name: string;
};


function startGame(event: React.FormEvent<HTMLFormElement>, path: string) {
    console.log(path);
    ipcRenderer.send('start_bizhawk', path);
    event.preventDefault();
}

const Lobby = () => {

    const romlist: romPath[] = ipcRenderer.sendSync('get_roms_list');

    const bizhawk_path: string = ipcRenderer.sendSync('get_bizhawk_path');

    const [gamepath, updateGamepath] = useState<string>(romlist.length > 0 ? romlist[0].path : '');

    const options = 
        romlist.length > 0
            ? romlist.map((rominfo: romPath) => 
                <option key={rominfo.path} value={rominfo.path}>{rominfo.name}</option>)
            : <option value=''>No Roms found...</option>;

    return (
        <>
        <h2>Lobby (local)</h2>
        <form onSubmit={(event) => startGame(event, gamepath)}>
            <div>
                <label>Game selection</label>
                <div className="custom-select">
                    <select value={gamepath} onChange={event => updateGamepath(event.target.value)}>
                        {options}
                    </select>
                </div>
            </div>
            <div className="start">
                <button 
                    type="submit"
                    disabled={(romlist.length === 0) || (bizhawk_path === '')}
                >Start
                </button>
            </div>
        </form>
        {/* testing something here */}
        <div className="start">
            <button onClick={() => ipcRenderer.sendSync('test_write')}></button>
        </div>
        </>
    )
}

export default Lobby;