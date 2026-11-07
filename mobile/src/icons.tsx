import Svg, { Path } from "react-native-svg";

// Mesmos ícones do site (comentar, repostar, curtir, visualizações, salvar, compartilhar).
const P = {
  comment: ["M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 20.5l1.6-5.3A8.5 8.5 0 1 1 21 11.5Z"],
  repost: ["m17 2 4 4-4 4", "M3 11V9a3 3 0 0 1 3-3h15", "m7 22-4-4 4-4", "M21 13v2a3 3 0 0 1-3 3H3"],
  heart: ["M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21.7l8.8-8.7a5.2 5.2 0 0 0 0-7.4Z"],
  views: ["M4 20V10", "M10 20V4", "M16 20v-8", "M22 20H2"],
  bookmark: ["M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1Z"],
  share: ["M12 15V3", "m7 8 5-5 5 5", "M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"],
  plane: ["m22 2-11 11", "M22 2 15 22l-4-9-9-4 20-7Z"],
} as const;

export type IconName = keyof typeof P;

export function Icon({ name, color, size = 20, fill = false }: { name: IconName; color: string; size?: number; fill?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : "none"} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {P[name].map((d) => <Path key={d} d={d} />)}
    </Svg>
  );
}
