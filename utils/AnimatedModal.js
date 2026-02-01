import React, { useEffect, useRef, useState } from 'react';
import { Modal, Animated, StyleSheet } from 'react-native';

// Same fade timing as other screens: in 200ms, out 150ms. animationType="none" so we control all animation (no native slide).
const FADE_IN_DURATION = 200;
const FADE_OUT_DURATION = 150;

export default function AnimatedModal({
  visible,
  onRequestClose,
  children,
}) {
  const contentScale = useRef(new Animated.Value(0.95)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(visible);
  const childrenDuringClose = useRef(children);

  if (visible) {
    childrenDuringClose.current = children;
  }

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      contentOpacity.setValue(0);
      contentScale.setValue(0.95);

      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: FADE_IN_DURATION,
        useNativeDriver: true,
      }).start();

      Animated.spring(contentScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: FADE_OUT_DURATION,
        useNativeDriver: true,
      }).start();

      Animated.timing(contentScale, {
        toValue: 0.95,
        duration: FADE_OUT_DURATION,
        useNativeDriver: true,
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible, contentScale, contentOpacity]);

  const contentToShow = visible ? children : childrenDuringClose.current;

  return (
    <Modal
      visible={modalVisible}
      animationType="none"
      transparent={true}
      onRequestClose={onRequestClose}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: contentOpacity,
            transform: [{ scale: contentScale }],
          },
        ]}
        pointerEvents="box-none"
      >
        {contentToShow}
      </Animated.View>
    </Modal>
  );
}
