import { ActionInput } from "../typescript/src/contracts/TestContract";
import { Vec } from "../typescript/src/contracts/common";

// Generic type for any Input type (enums, structs, primitives)
type InputType = any;

/**
 * Manually encodes ActionInput types as bytes following Sway's default hasher format
 * This avoids using Fuel's Coder classes which add extra encoding information
 */
export function encodeActionInputAsBytes(action: ActionInput): Uint8Array {
  if ("Activate" in action) {
    // Activate variant: enum discriminant (0) + system (u64)
    const buffer = new ArrayBuffer(1 + 8);
    const view = new DataView(buffer);

    view.setUint8(0, 0); // Enum discriminant for Activate
    view.setBigUint64(1, BigInt(action.Activate!.system.toString()), false); // big-endian u64

    return new Uint8Array(buffer);
  } else if ("SendFleet" in action) {
    // SendFleet variant: enum discriminant (1) + from (u64) + spaceships (u64) + destination
    const fleet = action.SendFleet!;

    // Calculate destination bytes first to know total size
    let destinationBytes: Uint8Array;
    if ("Eventual" in fleet.destination) {
      // Eventual: discriminant (0) + b256 (32 bytes)
      const destBuffer = new ArrayBuffer(1 + 32);
      const destView = new DataView(destBuffer);
      destView.setUint8(0, 0); // Enum discriminant for Eventual

      // Convert hex string to bytes
      const hexStr = fleet.destination.Eventual!.startsWith("0x")
        ? fleet.destination.Eventual!.slice(2)
        : fleet.destination.Eventual!;

      for (let i = 0; i < 32; i++) {
        const byteValue = parseInt(hexStr.substr(i * 2, 2), 16);
        destView.setUint8(1 + i, byteValue);
      }

      destinationBytes = new Uint8Array(destBuffer);
    } else if ("Known" in fleet.destination) {
      // Known: discriminant (1) + u64
      const destBuffer = new ArrayBuffer(1 + 8);
      const destView = new DataView(destBuffer);
      destView.setUint8(0, 1); // Enum discriminant for Known
      destView.setBigUint64(
        1,
        BigInt(fleet.destination.Known!.toString()),
        false
      ); // big-endian u64

      destinationBytes = new Uint8Array(destBuffer);
    } else {
      throw new Error("Invalid destination type");
    }

    // Create main buffer: discriminant (1) + from (8) + spaceships (8) + destination
    const totalSize = 1 + 8 + 8 + destinationBytes.length;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    let offset = 0;
    view.setUint8(offset, 1); // Enum discriminant for SendFleet
    offset += 1;

    view.setBigUint64(offset, BigInt(fleet.from.toString()), false); // big-endian u64
    offset += 8;

    view.setBigUint64(offset, BigInt(fleet.spaceships.toString()), false); // big-endian u64
    offset += 8;

    // Copy destination bytes
    const result = new Uint8Array(buffer);
    result.set(destinationBytes, offset);

    return result;
  } else {
    throw new Error("Invalid ActionInput type");
  }
}

/**
 * Encodes a vector of ActionInput as bytes
 * Format: concatenated action bytes (no length prefix)
 */
export function encodeActionVecAsBytes(actions: Vec<ActionInput>): Uint8Array {
  // Encode each action
  const actionBytes = actions.map((action) => encodeActionInputAsBytes(action));

  // Calculate total size
  const totalSize = actionBytes.reduce((sum, bytes) => sum + bytes.length, 0);

  // Combine all bytes
  const result = new Uint8Array(totalSize);
  let offset = 0;

  // Copy action bytes (no length prefix)
  for (const bytes of actionBytes) {
    result.set(bytes, offset);
    offset += bytes.length;
  }

  return result;
}

/**
 * Generic function to encode any Input type as bytes
 * Uses the convention that enum variants start with uppercase letters
 */
export function encodeInputAsBytes(input: InputType): Uint8Array {
  // Handle null/undefined
  if (input === null || input === undefined) {
    return new Uint8Array(0);
  }

  // Handle primitive types
  if (typeof input === "string") {
    // Check if it's a hex string (b256)
    if (input.startsWith("0x") && input.length === 66) {
      // b256 - 32 bytes
      const hexStr = input.slice(2);
      const bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16);
      }
      return bytes;
    } else {
      // Regular string - encode as UTF-8 bytes (no length prefix)
      return new TextEncoder().encode(input);
    }
  }

  if (typeof input === "number" || typeof input === "bigint") {
    // Encode as u64 (8 bytes, big-endian)
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, BigInt(input.toString()), false);
    return new Uint8Array(buffer);
  }

  if (typeof input === "boolean") {
    // Encode as single byte
    return new Uint8Array([input ? 1 : 0]);
  }

  // Handle BN (BigNumber) objects from Fuel
  if (
    input &&
    typeof input === "object" &&
    typeof input.toString === "function"
  ) {
    const str = input.toString();
    if (/^\d+$/.test(str)) {
      // It's a numeric string, treat as u64
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setBigUint64(0, BigInt(str), false);
      return new Uint8Array(buffer);
    }
  }

  // Handle arrays/vectors (including Vec<T> objects)
  if (Array.isArray(input)) {
    // Encode each element and concatenate (no length prefix)
    const elementBytes = input.map((item) => encodeInputAsBytes(item));
    const totalSize = elementBytes.reduce(
      (sum, bytes) => sum + bytes.length,
      0
    );

    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const bytes of elementBytes) {
      result.set(bytes, offset);
      offset += bytes.length;
    }
    return result;
  }

  // Handle Vec<T> objects (Fuel's Vec type)
  if (input && typeof input === "object" && Array.isArray(input.elements)) {
    // This is a Vec<T> object with an elements array
    return encodeInputAsBytes(input.elements);
  }

  // Handle objects (enums and structs)
  if (typeof input === "object" && input !== null) {
    const keys = Object.keys(input);

    // Check if it's an enum by looking for uppercase-starting keys
    const enumKeys = keys.filter((key) => /^[A-Z]/.test(key));

    if (enumKeys.length === 1 && keys.length === 1) {
      // This is an enum with a single variant
      const variantName = enumKeys[0];
      const variantValue = input[variantName];

      // Get discriminant based on common enum variant names
      const discriminant = getEnumDiscriminant(variantName);
      const discriminantByte = new Uint8Array([discriminant]);
      const valueBytes = encodeInputAsBytes(variantValue);

      const result = new Uint8Array(
        discriminantByte.length + valueBytes.length
      );
      result.set(discriminantByte, 0);
      result.set(valueBytes, discriminantByte.length);
      return result;
    }

    // Handle as struct - concatenate all field values in original order (not sorted)
    const fieldBytes: Uint8Array[] = [];
    for (const key of keys) {
      fieldBytes.push(encodeInputAsBytes(input[key]));
    }

    const totalSize = fieldBytes.reduce((sum, bytes) => sum + bytes.length, 0);
    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const bytes of fieldBytes) {
      result.set(bytes, offset);
      offset += bytes.length;
    }
    return result;
  }

  throw new Error(`Cannot encode input of type: ${typeof input}`);
}

/**
 * Helper function to get enum discriminant from variant name
 * Maps common enum variants to their expected indices
 */
function getEnumDiscriminant(variantName: string): number {
  // Common mappings for known enum variants
  const knownVariants: { [key: string]: number } = {
    Activate: 0,
    SendFleet: 1,
    Eventual: 0,
    Known: 1,
    Address: 0,
    ContractId: 1,
    // Add more as needed
  };

  if (variantName in knownVariants) {
    return knownVariants[variantName];
  }

  // Fallback: simple hash for unknown variants
  let hash = 0;
  for (let i = 0; i < variantName.length; i++) {
    const char = variantName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 256;
}

/**
 * Generic function to encode a vector of any Input type as bytes
 * Format: concatenated element bytes (no length prefix)
 */
export function encodeGenericVecAsBytes<T extends InputType>(
  items: Vec<T>
): Uint8Array {
  // Encode each item
  const itemBytes = items.map((item) => encodeInputAsBytes(item));

  // Calculate total size
  const totalSize = itemBytes.reduce((sum, bytes) => sum + bytes.length, 0);

  // Combine all bytes
  const result = new Uint8Array(totalSize);
  let offset = 0;

  // Copy item bytes (no length prefix)
  for (const bytes of itemBytes) {
    result.set(bytes, offset);
    offset += bytes.length;
  }

  return result;
}

/**
 * Encodes actions and secret for commitment hash calculation
 * This follows the pattern used in the Sway contract's _hash_actions function
 */
export function encodeCommitmentData(
  actions: Vec<ActionInput>,
  secret: string
): Uint8Array {
  const actionBytes = encodeActionVecAsBytes(actions);

  // Convert secret (b256) to bytes
  const secretHex = secret.startsWith("0x") ? secret.slice(2) : secret;
  const secretBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    secretBytes[i] = parseInt(secretHex.substr(i * 2, 2), 16);
  }

  // Combine action bytes and secret bytes
  const result = new Uint8Array(actionBytes.length + secretBytes.length);
  result.set(actionBytes, 0);
  result.set(secretBytes, actionBytes.length);

  return result;
}

/**
 * Generic encoder that takes variable arguments and concatenates their byte encodings
 * Useful for creating hash inputs from multiple data pieces
 */
export function encodeMultipleInputs(...args: InputType[]): Uint8Array {
  // Encode each argument
  const argBytes = args.map((arg) => encodeInputAsBytes(arg));

  // Calculate total size
  const totalSize = argBytes.reduce((sum, bytes) => sum + bytes.length, 0);

  // Combine all bytes
  const result = new Uint8Array(totalSize);
  let offset = 0;

  // Copy argument bytes in order
  for (const bytes of argBytes) {
    result.set(bytes, offset);
    offset += bytes.length;
  }

  return result;
}
