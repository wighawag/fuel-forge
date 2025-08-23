import { ActionInput } from "../typescript/src/contracts/TestContract";
import { Vec } from "../typescript/src/contracts/common";

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
 * Format: length (u64) + concatenated action bytes
 */
export function encodeActionVecAsBytes(actions: Vec<ActionInput>): Uint8Array {
  // Encode length as u64 (8 bytes, big-endian)
  const lengthBuffer = new ArrayBuffer(8);
  const lengthView = new DataView(lengthBuffer);
  lengthView.setBigUint64(0, BigInt(actions.length), false);

  // Encode each action
  const actionBytes = actions.map((action) => encodeActionInputAsBytes(action));

  // Calculate total size
  const totalSize =
    8 + actionBytes.reduce((sum, bytes) => sum + bytes.length, 0);

  // Combine all bytes
  const result = new Uint8Array(totalSize);
  let offset = 0;

  // Copy length
  result.set(new Uint8Array(lengthBuffer), offset);
  offset += 8;

  // Copy action bytes
  for (const bytes of actionBytes) {
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
