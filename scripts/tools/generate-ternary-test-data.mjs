#!/usr/bin/env node
import { randomBytes } from "crypto";

function binaryToTernary(buffer) {
  const trits = [];
  for (const byte of buffer) {
    let value = byte;
    for (let i = 0; i < 6; i++) {
      trits.push(value % 3);
      value = Math.floor(value / 3);
    }
  }
  return trits;
}

function ternaryToBinaryString(trits) {
  return trits.map((t) => String(t)).join("");
}

function generateTernaryTestVector(byteLength) {
  const input = randomBytes(byteLength);
  const trits = binaryToTernary(input);

  return {
    inputHex: input.toString("hex"),
    inputBase64: input.toString("base64"),
    trits: ternaryToBinaryString(trits),
    tritCount: trits.length,
    byteLength,
    compressionRatio: (trits.length * Math.log2(3)) / (byteLength * 8),
  };
}

function generateSecurityModeTestData() {
  return {
    modes: [
      {
        mode: "phi",
        label: "Mode \u03C6",
        encryption: "phase-rotation",
        compression: "ternary-bijective",
        timestamping: "femtosecond",
        xrpl: true,
        testVector: generateTernaryTestVector(64),
      },
      {
        mode: "one",
        label: "Mode 1",
        encryption: "post-quantum-lattice",
        compression: "ternary-standard",
        timestamping: "nanosecond",
        xrpl: false,
        testVector: generateTernaryTestVector(32),
      },
      {
        mode: "zero",
        label: "Mode 0",
        encryption: "aes-256-gcm",
        compression: "gzip",
        timestamping: "microsecond",
        xrpl: false,
        testVector: generateTernaryTestVector(16),
      },
    ],
  };
}

function generateTorsionFieldTestData() {
  return {
    dimensions: Array.from({ length: 13 }, (_, i) => ({
      dimension: i + 1,
      coordinate: Math.random() * 2 * Math.PI,
      phase: Math.random() * Math.PI,
      spin: i === 12 ? (Math.random() > 0.5 ? 1 : -1) : 0,
      testTernary: generateTernaryTestVector(8).trits,
    })),
    compositeHash: randomBytes(32).toString("hex"),
    timestamp: Date.now(),
  };
}

function main() {
  console.log("PlenumNET Ternary Test Data Generator");
  console.log("=".repeat(50));

  const securityModes = generateSecurityModeTestData();
  console.log("\n--- Security Mode Test Vectors ---");
  for (const mode of securityModes.modes) {
    console.log(`\n${mode.label} (${mode.mode}):`);
    console.log(`  Encryption: ${mode.encryption}`);
    console.log(`  Compression: ${mode.compression}`);
    console.log(`  Input (hex): ${mode.testVector.inputHex.substring(0, 32)}...`);
    console.log(`  Trits: ${mode.testVector.trits.substring(0, 40)}...`);
    console.log(`  Trit count: ${mode.testVector.tritCount}`);
    console.log(`  Compression ratio: ${mode.testVector.compressionRatio.toFixed(4)}`);
  }

  const torsionField = generateTorsionFieldTestData();
  console.log("\n--- 13D Torsion Field Test Coordinates ---");
  for (const dim of torsionField.dimensions) {
    console.log(
      `  D${String(dim.dimension).padStart(2, "0")}: coord=${dim.coordinate.toFixed(4)} phase=${dim.phase.toFixed(4)} spin=${dim.spin}`
    );
  }
  console.log(`  Composite Hash: ${torsionField.compositeHash}`);

  const outputPath = process.argv[2];
  if (outputPath) {
    const output = {
      generatedAt: new Date().toISOString(),
      securityModes,
      torsionField,
      additionalVectors: Array.from({ length: 10 }, (_, i) =>
        generateTernaryTestVector(2 ** (i + 2))
      ),
    };

    const fs = await import("fs");
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\nTest data written to ${outputPath}`);
  }
}

main();
