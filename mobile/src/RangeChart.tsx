import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, Text, View } from "react-native";
import { C } from "./theme";

interface Props {
  price: number; min: number; max: number; bins?: { lo: number; hi: number; values: number[] } | null;
  onChange: (min: number, max: number) => void; fmtPct: (v: number) => string;
}
const COLS = 60;
const sig = (v: number) => v.toLocaleString("pt-BR", { maximumSignificantDigits: 4 });

/** Gráfico de liquidez com alças arrastáveis para mínimo e máximo (escala de preço logarítmica). */
export function RangeChart({ price, min, max, bins, onChange, fmtPct }: Props) {
  const [zoom, setZoom] = useState(3);
  const [w, setW] = useState(300);
  const lo = price / zoom, hi = price * zoom, llo = Math.log(lo), lhi = Math.log(hi);
  const toF = (v: number) => (v <= 0 ? 0 : !Number.isFinite(v) ? 1 : (Math.log(v) - llo) / (lhi - llo));
  const clampF = (f: number) => Math.min(1, Math.max(0, f));
  const fMin = clampF(toF(min)), fMax = clampF(toF(max));
  // sempre a versão mais recente dos valores dentro dos gestos
  const live = useRef({ min, max, w, llo, lhi, hi, onChange });
  live.current = { min, max, w, llo, lhi, hi, onChange };
  const start = useRef({ min, max });
  const fromF = (f: number) => Math.exp(live.current.llo + f * (live.current.lhi - live.current.llo));

  const make = (kind: "min" | "max" | "body") => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { start.current = { min: live.current.min, max: live.current.max }; },
    onPanResponderMove: (_e, g) => {
      const L = live.current, s = start.current;
      const df = g.dx / L.w;
      const f0 = (v: number) => (v <= 0 ? 0 : !Number.isFinite(v) ? 1 : (Math.log(v) - L.llo) / (L.lhi - L.llo));
      if (kind === "min") { const f = clampF(f0(s.min) + df); L.onChange(f <= 0.005 ? 0 : Math.min(fromF(f), (Number.isFinite(L.max) ? L.max : L.hi * 100) * 0.9999), L.max); }
      else if (kind === "max") { const f = clampF(f0(s.max) + df); L.onChange(L.min, f >= 0.995 ? Infinity : Math.max(fromF(f), L.min * 1.0001)); }
      else { const k = Math.exp(df * (L.lhi - L.llo)); L.onChange(s.min > 0 ? s.min * k : 0, Number.isFinite(s.max) ? s.max * k : Infinity); }
    },
  });
  const pr = useMemo(() => ({ min: make("min"), max: make("max"), body: make("body") }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const cols = Array.from({ length: COLS }, (_, i) => {
    if (!bins) return 0;
    const v = Math.exp(llo + ((i + 0.5) / COLS) * (lhi - llo));
    const f = (Math.log(v) - Math.log(bins.lo)) / (Math.log(bins.hi) - Math.log(bins.lo));
    const idx = Math.floor(f * bins.values.length);
    return idx >= 0 && idx < bins.values.length ? bins.values[idx] : 0;
  });
  const H = 150;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: C.muted, fontSize: 12, flex: 1 }}>Distribuição de liquidez{bins ? "" : " (indisponível para este pool)"}</Text>
        <Pressable onPress={() => setZoom((z) => Math.max(1.15, z / 1.5))} style={{ paddingHorizontal: 12, paddingVertical: 4 }}><Text style={{ color: C.white, fontSize: 18 }}>+</Text></Pressable>
        <Pressable onPress={() => setZoom((z) => Math.min(30, z * 1.5))} style={{ paddingHorizontal: 12, paddingVertical: 4 }}><Text style={{ color: C.white, fontSize: 18 }}>−</Text></Pressable>
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H, borderColor: C.line, borderWidth: 1, borderRadius: 10, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.2)" }}>
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 14, top: 0, flexDirection: "row", alignItems: "flex-end" }}>
          {cols.map((c, i) => { const f = (i + 0.5) / COLS; const inside = f >= fMin && f <= fMax; return <View key={i} style={{ flex: 1, height: `${Math.max(c > 0 ? 3 : 0, c * 90)}%`, backgroundColor: inside ? "#38bdf8" : "rgba(56,189,248,0.35)" }} />; })}
        </View>
        <View {...pr.body.panHandlers} style={{ position: "absolute", top: 0, bottom: 0, left: `${fMin * 100}%`, width: `${Math.max(0, fMax - fMin) * 100}%`, backgroundColor: "rgba(52,211,153,0.10)" }} />
        <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: `${toF(price) * 100}%`, width: 1, backgroundColor: "#fde047" }} />
        {([["min", fMin, min], ["max", fMax, max]] as const).map(([k, f, v]) => (
          <View key={k} {...pr[k].panHandlers} style={{ position: "absolute", top: 0, bottom: 0, left: `${f * 100}%`, width: 36, marginLeft: -18, alignItems: "center", justifyContent: "center" }}>
            <View style={{ position: "absolute", top: 0, bottom: 0, width: 3, backgroundColor: "#34d399" }} />
            <View style={{ width: 12, height: 32, borderRadius: 4, backgroundColor: "#34d399" }} />
            <Text style={{ position: "absolute", top: 2, [k === "min" ? "right" : "left"]: 20, color: C.white, fontSize: 11, backgroundColor: "#1e293b", paddingHorizontal: 4, borderRadius: 4 }}>{k === "max" && !Number.isFinite(v) ? "∞" : fmtPct(v)}</Text>
          </View>
        ))}
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", justifyContent: "space-around" }}>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((f) => <Text key={f} style={{ color: C.muted, fontSize: 9 }}>{sig(Math.exp(llo + f * (lhi - llo)))}</Text>)}
        </View>
      </View>
      <Text style={{ color: C.muted, fontSize: 11 }}>Arraste as alças verdes (ou a área entre elas) para mudar a faixa. Linha amarela = preço atual.</Text>
    </View>
  );
}
