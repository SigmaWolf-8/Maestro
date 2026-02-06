local JWTTernaryValidator = {
  PRIORITY = 1000,
  VERSION = "1.0.0",
}

local function validate_ternary_token(token)
  if not token or token == "" then
    return false, "Missing ternary token"
  end

  local valid_chars = "^[0-2T]+$"
  if not string.match(token, valid_chars) then
    return false, "Invalid ternary encoding: contains non-ternary characters"
  end

  if string.len(token) < 32 then
    return false, "Ternary token too short: minimum 32 trits required"
  end

  return true, nil
end

local function extract_security_mode(headers)
  local mode = headers["X-PlenumNET-Security-Mode"]
  if not mode then
    return "one"
  end

  local valid_modes = { phi = true, one = true, zero = true }
  if not valid_modes[mode] then
    return nil, "Invalid security mode: " .. tostring(mode)
  end

  return mode, nil
end

local function validate_timestamp_header(headers, mode)
  local timestamp = headers["X-PlenumNET-Timestamp"]

  if mode == "phi" and not timestamp then
    return false, "Mode phi requires femtosecond timestamp header"
  end

  if timestamp then
    local ts_num = tonumber(timestamp)
    if not ts_num then
      return false, "Invalid timestamp format"
    end
  end

  return true, nil
end

function JWTTernaryValidator:access(conf)
  local headers = kong.request.get_headers()

  local mode, mode_err = extract_security_mode(headers)
  if not mode then
    return kong.response.exit(400, { message = mode_err })
  end

  if mode == "phi" or mode == "one" then
    local ternary_token = headers["X-PlenumNET-Ternary-Token"]
    if ternary_token then
      local valid, err = validate_ternary_token(ternary_token)
      if not valid then
        return kong.response.exit(401, { message = err })
      end
    end

    local ts_valid, ts_err = validate_timestamp_header(headers, mode)
    if not ts_valid then
      return kong.response.exit(400, { message = ts_err })
    end
  end

  kong.service.request.set_header("X-PlenumNET-Validated-Mode", mode)
  kong.service.request.set_header("X-PlenumNET-Validator-Version", JWTTernaryValidator.VERSION)
end

return JWTTernaryValidator
