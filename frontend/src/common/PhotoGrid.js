import React, { useState } from "react";
import { View, FlatList, Dimensions } from "react-native";
import styles from "../styles/PhotoGrid_styles";
import ProfilePhotoItem from "./ProfilePhotoItem";
import FullScreenImageViewer from "./FullScreenImageViewer";

const PhotoGrid = ({ photos }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const openImage = (imageSource) => {
    setSelectedImage(imageSource);
    setIsFullScreen(true);
  };

  const closeImage = () => {
    setSelectedImage(null);
    setIsFullScreen(false);
  };

  const spacing = 11;
  const numColumns = 3;
  const screenWidth = Dimensions.get("window").width;
  const itemWidth = (screenWidth - spacing * 4) / numColumns;

  return (
    <View style={styles.container}>
      <FlatList
        data={photos}
        numColumns={numColumns}
        renderItem={({ item }) => (
          <ProfilePhotoItem
            source={{ uri: item.photo_url }}
            onPress={() => openImage({ uri: item.photo_url })}
            size={itemWidth}
            style={{ margin: spacing / 2 }}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 10 }}
      />

      {isFullScreen && selectedImage && (
        <FullScreenImageViewer source={selectedImage} onClose={closeImage} />
      )}
    </View>
  );
};

export default PhotoGrid;
