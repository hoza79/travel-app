import React from "react";
import { View, Text } from "react-native";

const Title = ({ style, ...props }) => (
  <View>
    <Text style={style} {...props}>
      CatchMe
    </Text>
  </View>
);

export default Title;
