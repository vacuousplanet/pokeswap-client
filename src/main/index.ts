import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { spawn, ChildProcess } from 'child_process'
import { createServer, Socket, AddressInfo } from 'net';
import { resolve, relative } from 'path';
import fs from 'fs'

import {isHttpUri} from 'valid-url';

import gameType from './gba_checker';

import {BizData, CODE_MAP, parseBizData, encodeTeamData} from './parse_bizdata';

interface romPath {
    path: string;
    name: string;
};

interface LobbySettings {
    username: string;
    gamepath: string;
    lobby_size: number;
    lobby_code: string;
    lobby_password: string;
    gym_status: number;
}

interface SaveSettings {
    gamepath: string;
    ss_path: string;
    lobby_code: string;
    gym_status: number;
    player_list: string[];
    checksums: string[];
};

//TODO: cache/load these on close/open respectively
var rom_list: romPath[] = [];
var bizhawk_path: string = '';
var server_URL: string = 'http://127.0.0.1:3000';
var lobby_settings: LobbySettings = <LobbySettings>{
    username: '',
    gamepath: '',
    lobby_size: 2,
    lobby_code: '',
    lobby_password: '',
    gym_status: 0,
};
var lobby_init_mode: string = "";
var savestate: string = "";
var player_list: string[] = [];

const local_lua_path: string = './src/lua/biz_client.lua'; 

var bizhawk_proc: ChildProcess | null = null;

// default bizhawk socket server
var lua_socket : Socket | null = null;
var rend_game_coms_event = <Electron.IpcMainEvent>{};
const biz_server = createServer(socket => {
    // console.log('client connected');

    lua_socket = socket;

    socket.on('data', data => {
        // assuming data is just space separated team data for now...
        const parsed: BizData = parseBizData(data)
        
        const decoded_content: any = CODE_MAP.get(parsed.code)(parsed.content);

        console.log(`${parsed.code} -> ${decoded_content}`);

        if (parsed.code === 'gym') {
            lobby_settings.gym_status = decoded_content;
        } else if (parsed.code === 'gym-status') {
            lua_socket?.write(`gym-init:${lobby_settings.gym_status}`);
        }

        // send data_buf to ps_server (through renderer)
        rend_game_coms_event.reply('game-coms-loop-in', parsed.code, decoded_content);
        //ipcMain.emit('game-signal', parsed.code, decoded_content);
    });

}).listen(0);

ipcMain.on('game-coms-loop-out', (event, ...args) => {
    rend_game_coms_event = event;
});

const { port } = biz_server.address() as AddressInfo;
console.log(`lua socket port on: ${port}`)

// electron stuff
const createWindow = (): void => {
    let win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            webSecurity: false,
        },
    });

    win.loadFile('index.html');
}

ipcMain.on('rom_update', (event, ...args) => {
    const options: Electron.OpenDialogOptions = {
        properties: ['openFile'],
    };

    dialog.showOpenDialog(options).then(result => {
        if(!result.canceled && !rom_list.map(rompath => rompath.path).includes(result.filePaths[0])) {
            const rom_name = gameType(result.filePaths[0]);
            if (rom_name === undefined) {
                
                dialog.showErrorBox('Unknown Rom', `${result.filePaths[0]} does not contain a known ROM`)
                
                event.returnValue = rom_list;
                return;
            }
            if(args[0] !== ''){
                const rl_index = rom_list.map(rompath => rompath.path).indexOf(args[0]);

                rom_list[rl_index] = {
                    path : result.filePaths[0],
                    name : rom_name,
                };
            } else {
                rom_list.push({
                    path: result.filePaths[0],
                    name: rom_name,
                });
            }
        }
        event.returnValue = rom_list
    }).catch(err => console.log(err));
    return;
});

ipcMain.on('get_roms_list', (event, ...args) => {
    event.returnValue = rom_list;
});

ipcMain.on('bizhawk_path_update', (event, ...args) => {
    const options: Electron.OpenDialogOptions = {
        properties: ['openFile'],
        filters: [{ name: 'Executables', extensions: ['exe']}],
    };

    dialog.showOpenDialog(options).then(result => {
        if (result.canceled) {
            event.returnValue = '';
        } else if(!result.filePaths[0].endsWith('EmuHawk.exe')) {
            dialog.showErrorBox('Invalid BizHawk Path', `Supplied path, ${result.filePaths[0]}, does not lead to EmuHawk.exe`);
            event.returnValue = '';
        }
        else if(!result.canceled && !(bizhawk_path === result.filePaths[0])) {
            bizhawk_path = result.filePaths[0];
            event.returnValue = result.filePaths[0];
        } else {
            event.returnValue = '';
        }
    }).catch(err => console.log(err));
});

ipcMain.on('get_bizhawk_path', (event, ...args) => {
    event.returnValue = bizhawk_path;
});


ipcMain.on('start_bizhawk', (event, ...args) => {

    // TODO: clear save ram folder in bizhawk!

    // start bizhawk
    bizhawk_proc = spawn(bizhawk_path, [
        lobby_settings.gamepath,
        '--socket_ip=127.0.0.1',
        `--socket_port=${port}`,
        `--lua=${resolve(bizhawk_path, relative(bizhawk_path, local_lua_path))}`
    ].concat(savestate === '' ? [] : [`--load-state=${savestate}`]));

});


ipcMain.on('get_server_url', (event, ...args) => {
    event.returnValue = server_URL;
});

ipcMain.on('check_server_url', (event, ...args) => {
    event.returnValue = true;
});

ipcMain.on('server_url_update', (event, ...args) => {
    if (isHttpUri(args[0])) {
        server_URL = args[0];
    } else {
        dialog.showErrorBox('Invalid Server', `${args[0]} is not a valid uri`);
    }

    event.returnValue = server_URL;
});

ipcMain.on('get_lobby_settings', (event, ...args) => {
    event.returnValue = lobby_settings;
});

ipcMain.on('get-server-settings', (event, ...args) => {
    const server_settings: LobbySettings = Object.assign({}, lobby_settings);
    server_settings.gamepath = gameType(lobby_settings.gamepath) || '';

    event.returnValue = server_settings;
})

ipcMain.on('update_lobby_settings', (event, ...args) => {
    lobby_settings = Object.defineProperty(lobby_settings, args[0], {value: args[1]});
    event.returnValue = lobby_settings;
});

ipcMain.on('update_player_list', (event, ...args) => {
    player_list = args[0];
});

ipcMain.on('lobby-init', (event, ...args) => {
    lobby_init_mode = args[0];
});

ipcMain.on('get-lobby-init-mode', (event, ...args) => {
    event.returnValue = lobby_init_mode;
});

ipcMain.on('render-ready', (event, ...args) => {
    lobby_init_mode = 'ready';
    event.reply('player-ready');
});

ipcMain.on('user-error', (event, ...args) => {
    console.log(args);
    dialog.showErrorBox(args[0], args[1]);
});

ipcMain.on('player-disconnect', (event, ...args) => {
    const options = {
        type: 'question',
        buttons: ['Continue', 'End session'],
        defaultID: 1,
        title: 'Player Disconnect',
        message: args[0],
        detail: 'Do you want to continue playing?',
    };
    lua_socket?.write('pause');
    dialog.showMessageBox(null as unknown as BrowserWindow, options).then(
        result => {
            event.reply('player-vote', result.response === 0);
        }
    );
});

ipcMain.on('end-session', (event, ...args) => {
    if (lua_socket !== null) {
        // prompt user for session save location
        const options: Electron.SaveDialogSyncOptions = {
            filters: [{name: 'swap-session', extensions: ['json']}]
        }

        var save_out: string | undefined = undefined;
        while(save_out === undefined) {
            save_out = dialog.showSaveDialogSync(options)
            if (save_out === undefined) {
                // show error about having to choose a file path here!
            }
        }

        // TODO: get checksums from args[2]
        const session_state: SaveSettings = <SaveSettings> {
            gamepath: lobby_settings.gamepath,
            ss_path: `${save_out.split('.')[0]}.ss`,
            lobby_code: lobby_settings.lobby_code,
            gym_status: lobby_settings.gym_status,
            player_list: player_list,
            checksums: [''],
        }

        // write savestate next to json
        lua_socket.write(`savestate:${save_out.split('.')[0]}.ss`);

        fs.writeFileSync(save_out, JSON.stringify(session_state), {encoding: 'utf-8'});

    }
});

ipcMain.on('resume-emu', (event, ...args) => {
    lua_socket?.write('resume');
});

ipcMain.on('new-team', (event, ...args) => {
    if (lua_socket !== null) {
        console.log('writing new team...')

        // seems like only an Array buffer can be sent this way (annoying)
        const new_team_data = new Uint8Array(args[0])
        console.log(new_team_data)
        lua_socket.write(`team:${encodeTeamData(new_team_data)}`)
    } else {
        // bad bad bad bad bad bad
    }
});

ipcMain.on('beat-gym', (event, ...args) => {
    if (lua_socket !== null) {
        console.log('writing new gym state...')
        lobby_settings.gym_status = args[0];
        lua_socket.write(`gym:${args[0]}`);
    } else {
        // bad bad bad bad bad bad
    }
});

ipcMain.on('get-load-file', (event, ...args) => {
    const options: Electron.OpenDialogOptions = {
        properties: ['openFile'],
        filters: [{ name: 'swap-sessions', extensions: ['json']}],
    };

    dialog.showOpenDialog(options).then(result => {
        if (result.canceled) {
            event.returnValue = false;
        } else {
            // load file
            const resume_state: SaveSettings = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'));

            // TODO: check format
            
            // check gamepath
            // TODO: flash error message
            const romname = gameType(resume_state.gamepath)
            if (romname === undefined) {
                event.returnValue = false;
            }

            // TODO: fill checksum vals

            // set save state and gym status
            savestate = resume_state.ss_path;

            lobby_settings = <LobbySettings>{
                username: resume_state.player_list[0],
                gamepath: resume_state.gamepath,
                lobby_size: resume_state.player_list.length,
                lobby_code: resume_state.lobby_code,
                lobby_password: 'lmao',
                gym_status: resume_state.gym_status,
            }

            lobby_init_mode = 'resume';

            event.returnValue = true;
        }
    }).catch(err => console.log(err));
});

/*
ipcMain.on('test_write', (event, ...args) => {
    if (lua_socket !== null) {
        lua_socket.write('yo waddup lua');
    }
    event.returnValue = null;
});
*/
app.on('ready', createWindow);

// TODO: optionally create save state
app.on('window-all-closed', () => {
    lua_socket?.write('savestate');
});

// TODO: prompt for savestate, etc
app.on('will-quit', () => {
    lua_socket?.write('savestate')
});