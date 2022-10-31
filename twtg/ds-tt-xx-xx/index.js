/**
 * Filename          : decoder_tt_doc-D_rev-2.js
 * Latest commit     : 18f744de
 * Protocol document : D
 *
 * Release History
 *
 * 2020-09-23 revision 0
 * - initial version
 *
 * 2020-04-02 revision 1
 * - prefix hex values with 0x
 * - made reset_flags and bist
 * - updated assert payload formatting in reboot info
 * - added DecodeHexString to directly decode from HEX string
 *
 * 2021-07-15 revision 2
 * - Add support for protocol version 3, document D
 * - Add status element to application temperature
 * - Use a function to decode application_temperature
 * - Verify message length before parsing
 * - Fixed hexadecimal message decoding
 *
 * YYYY-MM-DD revision X
 * -
 */

 if (typeof module !== 'undefined') {
  // Only needed for nodejs
  module.exports = {
    decodeUplink: decodeUplink,
    Decode: Decode,
    Decoder: Decoder,
    DecodeHexString: DecodeHexString,
    decode_float: decode_float,
    decode_uint32: decode_uint32,
    decode_int32: decode_int32,
    decode_uint16: decode_uint16,
    decode_int16: decode_int16,
    decode_uint8: decode_uint8,
    decode_int8: decode_int8,
    decode_reboot_info: decode_reboot_info,
    decode_application_temperature: decode_application_temperature,
    from_hex_string: from_hex_string,
    encodeDownlink: encodeDownlink,
    Encode: Encode,
    Encoder: Encoder,
    EncodeDeviceConfig: EncodeDeviceConfig, // used by generate_config_bin.py
    EncodeTtAppConfig: EncodeTtAppConfig, // used by generate_config_bin.py
    encode_header: encode_header,
    encode_events_mode: encode_events_mode,
    encode_device_config: encode_device_config,
    encode_tt_app_config: encode_tt_app_config,
    encode_device_config_switch: encode_device_config_switch,
    encode_device_type_v2: encode_device_type_v2,
    encode_device_type_v3: encode_device_type_v3,
    encode_sensor_type: encode_sensor_type,
    encode_uint32: encode_uint32,
    encode_int32: encode_int32,
    encode_uint16: encode_uint16,
    encode_int16: encode_int16,
    encode_uint8: encode_uint8,
    encode_int8: encode_int8,
    calc_crc: calc_crc,
  };
}

function decodeUplink(input) {
  return Decode(input.fPort, input.bytes)
}

// Decode an uplink message from a buffer
// (array) of bytes to an object of fields.
function Decode(fPort, bytes) { // Used for ChirpStack (aka LoRa Network Server)
  var decoded = {};
  decoded.header = {};
  decoded.header.protocol_version = bytes[0] >> 4;
  message_type = bytes[0] & 0x0F;

  switch (decoded.header.protocol_version) {
    case 2:
    case 3: { // protocol_version = 2 and 3
      decoded.header.message_type = message_types_lookup_v2(message_type);

      var cursor = {}; // keeping track of which byte to process.
      cursor.value = 1; // skip header that is already done

      switch (message_type) {
        case 0: { // Boot message
          decoded.boot = decode_boot_msg(bytes, cursor);
          break;
        }

        case 1: { // Activated message
          break;
        }

        case 2: { // Deactivated message
          break;
        }

        case 3: { // Sensor event message
          decoded.application_event = decode_application_event_msg(bytes, cursor, decoded.header.protocol_version);
          break;
        }

        case 4: { // Device status message
          decoded.device_status = decode_device_status_msg(bytes, cursor);
          break;
        }
        default:
          throw "Invalid message type!"
      }
      break;
    }
    default:
      throw "Protocol version is not supported!"
  }

  return decoded;
}

function Decoder(obj, fPort) { // for The Things Network server
  return Decode(fPort, obj);
}

/**
 * Decoder for plain HEX string
 */
function DecodeHexString(hex_string) {
  return Decode(15, from_hex_string(hex_string));
}

/******************
 * Helper functions
 */

// helper function to convert a ASCII HEX string to a byte string
function from_hex_string(hex_string) {
  if (typeof hex_string != "string") throw new Error("hex_string must be a string");
  if (!hex_string.match(/^[0-9A-F]*$/gi)) throw new Error("hex_string contain only 0-9, A-F characters");
  if (hex_string.length & 0x01 > 0) throw new Error("hex_string length must be a multiple of two");

  var byte_string = [];
  for (i = 0; i < hex_string.length; i += 2)
  {
      var hex = hex_string.slice(i, i + 2);
      byte_string.push(parseInt(hex, 16));
  }
  return byte_string;
}

// helper function to parse an 32 bit float
function decode_float(bytes, cursor) {
  // JavaScript bitwise operators yield a 32 bits integer, not a float.
  // Assume LSB (least significant byte first).
  var bits = decode_int32(bytes, cursor);
  var sign = (bits >>> 31 === 0) ? 1.0 : -1.0;
  var e = bits >>> 23 & 0xff;
  if (e == 0xFF) {
    if (bits & 0x7fffff) {
      return NaN;
    } else {
      return sign * Infinity;
    }
  }
  var m = (e === 0) ? (bits & 0x7fffff) << 1 : (bits & 0x7fffff) | 0x800000;
  var f = sign * m * Math.pow(2, e - 150);
  return f;
}

// helper function to parse an unsigned uint32
function decode_uint32(bytes, cursor) {
  var result = 0;
  var i = cursor.value + 3;
  result = bytes[i--];
  result = result * 256 + bytes[i--];
  result = result * 256 + bytes[i--];
  result = result * 256 + bytes[i--];
  cursor.value += 4;

  return result;
}

// helper function to parse an unsigned int32
function decode_int32(bytes, cursor) {
  var result = 0;
  var i = cursor.value + 3;
  result = (result << 8) | bytes[i--];
  result = (result << 8) | bytes[i--];
  result = (result << 8) | bytes[i--];
  result = (result << 8) | bytes[i--];
  cursor.value += 4;

  return result;
}

// helper function to parse an unsigned uint16
function decode_uint16(bytes, cursor) {
  var result = 0;
  var i = cursor.value + 1;
  result = bytes[i--];
  result = result * 256 + bytes[i--];
  cursor.value += 2;

  return result;
}

// helper function to parse a signed int16
function decode_int16(bytes, cursor) {
  var result = 0;
  var i = cursor.value + 1;
  if (bytes[i] & 0x80) {
    result = 0xFFFF;
  }
  result = (result << 8) | bytes[i--];
  result = (result << 8) | bytes[i--];
  cursor.value += 2;

  return result;
}

// helper function to parse an unsigned int8
function decode_uint8(bytes, cursor) {
  var result = bytes[cursor.value];
  cursor.value += 1;

  return result;
}

// helper function to parse an unsigned int8
function decode_int8(bytes, cursor) {
  var result = 0;
  var i = cursor.value;
  if (bytes[i] & 0x80) {
    result = 0xFFFFFF;
  }
  result = (result << 8) | bytes[i--];
  cursor.value += 1;

  return result;
}

// helper function to parse tt application temperature
function decode_application_temperature(bytes, cursor, version) {
  var temperature = {};
  var PT100LowerErrorCode = -3000;
  var PT100UpperErrorCode = -3001;
  var VboundLowerErrorCode = -3002;
  var VboundUpperErrorCode = -3003;
  var UnknownType = -3004;

  min = decode_int16(bytes, cursor) / 10;
  max = decode_int16(bytes, cursor) / 10;
  avg = decode_int16(bytes, cursor) / 10;

  if (version == 2) {
    temperature.min = min;
    temperature.max = max;
    temperature.avg = avg;
  } else if (version == 3) {
    if (
      min == PT100LowerErrorCode ||
      avg == PT100LowerErrorCode ||
      max == PT100LowerErrorCode
    ) {
      temperature.status = "PT100 bound Lower Error";
    } else if (
      min == PT100UpperErrorCode ||
      avg == PT100UpperErrorCode ||
      max == PT100UpperErrorCode
    ) {
      temperature.status = "PT100 bound Upper Error";
    } else if (
      min == VboundLowerErrorCode ||
      avg == VboundLowerErrorCode ||
      max == VboundLowerErrorCode
    ) {
      temperature.status = "V bound Lower Error";
    } else if (
      min == VboundUpperErrorCode ||
      avg == VboundUpperErrorCode ||
      max == VboundUpperErrorCode
    ) {
      temperature.status = "V bound Upper Error";
    } else if (min == UnknownType || avg == UnknownType || max == UnknownType) {
      temperature.status = "Unrecognized sensor type";
    } else {
      temperature.min = min;
      temperature.max = max;
      temperature.avg = avg;
      temperature.status = "OK";
    }
  } else {
    throw "Invalid protocol version";
  }

  return temperature;
}

// helper function to parse reboot_info
function decode_reboot_info(reboot_type, bytes, cursor) {
  var result;

  var reboot_payload = [0, 0, 0, 0, 0, 0, 0, 0];
  reboot_payload[0] += decode_uint8(bytes, cursor);
  reboot_payload[1] += decode_uint8(bytes, cursor);
  reboot_payload[2] += decode_uint8(bytes, cursor);
  reboot_payload[3] += decode_uint8(bytes, cursor);
  reboot_payload[4] += decode_uint8(bytes, cursor);
  reboot_payload[5] += decode_uint8(bytes, cursor);
  reboot_payload[6] += decode_uint8(bytes, cursor);
  reboot_payload[7] += decode_uint8(bytes, cursor);

  switch (reboot_type) {
    case 0: // REBOOT_INFO_TYPE_NONE
      result = 'none';
      break;

    case 1: // REBOOT_INFO_TYPE_POWER_CYCLE
      result = 'power cycle';
      break;

    case 2: // REBOOT_INFO_TYPE_WDOG
      result = 'swdog (' + String.fromCharCode(
        reboot_payload[0],
        reboot_payload[1],
        reboot_payload[2],
        reboot_payload[3]).replace(/[^\x20-\x7E]/g, '') + ')';

      break;

    case 3: // REBOOT_INFO_TYPE_ASSERT
      var payloadCursor = {}; // keeping track of which byte to process.
      payloadCursor.value = 4; // skip caller address
      actualValue = decode_int32(reboot_payload, payloadCursor);
      result = 'assert (' +
          'caller: 0x' +
          uint8_to_hex(reboot_payload[3]) +
          uint8_to_hex(reboot_payload[2]) +
          uint8_to_hex(reboot_payload[1]) +
          uint8_to_hex(reboot_payload[0]) +
          '; value: ' + actualValue.toString() + ')';
      break;

    case 4: // REBOOT_INFO_TYPE_APPLICATION_REASON
      result = 'application (0x' +
        uint8_to_hex(reboot_payload[3]) +
        uint8_to_hex(reboot_payload[2]) +
        uint8_to_hex(reboot_payload[1]) +
        uint8_to_hex(reboot_payload[0]) + ')';
      break;

    case 5: // REBOOT_INFO_TYPE_SYSTEM_ERROR
      result = 'system (error: 0x' +
        uint8_to_hex(reboot_payload[3]) +
        uint8_to_hex(reboot_payload[2]) +
        uint8_to_hex(reboot_payload[1]) +
        uint8_to_hex(reboot_payload[0]) +
        '; caller: 0x' +
        uint8_to_hex(reboot_payload[7]) +
        uint8_to_hex(reboot_payload[6]) +
        uint8_to_hex(reboot_payload[5]) +
        uint8_to_hex(reboot_payload[4]) + ')';
      break;

    default:
      result = 'unknown (' +
        '0x' + uint8_to_hex(reboot_payload[0]) + ', ' +
        '0x' + uint8_to_hex(reboot_payload[1]) + ', ' +
        '0x' + uint8_to_hex(reboot_payload[2]) + ', ' +
        '0x' + uint8_to_hex(reboot_payload[3]) + ', ' +
        '0x' + uint8_to_hex(reboot_payload[4]) + ', ' +
        '0x' + uint8_to_hex(reboot_payload[5]) + ', ' +
        '0x' + uint8_to_hex(reboot_payload[6]) + ', ' +
        '0x' + uint8_to_hex(reboot_payload[7]) + ')';
      break;
  }

  return result;
}

function uint8_to_hex(d) {
  return ('0' + (Number(d).toString(16).toUpperCase())).slice(-2);
}

function uint16_to_hex(d) {
  return ('000' + (Number(d).toString(16).toUpperCase())).slice(-4);
}

function uint32_to_hex(d) {
  return ('0000000' + (Number(d).toString(16).toUpperCase())).slice(-8);
}

function message_types_lookup_v2(type_id) {
  type_names = ["boot",
                "activated",
                "deactivated",
                "application_event",
                "device_status",
                "device_configuration",
                "application_configuration"];
  if (type_id < type_names.length) {
    return type_names[type_id];
  } else {
    return "unknown";
  }
}

function device_types_lookup_v2(type_id) {
  type_names = ["", // reserved
                "ts",
                "vs-qt",
                "vs-mt",
                "tt"];
  if (type_id < type_names.length) {
    return type_names[type_id];
  } else {
    return "unknown";
  }
}

function trigger_lookup_v2(trigger_id) {
  switch (trigger_id)
  {
    case 0:
      return "timer";
    case 1:
      return "condition_0";
    case 2:
      return "condition_1";
    case 3:
      return "condition_2";
    case 4:
      return "condition_3";
    default:
      return "unknown";
    }
}

Object.prototype.in =
    function() {
    for(var i=0; i<arguments.length; i++)
        if (arguments[i] == this) return true;
    return false;
}

/***************************
 * Message decoder functions
 */

function decode_boot_msg(bytes, cursor) {
  var boot = {}

  var expected_length = 23;
  if (bytes.length != expected_length) {
    throw "Invalid boot message length " + bytes.length + " instead of " + expected_length
  }

  // byte[1]
  device_type = decode_uint8(bytes, cursor);
  boot.device_type = device_types_lookup_v2(device_type);

  // byte[2..5]
  var version_hash = decode_uint32(bytes, cursor);
  boot.version_hash = '0x' + uint32_to_hex(version_hash);

  // byte[6..7]
  var device_config_crc = decode_uint16(bytes, cursor);
  boot.device_config_crc = '0x' + uint16_to_hex(device_config_crc);

  // byte[8..9]
  var application_config_crc = decode_uint16(bytes, cursor);
  boot.application_config_crc = '0x' + uint16_to_hex(application_config_crc);

  // byte[10]
  var reset_flags = decode_uint8(bytes, cursor);
  boot.reset_flags = '0x' + uint8_to_hex(reset_flags);

  // byte[11]
  boot.reboot_counter = decode_uint8(bytes, cursor);

  // byte[12]
  boot_type = decode_uint8(bytes, cursor);

  // byte[13..20]
  boot.reboot_info = decode_reboot_info(boot_type, bytes, cursor);

  // byte[21]
  boot.last_device_state = decode_uint8(bytes, cursor);

  // byte[22]
  var bist = decode_uint8(bytes, cursor);
  boot.bist = '0x' + uint8_to_hex(bist);

  return boot;
}

function decode_application_event_msg(bytes, cursor, version) {
  var application_event = {}

  var expected_length = 9;
  if (bytes.length != expected_length) {
      throw "Invalid application_event message length " + bytes.length + " instead of " + expected_length
  }

  // byte[1]
  trigger = decode_uint8(bytes, cursor);
  application_event.trigger = trigger_lookup_v2(trigger);

  // byte[2..7]
  application_event.temperature = {};

  application_event.temperature = decode_application_temperature(bytes, cursor, version);

  // byte[8]
  conditions = decode_uint8(bytes, cursor);
  application_event.condition_0 = (conditions & 1);
  application_event.condition_1 = ((conditions >> 1) & 1);
  application_event.condition_2 = ((conditions >> 2) & 1);
  application_event.condition_3 = ((conditions >> 3) & 1);

  return application_event;
}

function decode_device_status_msg(bytes, cursor) {
  var device_status = {};

  var expected_length = 18;
  if (bytes.length != expected_length) {
      throw "Invalid device_status message length " + bytes.length + " instead of " + expected_length
  }

  // byte[1..2]
  var device_config_crc = decode_uint16(bytes, cursor);
  device_status.device_config_crc = '0x' + uint16_to_hex(device_config_crc);

  // byte[3..4]
  var application_config_crc = decode_uint16(bytes, cursor);
  device_status.application_config_crc = '0x' + uint16_to_hex(application_config_crc);

  // byte[5]
  device_status.event_counter = decode_uint8(bytes, cursor);

  // byte[6..11]
  device_status.battery_voltage = {};
  device_status.battery_voltage.low = decode_uint16(bytes, cursor) / 1000.0;
  device_status.battery_voltage.high = decode_uint16(bytes, cursor) / 1000.0;
  device_status.battery_voltage.settle = decode_uint16(bytes, cursor) / 1000.0;

  // byte[12..14]
  device_status.temperature = {};
  device_status.temperature.min = decode_int8(bytes, cursor);
  device_status.temperature.max = decode_int8(bytes, cursor);
  device_status.temperature.avg = decode_int8(bytes, cursor);

  // byte[15]
  device_status.tx_counter = decode_uint8(bytes, cursor);

  // byte[16]
  device_status.avg_rssi = -decode_uint8(bytes, cursor);

  // byte[17]
  device_status.avg_snr = decode_int8(bytes, cursor);

  return device_status;
}


/**
 * Filename          : encoder_tt_doc-D_rev-2.js
 * Latest commit     : 2b5c8c54
 * Protocol document : D
 *
 * Release History
 *
 * 2020-09-23 revision 0
 * - initial version
 *
 * 2021-06-28 revision 1
 * - rename unconfirmed_repeat to number_of_unconfirmed_messages
 * - Added limitation to base configuration
 * - Update minimum number of number_of_unconfirmed_messages
 *
 * YYYY-MM-DD revision 2
 * - Fixed threshold_temperature scale which affect version 2 and 3
 * - Add sensor type to application configuration, according to Protocol D
 * - Add value range assertion to encode_device_config
 * - Fixed the parsing of unconfirmed_repeat to number_of_unconfirmed_messages
 *
 * YYYY-MM-DD revision X
 * - None
 */

function encodeDownlink(input) {
  var output = {}
  output.bytes = Encode(15, input);
  output.fPort = 15;
  return output;
}

var mask_byte = 255;

function Encode(fPort, obj) { // Used for ChirpStack (aka LoRa Network Server)
  // Encode downlink messages sent as
  // object to an array or buffer of bytes.
  var bytes = [];

  switch (obj.header.protocol_version) {
    case 2:
    case 3: {  // Protocol version 2 and 3
      switch (obj.header.message_type) {
        case "device_configuration": { // Device message
          encode_header(bytes, 5, obj.header.protocol_version);
          encode_device_config(bytes, obj);
          encode_uint16(bytes, calc_crc(bytes.slice(1)));

          break;
        }
        case "application_configuration": { // Application message
          switch (obj.device_type) {
            case "tt":
              encode_header(bytes, 6, obj.header.protocol_version);
              encode_tt_app_config(bytes, obj);
              encode_uint16(bytes, calc_crc(bytes.slice(1)));

              break;
            default:
              throw "Invalid device type!";
          }
        }
        break;
        default:
          throw "Invalid message type!"
      }
      break;
    }
    default:
      throw "Protocol version is not suppported!"
  }
  return bytes;
}


function Encoder(obj, fPort) { // Used for The Things Network server
  return Encode(fPort, obj);
}
/**
 * Device configuration encoder
 */
function EncodeDeviceConfig(obj) {
  var bytes = [];
  encode_device_config(bytes, obj);
  return bytes;
}

function encode_device_config(bytes, obj) {
  // The following parameters refers to the same configuration, only different naming on different
  // protocol version.
  // Copy the parameter to a local one
  var number_of_unconfirmed_messages = 0;
  if (typeof obj.number_of_unconfirmed_messages != "undefined") {
    number_of_unconfirmed_messages = obj.number_of_unconfirmed_messages;
  } else if (typeof obj.unconfirmed_repeat != "undefined") {
    number_of_unconfirmed_messages = obj.unconfirmed_repeat;
  } else {
    throw new Error("Missing number_of_unconfirmed_messages OR unconfirmed_repeat parameter");
  }
  if (number_of_unconfirmed_messages < 1 || number_of_unconfirmed_messages > 5) {
    throw new Error("number_of_unconfirmed_messages is outside of specification: " + number_of_unconfirmed_messages);
  }
  if (obj.communication_max_retries < 1) {
      throw new Error("communication_max_retries is outside specification: " + obj.communication_max_retries);
  }
  if (obj.status_message_interval_seconds < 60 || obj.status_message_interval_seconds > 604800) {
      throw new Error("status_message_interval_seconds is outside specification: " + obj.status_message_interval_seconds);
  }
  if (obj.lora_failure_holdoff_count < 0 || obj.lora_failure_holdoff_count > 255) {
      throw new Error("lora_failure_holdoff_count is outside specification: " + obj.lora_failure_holdoff_count);
  }
  if (obj.lora_system_recover_count < 0 || obj.lora_system_recover_count > 255) {
      throw new Error("lora_system_recover_count is outside specification: " + obj.lora_system_recover_count);
  }
  encode_device_config_switch(bytes, obj.switch_mask);
  encode_uint8(bytes, obj.communication_max_retries);             // Unit: -
  encode_uint8(bytes, number_of_unconfirmed_messages);            // Unit: -
  encode_uint8(bytes, obj.periodic_message_random_delay_seconds); // Unit: s
  encode_uint16(bytes, obj.status_message_interval_seconds / 60); // Unit: minutes
  encode_uint8(bytes, obj.status_message_confirmed_interval);     // Unit: -
  encode_uint8(bytes, obj.lora_failure_holdoff_count);            // Unit: -
  encode_uint8(bytes, obj.lora_system_recover_count);             // Unit: -
  encode_uint16(bytes, obj.lorawan_fsb_mask[0]);                  // Unit: -
  encode_uint16(bytes, obj.lorawan_fsb_mask[1]);                  // Unit: -
  encode_uint16(bytes, obj.lorawan_fsb_mask[2]);                  // Unit: -
  encode_uint16(bytes, obj.lorawan_fsb_mask[3]);                  // Unit: -
  encode_uint16(bytes, obj.lorawan_fsb_mask[4]);                  // Unit: -
}

/**
 * TS application encoder
 */
function EncodeTtAppConfig(obj) {
  var bytes = [];
  encode_tt_app_config(bytes, obj);
  return bytes;
}

function encode_tt_app_config(bytes, obj) {
  if (obj.header.protocol_version == 2) {
    encode_device_type_v2(bytes, obj.device_type, obj.enable_rtd);
  } else if (obj.header.protocol_version == 3) {
    encode_device_type_v3(bytes, obj.device_type);
    encode_sensor_type(bytes, obj.sensor_type);
  } else {
    throw "Protocol version is not suppported!";
  }
  encode_uint16(bytes, obj.temperature_measurement_interval_seconds);   // Unit: s
  encode_uint16(bytes, obj.periodic_event_message_interval);            // Unit: -
  encode_events_mode(bytes, obj.events[0].mode);                        // Unit: -
  encode_int16(bytes, obj.events[0].threshold_temperature * 10);        // Unit: 0.1'
  encode_uint8(bytes, obj.events[0].measurement_window);                // Unit: -'
  encode_events_mode(bytes, obj.events[1].mode);                        // Unit: -
  encode_int16(bytes, obj.events[1].threshold_temperature * 10);        // Unit: 0.1'
  encode_uint8(bytes, obj.events[1].measurement_window);                // Unit: -'
  encode_events_mode(bytes, obj.events[2].mode);                        // Unit: -
  encode_int16(bytes, obj.events[2].threshold_temperature * 10);        // Unit: 0.1'
  encode_uint8(bytes, obj.events[2].measurement_window);                // Unit: -'
  encode_events_mode(bytes, obj.events[3].mode);                        // Unit: -
  encode_int16(bytes, obj.events[3].threshold_temperature * 10);        // Unit: 0.1'
  encode_uint8(bytes, obj.events[3].measurement_window);                // Unit: -'
}

/* Helper Functions *********************************************************/
// helper function to encode the header
function encode_header(bytes, message_type_id, protocol_version) {
  var b = 0;
  b += (message_type_id & 0x0F);
  b += (protocol_version & 0x0F) << 4;
  bytes.push(b);
}
// helper function to encode device type V2
function encode_device_type_v2(bytes, type, enable_rtd) {
  var value = 0;
  switch (type) {
    case "ts":
      value = 1;
      break;
    case "vs-qt":
      value = 2;
      break;
    case "vs-mt":
      value = 3;
      break;
    case "tt":
      value = 4;
      break;
    default:
      throw "Invalid device type!";
  }
  if (enable_rtd) {
    value |= 1 << 7;
  }
  encode_uint8(bytes, value);
}
// helper function to encode device type V3
function encode_device_type_v3(bytes, type) {
  var value = 0;
  switch (type) {
    case "ts":
      value = 1;
      break;
    case "vs-qt":
      value = 2;
      break;
    case "vs-mt":
      value = 3;
      break;
    case "tt":
      value = 4;
      break;
    default:
      throw "Invalid device type!";
  }
  encode_uint8(bytes, value);
}
// helper function to encode sensor type
function encode_sensor_type(bytes, type) {
  var value = 0;
  switch (type) {
    case 'PT100':
      value = 0;
      break;
    case 'J':
      value = 1;
      break;
    case 'K':
      value = 2;
      break;
    case 'T':
      value = 3;
      break;
    case 'N':
      value = 4;
      break;
    case 'E':
      value = 5;
      break;
    case 'B':
      value = 6;
      break;
    case 'R':
      value = 7;
      break;
    case 'S':
      value = 8;
      break;
    default:
      throw "Invalid thermocouple type!";
  }
  encode_uint8(bytes, value);
}
// helper function to encode event.mode
function encode_events_mode(bytes, mode) {
  switch (mode){
    case 'above':
      encode_uint8(bytes, 1);
      break;
    case 'below':
      encode_uint8(bytes, 2);
      break;
    case 'increasing':
      encode_uint8(bytes, 3);
      break;
    case 'decreasing':
      encode_uint8(bytes, 4);
      break;
    case 'off':
    default:
      encode_uint8(bytes, 0);
      break;
  }
}
// helper function to encode the device switch_mask
function encode_device_config_switch(bytes, bitmask) {
  var config_switch_mask = 0;
  if (bitmask.enable_confirmed_event_message) {
    config_switch_mask |= 1 << 0;
  }
  bytes.push(config_switch_mask & mask_byte);
}
// helper function to encode an uint32
function encode_uint32(bytes, value) {
  bytes.push(value & mask_byte);
  bytes.push((value >> 8) & mask_byte);
  bytes.push((value >> 16) & mask_byte);
  bytes.push((value >> 24) & mask_byte);
}
// helper function to encode an int32
function encode_int32(bytes, value) {
  encode_uint32(bytes, value);
}
// helper function to encode an uint16
function encode_uint16(bytes, value) {
  bytes.push(value & mask_byte);
  bytes.push((value >> 8) & mask_byte);
}
// helper function to encode an int16
function encode_int16(bytes, value) {
  encode_uint16(bytes, value);
}
// helper function to encode an uint8
function encode_uint8(bytes, value) {
  bytes.push(value & mask_byte);
}
// helper function to encode an int8
function encode_int8(bytes, value) {
  encode_uint8(bytes, value);
}
// calc_crc inspired by https://github.com/SheetJS/js-crc32
function calc_crc(buf) {
  function signed_crc_table() {
    var c = 0, table = new Array(256);
    for (var n = 0; n != 256; ++n) {
      c = n;
      c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
      table[n] = c;
    }
    return typeof Int32Array !== 'undefined' ? new Int32Array(table) :
            table;
  }
  var T = signed_crc_table();
  var C = -1;
  var i = 0;
  while (i < buf.length) C = (C >>> 8) ^ T[(C ^ buf[i++]) & 0xFF];
  return C & 0xFFFF;
}