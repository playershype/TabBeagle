import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';
import { colors } from '../theme';

// Short opening animation shown on every app launch, then hands off to the app.
// No buttons, no network calls: it only runs while the app loads.
const HOLD_MS = 1600;
const FADE_OUT_MS = 350;

export default function Splash({ onDone }: { onDone: () => void }) {
  const logo = useRef(new Animated.Value(0.8)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const tagline = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    Animated.parallel([
      Animated.timing(logo, { toValue: 1, duration: 700, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.timing(tagline, { toValue: 1, duration: 900, delay: 400, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true }).start(() => {
        if (!cancelled) onDone();
      });
    }, HOLD_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [fade, logo, tagline, onDone]);

  return (
    <Animated.View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', opacity: fade }}>
      <Animated.View style={{ transform: [{ scale: logo }], alignItems: 'center' }}>
        <Image source={require('../../assets/brand.png')} style={{ width: 140, height: 140 }} accessibilityIgnoresInvertColors />
        <Text style={{ marginTop: 16, fontSize: 28, fontWeight: '700', color: colors.ink }}>TabBeagle</Text>
      </Animated.View>
      <Animated.View style={{ opacity: tagline, marginTop: 8, paddingHorizontal: 32 }}>
        <Text style={{ textAlign: 'center', fontSize: 15, color: colors.muted }}>Get paid without chasing customers.</Text>
      </Animated.View>
    </Animated.View>
  );
}
