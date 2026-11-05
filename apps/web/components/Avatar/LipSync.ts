"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface LipSyncProps {
  analyserNode: AnalyserNode | null;
}

export function useLipSync(analyserNode: AnalyserNode | null) {
  // Returns viseme morph target influences based on audio frequencies
  const [visemes, setVisemes] = useState({
    viseme_O: 0,
    viseme_aa: 0,
    viseme_E: 0,
    viseme_PP: 0,
  });

  const dataArray = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (analyserNode) {
      dataArray.current = new Uint8Array(analyserNode.frequencyBinCount);
    }
  }, [analyserNode]);

  const updateVisemes = useCallback(() => {
    if (!analyserNode || !dataArray.current) return visemes;

    analyserNode.getByteFrequencyData(dataArray.current);

    // Naive mapping of frequency bins to visemes for MVP
    // Assuming default FFT size of 2048, binCount is 1024
    // Sample rate typically 44100Hz, each bin is ~21.5Hz

    let sumO = 0; // 85-150 Hz -> bins ~4-7
    for (let i = 4; i <= 7; i++) sumO += dataArray.current[i];

    let sumAA = 0; // 150-200 Hz -> bins ~7-9
    for (let i = 7; i <= 9; i++) sumAA += dataArray.current[i];

    let sumE = 0; // 200-255 Hz -> bins ~10-12
    for (let i = 10; i <= 12; i++) sumE += dataArray.current[i];

    // High frequency spikes for consonants (viseme_PP)
    let sumPP = 0; // 2000-3000 Hz -> bins ~90-140
    for (let i = 90; i <= 140; i++) sumPP += dataArray.current[i];

    // Normalize and clamp
    const normalize = (val: number, divisor: number) => Math.min(1, val / divisor);

    const newVisemes = {
      viseme_O: normalize(sumO, 4 * 255),
      viseme_aa: normalize(sumAA, 3 * 255),
      viseme_E: normalize(sumE, 3 * 255),
      viseme_PP: normalize(sumPP, 50 * 255 * 0.5), // Lower threshold for consonants
    };

    setVisemes(newVisemes);
    return newVisemes;
  }, [analyserNode]);

  return { visemes, updateVisemes };
}
