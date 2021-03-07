import {LobbySettings} from '../common/LobbySettings';
import {LocalPathSettings, romPath} from '../common/LocalPathSettings';

import { isHttpUri } from 'valid-url';

export const lobbySettingsReducer = (
    state: LobbySettings,
    action: {
        type: 'set' | 'setOne';
        action: [string, unknown] | LobbySettings;
    }
): LobbySettings => {
    if (action.type === 'set') return action.action as LobbySettings;
    const v = action.action as [string, unknown];
    return {
        ...state,
        [v[0]]: v[1],
    };
};

export const localPathSettingsReducer = (
    state: LocalPathSettings,
    action: {
        type: 'set' | 'setOne' | 'addRom' | 'replaceRom';
        action: LocalPathSettings | [string, unknown] | romPath;
    }
): LocalPathSettings => {
    switch(action.type) {
        case 'set':
            return action.action as LocalPathSettings;
        case 'setOne':
            const kv_pair = action.action as [string, unknown];
            return (kv_pair[0] === 'server_url' && !isHttpUri(kv_pair[1] as string)) ? state : {
                ...state,
                [kv_pair[0]]: kv_pair[1],
            }
        case 'addRom':
            let newpaths = Array.from(state.rompaths);
            newpaths.push(action.action as romPath);
            return {
                ...state,
                rompaths: newpaths
            }
        case 'replaceRom':
            const rom_update_pair = action.action as [string, romPath];
            let paths = Array.from(state.rompaths);
            state.rompaths.forEach( (rompath, index) => {
                if (rompath.path === rom_update_pair[0]) {
                    paths[index] = rom_update_pair[1];
                }
            })
            return {
                ...state,
                rompaths: paths,
            }
        default:
            return state;
    }
};