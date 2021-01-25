-- lua client for pokeswap

local state = "idle"

local FLAG_BADGE01_GET = 0x867

-- TODO: initialize with status sent form desktop client
local gym_status = 0

-- TODO: read more than first gym
function read_gym_status ()
    local flag_pointer = memory.read_u32_le(0x03005D8C, 'System Bus') + 0x1270
	local flag_val = memory.read_u8(flag_pointer + FLAG_BADGE01_GET / 8, 'System Bus')
    flag_val = bit.band(bit.rshift(flag_val, bit.band(FLAG_BADGE01_GET, 7)), 1)
    return flag_val
end

function read_player_team ()
    local team_pointer = memory.read_u32_le(0x03005D8C, 'System Bus') + 0x0234
    local team_data = memory.readbyterange(team_pointer, 600, 'System Bus')

    -- assemble team_data into string for sending
    local team_string = table.concat(team_data, " ")

    return team_string
end

function check_server ()

    if not comm.socketServerIsConnected() then
        print('socket server is not connected')
        return "no connection"
    end

    local responce = comm.socketServerResponse()

    return responce
end

while true do
    -- check server connection
    local responce = check_server()

    if responce == "no connection" then
        break
    end

    if state == "idle" then
        if responce ~= nil and responce ~= "" then
            -- TODO: decode and verify message

            -- change state to 'remote gym' if valid message
            --state = "remote gym"
        else
            -- read gym status
            local gym_status_new = read_gym_status()
            if gym_status ~= gym_status_new then
                -- change state to local gym, update gym status, and pause emu
                state = "local gym"

                gym_status = gym_status_new

                client.pause()

                -- Get party pokemon data
                local team_data = read_player_team()

                -- Send party data to desktop app
                comm.socketServerSend(team_data)

            end

        end
    --else if state == "remote gym" then

    --else if state == "local gym" then
        
    end

    emu.frameadvance();

end