// https://github.com/fastify/secure-json-parse
// https://github.com/hapijs/bourne
const suspectProtoRx =
  /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const suspectConstructorRx =
  /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;

const JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;

function jsonParseTransform(key: string, value: any): any {
  if (
    key === "__proto__" ||
    (key === "constructor" &&
      value &&
      typeof value === "object" &&
      "prototype" in value)
  ) {
    warnKeyDropped(key);
    return;
  }
  return value;
}

function warnKeyDropped(key: string): void {
  console.warn(`[destr] Dropping "${key}" key to prevent prototype pollution.`);
}

export type Options = {
  strict?: boolean;
};

export function destr(value: any, options: Options = {}): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const _value = value.trim();
  if (
    // eslint-disable-next-line unicorn/prefer-at
    value[0] === '"' &&
    value.at(-1) === '"' &&
    !value.includes("\\")
  ) {
    return _value.slice(1, -1);
  }

  if (_value.length <= 9) {
    const _lval = _value.toLowerCase();
    if (_lval === "true") {
      return true;
    }
    if (_lval === "false") {
      return false;
    }
    if (_lval === "undefined") {
      return undefined;
    }
    if (_lval === "null") {
      // eslint-disable-next-line unicorn/no-null
      return null;
    }
    if (_lval === "nan") {
      return Number.NaN;
    }
    if (_lval === "infinity") {
      return Number.POSITIVE_INFINITY;
    }
    if (_lval === "-infinity") {
      return Number.NEGATIVE_INFINITY;
    }
  }

  if (!JsonSigRx.test(value)) {
    if (options.strict) {
      throw new SyntaxError("[destr] Invalid JSON");
    }
    return value;
  }

  try {
    if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
      if (options.strict) {
        throw new Error("[destr] Possible prototype pollution");
      }
      return JSON.parse(value, jsonParseTransform);
    }
    return JSON.parse(value);
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return value;
  }
}

export function safeDestr(value: any, options: Options = {}): unknown {
  return destr(value, { ...options, strict: true });
}

export default destr;
