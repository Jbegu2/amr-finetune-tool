"use client";

import { useState } from "react";

type Point = { x: number; y: number; z?: number };

export default function FineTunePage() {
  const [points, setPoints] = useState<Point[]>([
    { x: 1.0, y: 2.0, z: 0.0 },
    { x: 1.002, y: 1.998, z: 0.0 },
    { x: 0.999, y: 2.001, z: 0.0 },
    { x: 1.001, y: 2.003, z: 0.0 },
  ]);
  const [result, setResult] = useState<string>("");

  async function run() {
    const res = await fetch("http://localhost:8000/finetune/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points, in_unit: "m" }),
    });
    const json = await res.json();
    setResult(JSON.stringify(json, null, 2));
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Fine Tune Points</h1>
      <button onClick={run} className="px-4 py-2 rounded bg-black text-white">
        Run
      </button>
      <pre className="p-4 bg-gray-100 rounded overflow-auto">{result}</pre>
    </div>
  );
}
