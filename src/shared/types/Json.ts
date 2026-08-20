export interface JsonObject {
  [key: string]: JsonValue
}

export type JsonValue = string | number | boolean | JsonObject | JsonValue[]
