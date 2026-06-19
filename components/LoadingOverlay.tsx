// components/LoadingOverlay.tsx
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  mensaje: string;
  icono?: string;
  submensaje?: string;
}

export default function LoadingOverlay({ visible, mensaje, icono = 'sync-circle', submensaje }: Props) {
  if (!visible) return null;
  return (
    <View style={s.overlay}>
      <View style={s.box}>
        <Ionicons name={icono as any} size={52} color="#0EA5E9" />
        <ActivityIndicator size="large" color="#0EA5E9" style={{ marginTop: 14 }} />
        <Text style={s.msg}>{mensaje}</Text>
        {submensaje ? <Text style={s.sub}>{submensaje}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  box:      { backgroundColor: '#FFF', borderRadius: 20, padding: 32, alignItems: 'center', minWidth: 260, maxWidth: 320, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  msg:      { fontSize: 16, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginTop: 16 },
  sub:      { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6 },
});
