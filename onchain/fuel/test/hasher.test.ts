import { describe, test, expect } from "vitest";
import { sha256 } from "fuels";
import { ActionInput } from "../typescript/src/contracts/TestContract";
import { Vec } from "../typescript/src/contracts/common";
import {
  Hasher,
  encodeMultipleInputs,
  encodeCommitmentData,
} from "./manual-encoder";

// Define enum context for ActionInput and Destination
const ENUM_CONTEXT = {
  ActionInput: ["Activate", "SendFleet"],
  Destination: ["Eventual", "Known"],
};

describe("Hasher", () => {
  test("hasher produces same results as direct encoding functions", () => {
    const actions: Vec<ActionInput> = [{ Activate: { system: 1 } }];
    const secret =
      "0x0000000000000000000000000000000000000000000000000000000000000001";

    // Using direct function
    const directBytes = encodeMultipleInputs(actions, secret, ENUM_CONTEXT);
    const directHash = sha256(directBytes);

    // Using hasher
    const hasher = new Hasher(ENUM_CONTEXT);
    const hasherHash = hasher.update(actions).update(secret).finalize();

    console.log("Direct hash:", directHash);
    console.log("Hasher hash:", hasherHash);

    expect(hasherHash).toBe(directHash);
  });

  test("hasher supports method chaining", () => {
    const hasher = new Hasher(ENUM_CONTEXT);
    const result = hasher
      .update({ Activate: { system: 1 } })
      .update(42)
      .update("test")
      .finalize();

    expect(result).toMatch(/^0x[a-f0-9]{64}$/);
  });

  test("hasher getBytes returns same bytes as encodeMultipleInputs", () => {
    const data1 = { Activate: { system: 1 } };
    const data2 = 42;
    const data3 = "test";

    // Using direct function
    const directBytes = encodeMultipleInputs(data1, data2, data3, ENUM_CONTEXT);

    // Using hasher
    const hasher = new Hasher(ENUM_CONTEXT);
    const hasherBytes = hasher
      .update(data1)
      .update(data2)
      .update(data3)
      .getBytes();

    console.log("Direct bytes:", Array.from(directBytes));
    console.log("Hasher bytes:", Array.from(hasherBytes));

    expect(hasherBytes).toEqual(directBytes);
  });

  test("hasher reset works correctly", () => {
    const hasher = new Hasher(ENUM_CONTEXT);

    // Add some data
    hasher.update({ Activate: { system: 1 } }).update(42);
    const firstHash = hasher.finalize();

    // Reset and add different data
    hasher.reset().update("different").update(123);
    const secondHash = hasher.finalize();

    expect(firstHash).not.toBe(secondHash);
    expect(firstHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(secondHash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  test("hasher clone creates independent copy", () => {
    const hasher1 = new Hasher(ENUM_CONTEXT);
    hasher1.update({ Activate: { system: 1 } }).update(42);

    // Clone the hasher
    const hasher2 = hasher1.clone();

    // Add different data to each
    hasher1.update("original");
    hasher2.update("cloned");

    const hash1 = hasher1.finalize();
    const hash2 = hasher2.finalize();

    expect(hash1).not.toBe(hash2);
    expect(hash1).toMatch(/^0x[a-f0-9]{64}$/);
    expect(hash2).toMatch(/^0x[a-f0-9]{64}$/);
  });

  test("hasher handles complex action sequences", () => {
    const actions: Vec<ActionInput> = [
      { Activate: { system: 1 } },
      {
        SendFleet: {
          from: 1,
          spaceships: 100,
          destination: { Known: 2 },
        },
      },
      {
        SendFleet: {
          from: 2,
          spaceships: 50,
          destination: {
            Eventual:
              "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          },
        },
      },
    ];
    const secret =
      "0x0000000000000000000000000000000000000000000000000000000000000001";

    // Using commitment function
    const commitmentBytes = encodeCommitmentData(actions, secret);
    const commitmentHash = sha256(commitmentBytes);

    // Using hasher
    const hasher = new Hasher(ENUM_CONTEXT);
    const hasherHash = hasher.update(actions).update(secret).finalize();

    console.log("Commitment hash:", commitmentHash);
    console.log("Hasher hash:", hasherHash);

    expect(hasherHash).toBe(commitmentHash);
  });

  test("hasher handles primitive types correctly", () => {
    const hasher = new Hasher();

    // Test various primitive types
    const hash = hasher
      .update(42) // number
      .update(true) // boolean
      .update("hello") // string
      .update(
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
      ) // b256
      .finalize();

    expect(hash).toMatch(/^0x[a-f0-9]{64}$/);

    // Verify bytes are correct
    const bytes = new Hasher()
      .update(42)
      .update(true)
      .update("hello")
      .update(
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
      )
      .getBytes();

    // Should be: 8 bytes (u64) + 1 byte (bool) + 5 bytes (string) + 32 bytes (b256) = 46 bytes
    expect(bytes.length).toBe(46);
  });

  test("hasher handles empty state correctly", () => {
    const hasher = new Hasher();

    // Empty hasher should produce hash of empty bytes
    const emptyHash = hasher.finalize();
    const expectedEmptyHash = sha256(new Uint8Array(0));

    expect(emptyHash).toBe(expectedEmptyHash);

    // Empty bytes should be zero length
    const emptyBytes = new Hasher().getBytes();
    expect(emptyBytes.length).toBe(0);
  });

  test("hasher can be reused after digest", () => {
    const hasher = new Hasher(ENUM_CONTEXT);

    // Add data and get hash
    hasher.update({ Activate: { system: 1 } });
    const firstHash = hasher.finalize();

    // Add more data and get another hash (should include previous data)
    hasher.update(42);
    const secondHash = hasher.finalize();

    expect(firstHash).not.toBe(secondHash);
    expect(firstHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(secondHash).toMatch(/^0x[a-f0-9]{64}$/);

    // Verify the second hash includes both pieces of data
    const expectedBytes = encodeMultipleInputs(
      { Activate: { system: 1 } },
      42,
      ENUM_CONTEXT
    );
    const actualBytes = hasher.getBytes();
    expect(actualBytes).toEqual(expectedBytes);
  });
});
