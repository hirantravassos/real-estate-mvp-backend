import WAWebJS from "whatsapp-web.js";

export class WhatsappHostMapper {
  static toDto(state?: WAWebJS.WAState) {
    if (!state) {
      return WAWebJS.WAState.UNPAIRED;
    }

    return {
      state,
    };
  }
}
