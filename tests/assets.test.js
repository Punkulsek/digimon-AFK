import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

test("PokeAPI 151종의 정적·애니메이션 이미지 302개와 원본 해시 검증", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../public/pokemon/sources.json", import.meta.url)),
  );
  assert.equal(manifest.files.length, 302);
  assert.equal(new Set(manifest.files.map((f) => f.file)).size, 302);
  for (const entry of manifest.files) {
    assert.ok(
      entry.source.startsWith(
        `https://raw.githubusercontent.com/PokeAPI/sprites/${manifest.commit}/`,
      ),
    );
    const bytes = readFileSync(
      new URL(`../public/pokemon/${entry.file}`, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      entry.sha256,
    );
    assert.equal(bytes.length, entry.bytes);
    assert.ok(
      entry.file.endsWith(".png")
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : /GIF8[79]a/.test(bytes.subarray(0, 6).toString()),
    );
  }
});
