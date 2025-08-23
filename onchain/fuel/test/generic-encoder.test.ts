import { describe, test, expect } from "vitest";
import { sha256 } from "fuels";
import { ActionInput } from "../typescript/src/contracts/TestContract";
import { Vec } from "../typescript/src/contracts/common";
import {
  encodeActionInputAsBytes,
  encodeActionVecAsBytes,
  encodeInputAsBytes,
  encodeGenericVecAsBytes,
  encodeMultipleInputs,
} from "./manual-encoder";

describe("Generic Encoder", () => {
  test("generic encoder produces same results as specific ActionInput encoder", () => {
    const action: ActionInput = { Activate: { system: 1 } };

    // Encode with specific function
    const specificBytes = encodeActionInputAsBytes(action);

    // Encode with generic function
    const genericBytes = encodeInputAsBytes(action);

    console.log("Specific encoder bytes:", Array.from(specificBytes));
    console.log("Generic encoder bytes:", Array.from(genericBytes));

    expect(genericBytes).toEqual(specificBytes);
  });

  test("generic encoder handles SendFleet actions correctly", () => {
    const action: ActionInput = {
      SendFleet: {
        from: 1,
        spaceships: 100,
        destination: { Known: 2 },
      },
    };

    const specificBytes = encodeActionInputAsBytes(action);
    const genericBytes = encodeInputAsBytes(action);

    console.log("SendFleet specific bytes:", Array.from(specificBytes));
    console.log("SendFleet generic bytes:", Array.from(genericBytes));

    expect(genericBytes).toEqual(specificBytes);
  });

  test("generic encoder handles Eventual destinations correctly", () => {
    const action: ActionInput = {
      SendFleet: {
        from: 1,
        spaceships: 50,
        destination: {
          Eventual:
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        },
      },
    };

    const specificBytes = encodeActionInputAsBytes(action);
    const genericBytes = encodeInputAsBytes(action);

    expect(genericBytes).toEqual(specificBytes);
  });

  test("generic vector encoder produces same results as specific vector encoder", () => {
    const actions: Vec<ActionInput> = [
      { Activate: { system: 1 } },
      { SendFleet: { from: 1, spaceships: 100, destination: { Known: 2 } } },
    ];

    const specificBytes = encodeActionVecAsBytes(actions);
    const genericBytes = encodeGenericVecAsBytes(actions);

    console.log("Vector specific bytes length:", specificBytes.length);
    console.log("Vector generic bytes length:", genericBytes.length);

    expect(genericBytes).toEqual(specificBytes);
  });

  test("generic encoder handles primitive types", () => {
    // Test number encoding
    const numberBytes = encodeInputAsBytes(42);
    expect(numberBytes.length).toBe(8); // u64
    expect(numberBytes).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 42]));

    // Test boolean encoding
    const trueByte = encodeInputAsBytes(true);
    const falseByte = encodeInputAsBytes(false);
    expect(trueByte).toEqual(new Uint8Array([1]));
    expect(falseByte).toEqual(new Uint8Array([0]));

    // Test b256 string encoding
    const hashBytes = encodeInputAsBytes(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    expect(hashBytes.length).toBe(32);
    expect(hashBytes[0]).toBe(0x12);
    expect(hashBytes[1]).toBe(0x34);
  });

  test("generic encoder distinguishes enums from structs", () => {
    // Enum (uppercase key)
    const enumObj = { Known: 42 };
    const enumBytes = encodeInputAsBytes(enumObj);

    // Struct (lowercase key)
    const structObj = { system: 42 };
    const structBytes = encodeInputAsBytes(structObj);

    console.log("Enum bytes:", Array.from(enumBytes));
    console.log("Struct bytes:", Array.from(structBytes));

    // Enum should have discriminant byte, struct should not
    expect(enumBytes.length).toBe(9); // 1 discriminant + 8 u64
    expect(structBytes.length).toBe(8); // just 8 u64
    expect(enumBytes[0]).toBe(1); // Known discriminant
  });

  test("generic commitment encoder works with variable arguments", () => {
    const actions: Vec<ActionInput> = [{ Activate: { system: 1 } }];
    const secret =
      "0x0000000000000000000000000000000000000000000000000000000000000001";
    const extraData = 42;

    // Test with multiple arguments
    const genericCommitmentBytes = encodeMultipleInputs(
      actions,
      secret,
      extraData
    );
    const hash = sha256(genericCommitmentBytes);

    console.log(
      "Generic commitment bytes length:",
      genericCommitmentBytes.length
    );
    console.log("Generic commitment hash:", hash);

    // Should be action bytes + secret bytes + extra data bytes
    expect(genericCommitmentBytes.length).toBe(9 + 32 + 8); // Activate (9) + secret (32) + u64 (8)
    expect(hash).toMatch(/^0x[a-f0-9]{64}$/);

    // Test with just actions and secret (original behavior)
    const simpleCommitmentBytes = encodeMultipleInputs(actions, secret);
    expect(simpleCommitmentBytes.length).toBe(9 + 32); // Activate (9) + secret (32)
  });

  test("generic encoder handles Vec objects", () => {
    // Test with a Vec-like object (has elements array)
    const vecObj = {
      elements: [1, 2, 3],
      length: 3,
    };

    const bytes = encodeInputAsBytes(vecObj);
    console.log("Vec object bytes:", Array.from(bytes));

    // Should encode the elements array: 3 u64 values = 24 bytes
    expect(bytes.length).toBe(24); // 3 * 8 bytes each

    // Should be same as encoding the array directly
    const arrayBytes = encodeInputAsBytes([1, 2, 3]);
    expect(bytes).toEqual(arrayBytes);
  });

  test("generic encoder handles mixed types", () => {
    // Test with a custom object that has both enum-like and struct-like properties
    const mixedObj = {
      // This should be treated as struct fields (lowercase)
      id: 123,
      name: "test",
      active: true,
    };

    const bytes = encodeInputAsBytes(mixedObj);
    console.log("Mixed object bytes:", Array.from(bytes));

    // Should concatenate fields in original order: id, name, active
    // id (8 bytes) + name (4 bytes UTF-8) + active (1 byte) = 13 bytes
    expect(bytes.length).toBe(13);
  });
});
