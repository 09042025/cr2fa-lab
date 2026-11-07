import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

/** Sino dourado cheio, com relevo (luz no alto, sombra embaixo) e sombra projetada. */
export function GoldBell({ size = 26 }: { size?: number }) {
  const body = "M12 2.5c-.9 0-1.6.7-1.6 1.5v.5C7.5 5.2 5.7 7.6 5.7 10.5v3.2c0 .9-.4 1.7-1 2.3l-.8.9c-.5.6-.1 1.6.7 1.6h14.8c.8 0 1.2-1 .7-1.6l-.8-.9c-.6-.6-1-1.4-1-2.3v-3.2c0-2.9-1.8-5.3-4.7-6V4c0-.8-.7-1.5-1.6-1.5Z";
  const clap = "M9.4 19.4a2.6 2.6 0 0 0 5.2 0Z";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="bg" x1="0.15" y1="0" x2="0.85" y2="1">
          <Stop offset="0" stopColor="#fff3b8" /><Stop offset="0.35" stopColor="#f0c24a" /><Stop offset="0.7" stopColor="#c8901a" /><Stop offset="1" stopColor="#8a5a08" />
        </LinearGradient>
        <LinearGradient id="bh" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#fff" stopOpacity="0.85" /><Stop offset="1" stopColor="#fff" stopOpacity="0" /></LinearGradient>
      </Defs>
      <Path d={body} fill="#000" fillOpacity={0.5} transform="translate(0.5 1.1)" />
      <Path d={clap} fill="#000" fillOpacity={0.5} transform="translate(0.5 1.1)" />
      <Path d={clap} fill="url(#bg)" stroke="#7a4f06" strokeWidth={0.5} />
      <Path d={body} fill="url(#bg)" stroke="#7a4f06" strokeWidth={0.55} strokeLinejoin="round" />
      <Path d="M8 10.2c0-1.9 1.1-3.5 2.9-4.2" fill="none" stroke="url(#bh)" strokeWidth={1.3} strokeLinecap="round" />
      <Path d="M6.4 16.9h11.2" stroke="#7a4f06" strokeOpacity={0.45} strokeWidth={0.6} />
      <Path d="M6.2 16.2h11.6" stroke="#fff3b8" strokeOpacity={0.5} strokeWidth={0.4} />
    </Svg>
  );
}
