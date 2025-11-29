import React, { useState } from "react";
import { Text, TouchableOpacity, View, Image } from "react-native";
import styles from "../styles/Trip_styles";
import { useNavigation } from "@react-navigation/native";
import { countryFlags } from "../common/Flags";

const Trip = ({
  from,
  to,
  date,
  seatsAvailable,
  description,
  tripType,
  firstName,
}) => {
  const [expanded, setExpanded] = useState(false);
  const navigation = useNavigation();

  // Extract city + country
  const originCity = from ? from.split(/[ ,]+/)[0] : "";
  const destinationCity = to ? to.split(/[ ,]+/)[0] : "";
  const originCountry = from ? from.split(/[ ,]+/)[1] : "";
  const destinationCountry = to ? to.split(/[ ,]+/)[1] : "";

  // Match flags
  let originFlag = "";
  let destinationFlag = "";
  const safeOrigin = originCountry ? originCountry.toLowerCase() : "";
  const safeDestination = destinationCountry
    ? destinationCountry.toLowerCase()
    : "";

  for (const [country, flag] of Object.entries(countryFlags)) {
    const lower = country.toLowerCase();
    if (lower === safeOrigin) originFlag = flag;
    if (lower === safeDestination) destinationFlag = flag;
  }

  // Format date
  let formattedDate = "";
  if (date) {
    formattedDate = new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
    });
    formattedDate =
      formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  }

  return (
    <TouchableOpacity activeOpacity={0.9}>
      <View style={styles.container}>
        {/* Profile + TripType */}
        <View style={styles.rowCenter}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            style={styles.profilePicture}
          >
            <Image
              source={require("../assets/profile-picture.jpeg")}
              resizeMode="cover"
              style={styles.profileImage}
            />
          </TouchableOpacity>

          <View style={styles.columnStart}>
            <Text style={styles.userName}>{firstName}</Text>
            <View style={styles.seekingRideContainer}>
              <Text style={{ color: "white", fontWeight: "700" }}>
                {tripType === "Offering" ? "Offering A Ride" : "Seeking A Ride"}
              </Text>
            </View>
          </View>
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/logo.png")}
            resizeMode="contain"
            style={styles.logo}
          />
        </View>

        {/* Destination & Date */}
        <View style={styles.destination}>
          <Text
            style={styles.destinationText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {originCity} {originFlag} → {destinationCity} {destinationFlag}
          </Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>

        {/* Description */}
        <TouchableOpacity
          style={styles.description}
          onPress={() => setExpanded(!expanded)}
        >
          <Text
            style={styles.descriptionText}
            numberOfLines={expanded ? undefined : 3}
            ellipsizeMode="tail"
          >
            {description}
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.seatsAvailable}>
            {seatsAvailable} SEATS AVAILABLE
          </Text>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Active 🟢</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default Trip;
