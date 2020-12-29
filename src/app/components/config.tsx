import React, {useState} from 'react';
import { ipcRenderer } from 'electron';
import './config.scss';

type romPath = {
    path: string;
    name: string;
}

function addRom(rompath: string = ''): romPath[] {
    return ipcRenderer.sendSync('rom_update', rompath);
}

function newBizhawkPath(): string {
    return ipcRenderer.sendSync('bizhawk_path_update');
}

const Config = () => {

    // Router forces Config reload, so get states from main process
    const [romlist, updateRoms] = useState<romPath[]>(
        ipcRenderer.sendSync('get_roms_list')
    );

    const [bizhawk_path, updateBizhawkPath] = useState(
        ipcRenderer.sendSync('get_bizhawk_path')
    );


    return (
        <>
        <h2>Configuration</h2>

        <div className="romAdder">
            <h3>ROM Paths</h3>
            <button className="square" onClick={() => {
                updateRoms(addRom());
            }}>+</button>
        </div>
        <div>
            {romlist.map((rominfo: romPath) =>
                <div key={rominfo.path}>
                    <hr/>
                    <div className="romcard">
                        <div className="path">
                            <h4>{rominfo.name}</h4>
                            <p>{rominfo.path}</p>
                            </div>
                        <div className="browse">
                            <button onClick={() => { updateRoms(addRom(rominfo.path))}}>Browse...</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        <div>
            <h3>Bizhawk Path</h3>
            <hr/>
            <div className="romcard">
                <div className="path"><p>{bizhawk_path}</p></div>
                <div className="browse">
                    <button onClick={() => updateBizhawkPath(newBizhawkPath())}>Browse...</button>
                </div>
            </div>
        </div>
        </>
    )
}

export default Config;