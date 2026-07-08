import { CONFIG, json } from "../_shared.js";

export function onRequestGet() {
  return json(CONFIG);
}
