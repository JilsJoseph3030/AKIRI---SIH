import { advanceVoice, detectIntent, newVoiceSession } from "./src/domain/voice";

console.log("intent of pickup-phrase:", detectIntent("pickup karayche aahe"));
const s = newVoiceSession("DBG");
console.log("t1:", JSON.stringify(await advanceVoice(s, "marathi", "v", { exaLookup: async () => null })), "step:", s.step);
console.log("t2:", JSON.stringify(await advanceVoice(s, "pickup karayche aahe", "v", { exaLookup: async () => null })), "step:", s.step, "intent:", s.intent);
console.log("t3:", JSON.stringify(await advanceVoice(s, "battery 5 kilo", "v", { exaLookup: async () => null })), "step:", s.step, "slots:", JSON.stringify(s.slots));
