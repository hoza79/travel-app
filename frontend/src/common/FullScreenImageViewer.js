import React from "react";
import { Modal, TouchableOpacity, Image, View } from "react-native";
import styles from "../styles/FullScreenImageViewer_styles";

const FullScreenImageViewer = ({ source, onClose }) => {
  return (
    <Modal visible transparent animationType="slide">
      <TouchableOpacity
        style={styles.container}
        activeOpacity={1}
        onPress={onClose}
      >
        <Image source={source} style={styles.image} resizeMode="contain" />
      </TouchableOpacity>
    </Modal>
  );
};

export default FullScreenImageViewer;
