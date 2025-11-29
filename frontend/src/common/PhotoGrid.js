import React, { useState } from "react";
import { View, FlatList, Dimensions } from "react-native";
import styles from "../styles/PhotoGrid_styles";
import ProfilePhotoItem from "./ProfilePhotoItem";
import FullScreenImageViewer from "./FullScreenImageViewer";

const PhotoGrid = () => {
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

  const photos = [
    {
      id: 1,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },

    {
      id: 2,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 3,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 4,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 5,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 6,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 7,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 8,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 9,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },

    {
      id: 10,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 11,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 12,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 13,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 14,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 15,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 16,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 17,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 18,
      source: {
        uri: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e",
      },
    },
    {
      id: 19,
      source: require("../assets/profile-picture.jpeg"),
    },
    {
      id: 20,
      source: {
        uri: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
      },
    },
  ];

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
            source={item.source}
            size={itemWidth}
            onPress={() => openImage(item.source)}
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
