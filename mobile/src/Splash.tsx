import { useEffect, useRef } from "react";
import { Animated, Easing, Image, View } from "react-native";
import { C } from "./theme";

/** Tela de abertura: fundo azul, o N do logo bem grande e o nome NIZA HUB, com zoom lento enquanto o app carrega. */
export function Splash() {
  const z = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(z, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(z, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
  }, [z, fade]);
  const scale = z.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  return (
    <View style={{ flex: 1, backgroundColor: "#0b1a4a", alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ alignItems: "center", opacity: fade, transform: [{ scale }] }}>
        <Image source={require("../assets/logo-niza-mark.webp")} style={{ width: 230, height: 202 }} resizeMode="contain" />
        <Animated.Text style={{ marginTop: 18, fontFamily: "serif", fontSize: 30, fontWeight: "700", letterSpacing: 6, color: C.goldSoft }}>
          NIZA <Animated.Text style={{ fontWeight: "500", color: C.gold }}>HUB</Animated.Text>
        </Animated.Text>
      </Animated.View>
    </View>
  );
}
