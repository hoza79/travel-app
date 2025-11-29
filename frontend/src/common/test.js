import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Image,
  FlatList,
} from "react-native";
import React, { useState } from "react";
import styles from "../styles/PostScreen_styles";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SuccessMessageBox from "../common/SuccessMessageBox";
import { GOOGLE_API_KEY } from "@env";
import BASE_URL from "../config/api";

let fromTimeout;
let toTimeout;

const PostScreen = () => {
  const navigation = useNavigation();

  const [selectedMain, setSelectedMain] = useState("trip");
  const [tripType, setTripType] = useState("Offering");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [date, setDate] = useState("");
  const [seatsAvailable, setSeatsAvailable] = useState("");
  const [description, setDescription] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  let timeouts = { from: null, to: null };

  const fetchSuggestions = async (query, type) => {
    if (!query || query.length < 2) {
      if (type === "from") setFromSuggestions([]);
      else setToSuggestions([]);
      return;
    }

    clearTimeout(timeouts[type]);
    timeouts[type] = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            query
          )}&key=${GOOGLE_API_KEY}&language=en&types=(cities)`
        );
        const data = await res.json();

        if (!data.predictions || data.predictions.length === 0) {
          if (type === "from") setFromSuggestions([]);
          else setToSuggestions([]);
          return;
        }

        const simplified = data.predictions.map((item) => ({
          id: item.place_id,
          name: item.description,
        }));

        if (type === "from") setFromSuggestions(simplified);
        else setToSuggestions(simplified);
      } catch (e) {
        console.error(`${type} fetch error:`, e);
      }
    }, 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Create Post</Text>
        <Image source={require("../assets/logo.png")} style={styles.logo} />
      </View>

      <View style={styles.mainTabContainer}>
        <TouchableOpacity
          style={[
            styles.mainTab,
            selectedMain === "trip" && styles.activeMainTab,
          ]}
          onPress={() => setSelectedMain("trip")}
        >
          <Text
            style={[
              styles.mainTabText,
              selectedMain === "trip" && styles.activeMainText,
            ]}
          >
            Trip
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainTab,
            selectedMain === "photo" && styles.activeMainTab,
          ]}
          onPress={() => setSelectedMain("photo")}
        >
          <Text
            style={[
              styles.mainTabText,
              selectedMain === "photo" && styles.activeMainText,
            ]}
          >
            Photo
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {selectedMain === "trip" && (
            <View style={styles.tripInfoWrapper}>
              <View style={styles.tripInfo}>
                <View style={styles.subTabInsideBox}>
                  <TouchableOpacity
                    style={[
                      styles.subTabSmall,
                      tripType === "Offering" && styles.activeSubTab,
                    ]}
                    onPress={() => setTripType("Offering")}
                  >
                    <Text
                      style={[
                        styles.subText,
                        tripType === "Offering" && styles.activeSubText,
                      ]}
                    >
                      Offering
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.subTabSmall,
                      tripType === "Searching" && styles.activeSubTab,
                    ]}
                    onPress={() => setTripType("Searching")}
                  >
                    <Text
                      style={[
                        styles.subText,
                        tripType === "Searching" && styles.activeSubText,
                      ]}
                    >
                      Searching
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ position: "relative", marginBottom: 10 }}>
                  <View style={styles.inputContainer}>
                    <Image
                      source={require("../assets/mapIcon.png")}
                      style={styles.icon}
                    />
                    <TextInput
                      placeholder="From"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.textInput}
                      value={from}
                      onChangeText={(text) => {
                        setFrom(text);
                        fetchSuggestions(text, "from");
                      }}
                      onFocus={() => setToSuggestions([])}
                    />
                  </View>
                  {fromSuggestions.length > 0 && (
                    <FlatList
                      data={fromSuggestions}
                      keyExtractor={(item) => item.id}
                      style={styles.dropdown}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => {
                            setFrom(item.name);
                            setFromSuggestions([]);
                          }}
                        >
                          <Text style={styles.dropdownText}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>

                <View style={{ position: "relative", marginBottom: 10 }}>
                  <View style={styles.inputContainer}>
                    <Image
                      source={require("../assets/mapIcon.png")}
                      style={styles.icon}
                    />
                    <TextInput
                      placeholder="To"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.textInput}
                      value={to}
                      onChangeText={(text) => {
                        setTo(text);
                        fetchSuggestions(text, "to");
                      }}
                      onFocus={() => setFromSuggestions([])}
                    />
                  </View>
                  {toSuggestions.length > 0 && (
                    <FlatList
                      data={toSuggestions}
                      keyExtractor={(item) => item.id}
                      style={styles.dropdown}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => {
                            setTo(item.name);
                            setToSuggestions([]);
                          }}
                        >
                          <Text style={styles.dropdownText}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>

                <View style={styles.dateAndSeatsContainer}>
                  <View style={styles.dateAndIcon}>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                      <Image
                        source={require("../assets/dateIcon.png")}
                        style={styles.icon}
                      />
                    </TouchableOpacity>
                    <TextInput
                      placeholder="Date (YYYY-MM-DD)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.smallInput}
                      value={date}
                      editable={false}
                    />
                  </View>

                  <TextInput
                    placeholder={
                      tripType === "Offering"
                        ? "Seats available"
                        : "Seats needed"
                    }
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.smallInput}
                    onChangeText={setSeatsAvailable}
                  />
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={date ? new Date(date) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        const formatted = selectedDate
                          .toISOString()
                          .split("T")[0];
                        setDate(formatted);
                      }
                    }}
                  />
                )}

                <TextInput
                  placeholder="Description"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  style={styles.descriptionTextInput}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={300}
                  onChangeText={setDescription}
                />
              </View>
            </View>
          )}

          {selectedMain === "photo" && (
            <View style={styles.photoContainer}>
              <TouchableOpacity style={styles.uploadBox}>
                <Image
                  source={require("../assets/uploadIcon.png")}
                  style={styles.uploadIcon}
                />
                <Text style={styles.uploadText}>Upload photo</Text>
                <Text style={styles.uploadHint}>
                  Tap to select from gallery
                </Text>
              </TouchableOpacity>

              <TextInput
                placeholder="Location"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.textInputPhoto}
              />

              <TextInput
                placeholder="Tag companions"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.textInputPhoto}
              />

              <TextInput
                placeholder="Description"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.descriptionPhotoInput}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          )}
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <TouchableOpacity
        style={styles.postButton}
        onPress={async () => {
          if (selectedMain === "photo") {
            setMessageType("success");
            setMessage("Photo post UI only for now");
            setVisible(true);
            setTimeout(() => setVisible(false), 2000);
            return;
          }

          try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;
            const response = await fetch(`${BASE_URL}/post`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                from,
                to,
                date,
                seatsAvailable,
                description,
                type: tripType,
              }),
            });
            const data = await response.json();
            const messageText = Array.isArray(data.message)
              ? data.message[0]
              : data.message;
            if (response.ok) {
              setMessageType("success");
              setMessage(messageText);
              setVisible(true);
              setTimeout(() => setVisible(false), 3000);
              setTimeout(() => navigation.replace("BottomNavigator"), 3000);
            } else {
              setMessageType("error");
              setMessage(messageText);
              setVisible(true);
              setTimeout(() => setVisible(false), 2000);
            }
          } catch (error) {
            console.error("❌ Fetch error:", error);
          }
        }}
      >
        <Text style={styles.buttonText}>Post</Text>
      </TouchableOpacity>

      {visible && <SuccessMessageBox text={message} type={messageType} />}
    </View>
  );
};

export default PostScreen;











import React, { useState, useEffect } from "react";
import {
  View,
  RefreshControl,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import TravelCard from "../common/TravelCard";
import styles from "../styles/HomeScreen_styles";
import * as Location from "expo-location";
import BASE_URL from "../config/api";
import { getSocket, onSocketReady } from "../socket";

const HomeScreen = () => {
  const [trips, setTrips] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  const fetchTrips = async (lat, lng) => {
    if (!lat || !lng) return;
    try {
      const response = await fetch(
        `${BASE_URL}/post/nearby?lat=${lat}&lng=${lng}`
      );
      const data = await response.json();
      setTrips(data);
      setFilteredTrips(data);
    } catch (error) {
      console.error("❌ Fetch error:", error);
    }
    setRefreshing(false);
  };

  const fetchPhotos = async () => {
    try {
      const response = await fetch(`${BASE_URL}/post/photos`);
      const data = await response.json();
      setPhotos(data);
    } catch (error) {
      console.error("❌ Fetch error:", error);
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const current_location = await Location.getCurrentPositionAsync({});
      const lat = current_location.coords.latitude;
      const lng = current_location.coords.longitude;

      setUserLat(lat);
      setUserLng(lng);

      await fetchTrips(lat, lng);
      await fetchPhotos();
    })();
  }, []);

  // 🔥 LISTEN TO SOCKET AND REFRESH LIST WHEN REQUEST IS ACCEPTED
  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      const handler = () => {
        if (userLat && userLng) fetchTrips(userLat, userLng);
      };

      socket.on("new_notification", handler);

      return () => socket.off("new_notification", handler);
    });
  }, [userLat, userLng]);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredTrips(trips);
      return;
    }

    const lower = search.toLowerCase();
    const results = trips.filter((t) =>
      `${t.origin} ${t.destination}`.toLowerCase().includes(lower)
    );
    setFilteredTrips(results);
  }, [search, trips]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <FlashList
          data={filteredTrips}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchTrips(userLat, userLng)}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search trips..."
                placeholderTextColor="#9bb0d4"
                style={styles.searchBar}
              />
            </View>
          }
          renderItem={({ item }) => (
            <TravelCard
              from={item.origin}
              to={item.destination}
              date={item.trip_date}
              seatsAvailable={item.available_seats}
              description={item.description}
              tripType={item.type}
              firstName={item.first_name}
              distance={item.distance}
              creatorId={item.creator_id}
              tripId={item.id}
              profilePhoto={item.profile_photo}
            />
          )}
          estimatedItemSize={400}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

export default HomeScreen;











































































import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Match } from '../decorators/match-password.decorator';

export class CreateRegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  first_name: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  last_name: string;

  @IsEmail()
  @IsNotEmpty({ message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(20, { message: 'Password cannot be longer than 20 characters' })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @Match('password', { message: 'Passwords do not match.' })
  confirmedPassword: string;
}


import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RegisterService } from './register.service';
import { CreateRegisterDto } from './dto/create-register.dto';
import { UpdateRegisterDto } from './dto/update-register.dto';

@Controller('register')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post()
  create(@Body() createRegisterDto: CreateRegisterDto) {
    return this.registerService.create(createRegisterDto);
  }

  @Get()
  findAll() {
    return this.registerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.registerService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRegisterDto: UpdateRegisterDto) {
    return this.registerService.update(+id, updateRegisterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.registerService.remove(+id);
  }
}


import { Module } from '@nestjs/common';
import { RegisterService } from './register.service';
import { RegisterController } from './register.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [RegisterController],
  providers: [RegisterService],
})
export class RegisterModule {}


import { Inject, Injectable } from '@nestjs/common';
import { CreateRegisterDto } from './dto/create-register.dto';
import { UpdateRegisterDto } from './dto/update-register.dto';
import type { Pool } from 'mysql2/promise';
import * as bcrypt from 'bcrypt';
import { generateToken } from 'src/utils/jwt.utils';

@Injectable()
export class RegisterService {
  constructor(@Inject('DATABASE_CONNECTION') private readonly db: Pool) {}

  async create(createRegisterDto: CreateRegisterDto) {
    const { first_name, last_name, email, password } = createRegisterDto;
    const saltRound = 10;
    const hashedPassword = await bcrypt.hash(password, saltRound);

    try {
      const [result]: any = await this.db.query(
        'INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)',
        [first_name, last_name, email, hashedPassword],
      );

      const token = generateToken({
        id: result.insertId,
        email,
        first_name,
        last_name,
      });

      return {
        message: 'User registered successfully.',
        token,
        user: {
          id: result.insertId,
          email,
          first_name,
          last_name,
        },
      };
    } catch (error) {
      console.error('❌ Database Error:', error);
      throw error;
    }
  }

  findAll() {
    return `This action returns all register`;
  }

  findOne(id: number) {
    return `This action returns a #${id} register`;
  }

  update(id: number, updateRegisterDto: UpdateRegisterDto) {
    return `This action updates a #${id} register`;
  }

  remove(id: number) {
    return `This action removes a #${id} register`;
  }
}


import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCompleteProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  interests?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsString()
  profile_photo?: string;

  @IsOptional()
  @IsString()
  cover_photo?: string;
}

import { Controller, Post, Body, Req } from '@nestjs/common';
import { CompleteProfileService } from './complete-profile.service';
import { CreateCompleteProfileDto } from './dto/create-complete-profile.dto';

@Controller('profile')
export class CompleteProfileController {
  constructor(
    private readonly completeProfileService: CompleteProfileService,
  ) {}

  @Post('setup')
  async setup(@Req() req, @Body() dto: CreateCompleteProfileDto) {
    // You pass the token manually, so extract userId from request header manually:
    const token = req.headers.authorization?.split(' ')[1];

    // decode token (VERY light decoding, same as your login/register do)
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString(),
    );
    const userId = payload.id;

    return this.completeProfileService.completeProfile(userId, dto);
  }
}

import { Module } from '@nestjs/common';
import { CompleteProfileController } from './complete-profile.controller';
import { CompleteProfileService } from './complete-profile.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CompleteProfileController],
  providers: [CompleteProfileService],
})
export class CompleteProfileModule {}

import { Inject, Injectable } from '@nestjs/common';
import { CreateCompleteProfileDto } from './dto/create-complete-profile.dto';
import type { Pool } from 'mysql2/promise';

@Injectable()
export class CompleteProfileService {
  constructor(@Inject('DATABASE_CONNECTION') private readonly db: Pool) {}

  async completeProfile(userId: number, dto: CreateCompleteProfileDto) {
    const { bio, city, interests, age, profile_photo, cover_photo } = dto;

    try {
      await this.db.query(
        `UPDATE users
         SET bio = ?, city = ?, interests = ?, age = ?, profile_photo = ?, cover_photo = ?
         WHERE id = ?`,
        [bio, city, interests, age, profile_photo, cover_photo, userId],
      );

      return { message: 'Profile completed successfully.' };
    } catch (error) {
      console.error('❌ Database Error (completeProfile):', error);
      throw error;
    }
  }
}


import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePhotoDto {
  @IsNotEmpty()
  @IsString()
  photo_url: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePostDto {
  @IsNotEmpty({ message: "Can't be empty" })
  @IsString()
  from: string;

  @IsNotEmpty({ message: "Can't be empty" })
  @IsString()
  to: string;

  @IsNotEmpty({ message: 'Please enter a valid date' })
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt({ message: 'Seats must be a number' })
  seatsAvailable: number;

  @IsString()
  description: string;

  @IsEnum(['Offering', 'Searching'], {
    message: 'Type must be Offering or Searching',
  })
  type: 'Offering' | 'Searching';
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { verifyToken } from 'src/utils/jwt.utils';
import { CreatePhotoDto } from './dto/create-photo.dto';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  create(@Req() req, @Body() createPostDto: CreatePostDto) {
    const userId = verifyToken(req);
    return this.postService.create(createPostDto, userId);
  }

  @Get()
  findAll() {
    return this.postService.findAll();
  }

  @Get('nearby')
  findNearby(@Query('lat') lat: number, @Query('lng') lng: number) {
    return this.postService.findNearby(lat, lng);
  }

  @Get('user/:id')
  findByUser(@Param('id') id: number) {
    return this.postService.findByUser(id);
  }

  @Get('my-trips')
  findMyTrips(@Req() req) {
    const userId = verifyToken(req);
    return this.postService.findMyTrips(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postService.update(+id, updatePostDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postService.remove(+id);
  }

  @Post('photo')
  createPhoto(@Req() req, @Body() createPhotoDto: CreatePhotoDto) {
    const userId = verifyToken(req);
    return this.postService.createPhoto(createPhotoDto, userId);
  }

  @Get('photos')
  getAllPhotos() {
    return this.postService.getAllPhotos();
  }
}

import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}

import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import type { Pool } from 'mysql2/promise';
import { getCoordinates } from 'src/utils/geocoding.utils';
import { CreatePhotoDto } from './dto/create-photo.dto';

@Injectable()
export class PostService {
  constructor(@Inject('DATABASE_CONNECTION') private readonly db: Pool) {}

  async create(createPostDto: CreatePostDto, userId: number) {
    const { from, to, date, seatsAvailable, description, type } = createPostDto;

    const from_location = await getCoordinates(from);
    const to_location = await getCoordinates(to);

    const from_lat = from_location.lat;
    const from_lng = from_location.lng;
    const to_lat = to_location.lat;
    const to_lng = to_location.lng;

    try {
      const [rows]: any = await this.db.query(
        'SELECT COUNT(*) AS count FROM trips WHERE creator_id = ?',
        [userId],
      );
      const userPostCount = rows[0].count;

      if (userPostCount >= 3) {
        throw new BadRequestException(
          'You have reached the maximum number of posts',
        );
      }

      await this.db.query(
        `INSERT INTO trips (
          creator_id, origin, destination, trip_date,
          available_seats, description, type,
          origin_lat, origin_lng, destination_lat, destination_lng
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          from,
          to,
          date,
          seatsAvailable,
          description,
          type,
          from_lat,
          from_lng,
          to_lat,
          to_lng,
        ],
      );

      return { message: 'Trip registered successfully' };
    } catch (error) {
      console.error('❌ Database Error (create):', error);
      throw error;
    }
  }

  async findAll() {
    try {
      const [rows] = await this.db.query(
        `SELECT trips.*, users.first_name, users.profile_photo
         FROM trips
         JOIN users ON trips.creator_id = users.id
         ORDER BY trip_date DESC`,
      );
      return rows;
    } catch (error) {
      console.error('❌ Database Error (findAll):', error);
      throw error;
    }
  }

  async findNearby(userLat: number, userLng: number) {
    try {
      const [rows] = await this.db.query(
        `SELECT 
          trips.*, 
          users.first_name,
          users.profile_photo,
          (6371 * acos(
            cos(radians(?)) *
            cos(radians(origin_lat)) *
            cos(radians(origin_lng) - radians(?)) +
            sin(radians(?)) *
            sin(radians(origin_lat))
          )) AS distance
        FROM trips
        JOIN users ON trips.creator_id = users.id
        WHERE origin_lat IS NOT NULL AND destination_lat IS NOT NULL
        ORDER BY distance ASC`,
        [userLat, userLng, userLat],
      );
      return rows;
    } catch (error) {
      console.error('❌ Database Error (findNearby):', error);
      throw error;
    }
  }

  async findByUser(userId: number) {
    try {
      const [rows] = await this.db.query(
        `SELECT trips.*, users.first_name, users.profile_photo
         FROM trips
         JOIN users ON trips.creator_id = users.id
         WHERE creator_id = ?
         ORDER BY trip_date DESC`,
        [userId],
      );
      return rows;
    } catch (error) {
      console.error('❌ Database Error (findByUser):', error);
      throw error;
    }
  }

  async findMyTrips(userId: number) {
    try {
      const [rows] = await this.db.query(
        `SELECT trips.*, users.first_name, users.profile_photo
         FROM trips
         JOIN users ON trips.creator_id = users.id
         WHERE creator_id = ?
         ORDER BY trip_date DESC`,
        [userId],
      );
      return rows;
    } catch (error) {
      console.error('❌ Database Error (findMyTrips):', error);
      throw error;
    }
  }

  async findOne(id: number) {
    try {
      const [rows]: any = await this.db.query(
        `SELECT 
          trips.*, 
          users.first_name, 
          users.profile_photo
        FROM trips
        JOIN users ON trips.creator_id = users.id
        WHERE trips.id = ?
        LIMIT 1`,
        [id],
      );

      if (!rows || rows.length === 0) {
        throw new NotFoundException('Trip not found');
      }

      const r = rows[0];

      return {
        id: r.id,
        from: r.origin,
        to: r.destination,
        date: r.trip_date,
        seatsAvailable: r.available_seats,
        description: r.description,
        tripType: r.type,
        creatorId: r.creator_id,
        firstName: r.first_name,
        profilePhoto: r.profile_photo,
        distance: null,
      };
    } catch (error) {
      console.error('❌ Database Error (findOne):', error);
      throw error;
    }
  }

  update(id: number, updatePostDto: UpdatePostDto) {
    return `This action updates a #${id} post`;
  }

  remove(id: number) {
    return `This action removes a #${id} post`;
  }

  async createPhoto(createPhotoDto: CreatePhotoDto, userId: number) {
    const { photo_url, location, description } = createPhotoDto;
    try {
      await this.db.query(
        `INSERT INTO photos (user_id, photo_url, location, description)
        VALUES (?, ?, ?, ?)`,
        [userId, photo_url, location, description],
      );
      return { message: 'Photo post created successfully' };
    } catch (error) {
      console.error('❌ Database Error (createPhoto):', error);
      throw error;
    }
  }

  async getAllPhotos() {
    try {
      const [rows]: any = await this.db.query(
        `SELECT 
         photos.id,
         photos.photo_url,
         photos.location,
         photos.description,
         photos.created_at,
         users.first_name,
         users.profile_photo
       FROM photos
       JOIN users ON photos.user_id = users.id
       ORDER BY photos.created_at DESC`,
      );

      return rows;
    } catch (error) {
      console.error('❌ Database Error (getAllPhotos):', error);
      throw error;
    }
  }
}

import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateInterestRequestDto {
  @IsNotEmpty()
  @IsNumber()
  tripId: number;

  @IsNotEmpty()
  @IsNumber()
  ownerId: number;
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { InterestRequestsService } from './interest_requests.service';
import { CreateInterestRequestDto } from './dto/create-interest_request.dto';
import { verifyToken } from 'src/utils/jwt.utils';

@Controller('interest_requests')
export class InterestRequestsController {
  constructor(
    private readonly interestRequestsService: InterestRequestsService,
  ) {}

  @Post()
  create(
    @Req() req,
    @Body() createInterestRequestDto: CreateInterestRequestDto,
  ) {
    const userId = verifyToken(req);

    if (userId === createInterestRequestDto.ownerId) {
      throw new BadRequestException(
        'You cannot request interest on your own trip',
      );
    }

    return this.interestRequestsService.create(
      createInterestRequestDto,
      userId,
    );
  }

  @Get('status/:tripId')
  getStatus(@Param('tripId') tripId: string, @Req() req) {
    const userId = verifyToken(req);
    return this.interestRequestsService.getStatus(+tripId, userId);
  }

  @Patch(':id/accept')
  accept(@Param('id') id: string, @Req() req) {
    const userId = verifyToken(req);
    return this.interestRequestsService.acceptRequest(+id, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.interestRequestsService.remove(+id);
  }
}

import { Module } from '@nestjs/common';
import { InterestRequestsService } from './interest_requests.service';
import { InterestRequestsController } from './interest_requests.controller';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [InterestRequestsController],
  providers: [InterestRequestsService],
})
export class InterestRequestsModule {}

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInterestRequestDto } from './dto/create-interest_request.dto';

@Injectable()
export class InterestRequestsService {
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateInterestRequestDto, requesterId: number) {
    const { tripId, ownerId } = dto;

    if (ownerId === requesterId) {
      throw new BadRequestException('Cannot request your own trip');
    }

    // CHECK: if an interest request already exists for this trip + requester
    const [existingRows]: any = await this.db.query(
      `SELECT id, status FROM interest_requests WHERE trip_id = ? AND requester_id = ? LIMIT 1`,
      [tripId, requesterId],
    );

    if (existingRows && existingRows.length > 0) {
      // return the existing state instead of inserting a duplicate
      const existing = existingRows[0];
      return { status: existing.status, interestRequestId: existing.id };
    }

    const [result]: any = await this.db.query(
      `
      INSERT INTO interest_requests (trip_id, requester_id, owner_id, status)
      VALUES (?, ?, ?, 'pending')
      `,
      [tripId, requesterId, ownerId],
    );

    const interestRequestId = result.insertId;

    if (ownerId !== requesterId) {
      await this.notificationsService.create({
        receiverId: ownerId,
        senderId: requesterId,
        tripId,
        type: 'interest_request',
        message: 'Someone wants to join your trip',
        interestRequestId,
      });
    }

    return { status: 'pending', interestRequestId };
  }

  async getStatus(tripId: number, requesterId: number) {
    const [rows]: any = await this.db.query(
      `
      SELECT status FROM interest_requests
      WHERE trip_id = ? AND requester_id = ?
      LIMIT 1
      `,
      [tripId, requesterId],
    );

    if (rows.length === 0) return { status: null };
    return { status: rows[0].status };
  }

  async acceptRequest(id: number, ownerId: number) {
    if (!id || isNaN(id)) {
      throw new Error('Invalid interest request id');
    }

    await this.db.query(
      `UPDATE interest_requests SET status = 'accepted' WHERE id = ?`,
      [id],
    );

    const [[req]]: any = await this.db.query(
      `
      SELECT requester_id, trip_id 
      FROM interest_requests 
      WHERE id = ?
      `,
      [id],
    );

    if (req) {
      await this.db.query(
        `DELETE FROM notifications WHERE interest_request_id = ?`,
        [id],
      );

      if (req.requester_id !== ownerId) {
        await this.notificationsService.create({
          receiverId: req.requester_id,
          senderId: ownerId,
          tripId: req.trip_id,
          type: 'interest_accepted',
          message: 'Your request was accepted!',
          interestRequestId: id,
        });
      }
    }

    return { status: 'accepted' };
  }

  remove(id: number) {
    return `Removed interest request ${id}`;
  }
}

import { Controller, Get, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { verifyToken } from 'src/utils/jwt.utils';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req) {
    const userId = verifyToken(req);
    return this.notificationsService.findAll(userId);
  }
}

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { verifySocketToken } from 'src/utils/jwt.utils';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  // Map userId -> set of socketIds
  private clients = new Map<number, Set<string>>();

  afterInit() {
    this.logger.log('NotificationsGateway initialized');
  }

  handleConnection(client: Socket) {
    try {
      // Try to extract token from handshake headers first (if provided)
      let tokenUserId: number | null = null;
      try {
        tokenUserId = verifySocketToken(client);
      } catch (e) {
        tokenUserId = null;
      }

      this.logger.log(
        `Client connected: ${client.id} (handshakeUid=${tokenUserId}) handshakeHeaders=${JSON.stringify(
          client.handshake.headers || {},
        )}`,
      );

      if (tokenUserId) {
        this.addClientMapping(tokenUserId, client.id);
        this.logger.log(`Mapped user ${tokenUserId} -> socket ${client.id}`);
      }

      client.on('identify', (data) => {
        try {
          const uid = Number(data?.userId);
          if (!Number.isNaN(uid) && uid > 0) {
            this.addClientMapping(uid, client.id);
            this.logger.log(
              `Identify received: mapped user ${uid} -> socket ${client.id}`,
            );
            // Ack back so client knows mapping succeeded
            client.emit('identify_ack', { success: true, userId: uid });
          } else {
            this.logger.debug(
              `Identify received with invalid uid: ${JSON.stringify(data)}`,
            );
            client.emit('identify_ack', { success: false });
          }
        } catch (err) {
          this.logger.error('Error in identify handler', err as any);
          client.emit('identify_ack', { success: false });
        }
      });

      client.on('disconnecting', () => {
        this.removeSocketFromAllMappings(client.id);
        this.logger.log(
          `Client disconnecting: ${client.id} - removed mappings where present`,
        );
      });

      client.on('disconnect', (reason) => {
        this.removeSocketFromAllMappings(client.id);
        this.logger.log(`Client disconnected: ${client.id} reason=${reason}`);
      });
    } catch (err) {
      this.logger.warn(
        `Connection rejected for socket ${client.id}`,
        (err as any)?.message,
      );
      try {
        client.disconnect(true);
      } catch (e) {
        this.logger.error('Failed to force-disconnect client', e as any);
      }
    }
  }

  handleDisconnect(client: Socket) {
    this.removeSocketFromAllMappings(client.id);
    this.logger.log(
      `handleDisconnect cleaned mappings for socket ${client.id}`,
    );
  }

  private addClientMapping(userId: number, socketId: string) {
    const existing = this.clients.get(userId) || new Set<string>();
    existing.add(socketId);
    this.clients.set(userId, existing);
  }

  private removeSocketFromAllMappings(socketId: string) {
    for (const [userId, socketSet] of this.clients.entries()) {
      if (socketSet.has(socketId)) {
        socketSet.delete(socketId);
        if (socketSet.size === 0) {
          this.clients.delete(userId);
        } else {
          this.clients.set(userId, socketSet);
        }
        this.logger.log(
          `Removed mapping for user ${userId} (socket ${socketId})`,
        );
        break;
      }
    }
  }

  sendNotification(userId: number, payload: any) {
    const socketSet = this.clients.get(userId);
    if (socketSet && socketSet.size > 0) {
      for (const socketId of socketSet) {
        this.logger.log(
          `Emitting new_notification to user ${userId} on socket ${socketId}`,
        );
        this.server.to(socketId).emit('new_notification', payload);
      }
    } else {
      this.logger.log(`No connected sockets for user ${userId}, skipping emit`);
    }
  }

  sendDeletion(userId: number, interestRequestId: number) {
    const socketSet = this.clients.get(userId);
    if (socketSet && socketSet.size > 0) {
      for (const socketId of socketSet) {
        this.logger.log(
          `Emitting notification_deleted to user ${userId} (socket ${socketId}) interestRequestId=${interestRequestId}`,
        );
        this.server.to(socketId).emit('notification_deleted', {
          interestRequestId,
        });
      }
    } else {
      this.logger.log(
        `No connected sockets for user ${userId}, cannot emit deletion`,
      );
    }
  }
}

import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService],
})
export class NotificationsModule {}

import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import { NotificationsGateway } from './notifications.gateway';

interface CreateNotificationParams {
  receiverId: number;
  senderId: number;
  tripId: number;
  type: string;
  message: string;
  interestRequestId: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(params: CreateNotificationParams) {
    const { receiverId, senderId, tripId, type, message, interestRequestId } =
      params;

    const [res]: any = await this.db.query(
      `
        INSERT INTO notifications 
        (receiver_id, sender_id, trip_id, type, message, interest_request_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [receiverId, senderId, tripId, type, message, interestRequestId],
    );

    const insertedId = res.insertId;

    const [[notif]]: any = await this.db.query(
      `
        SELECT 
          notifications.*,
          users.first_name AS sender_name,
          users.profile_photo AS sender_photo
        FROM notifications
        JOIN users ON notifications.sender_id = users.id
        WHERE notifications.id = ?
      `,
      [insertedId],
    );

    if (notif) {
      if (notif.created_at instanceof Date) {
        notif.created_at = notif.created_at.toISOString();
      }

      // Send via gateway to all sockets for receiver
      try {
        this.gateway.sendNotification(receiverId, notif);
        this.logger.log(
          `Notification emitted to user ${receiverId} (id=${insertedId})`,
        );
      } catch (e) {
        this.logger.error('Failed to emit notification via gateway', e as any);
      }
    } else {
      this.logger.warn(
        `Inserted notification id ${insertedId} not found in DB SELECT`,
      );
    }

    return notif;
  }

  async findAll(receiverId: number) {
    const [rows]: any = await this.db.query(
      `
        SELECT 
          notifications.*,
          users.first_name AS sender_name,
          users.profile_photo AS sender_photo
        FROM notifications
        JOIN users ON notifications.sender_id = users.id
        WHERE notifications.receiver_id = ?
        ORDER BY notifications.created_at DESC
      `,
      [receiverId],
    );

    (rows || []).forEach((r) => {
      if (r.created_at instanceof Date)
        r.created_at = r.created_at.toISOString();
    });

    return rows;
  }
}

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React, { useContext } from "react";
import { Image, View, Text } from "react-native";
import HomeScreen from "../screens/HomeScreen";
import MessagesScreen from "../screens/MessagesScreen";
import PostScreen from "../screens/PostScreen";
import ProfilePassengerView from "../screens/ProfilePassengerView";
import NotificationsScreen from "../screens/NotificationScreen";
import { NotificationContext } from "../context/NotificationContext";

const Tab = createBottomTabNavigator();

const NotificationTabIcon = ({ focused }) => {
  const { unreadCount } = useContext(NotificationContext);

  return (
    <View>
      <Image
        source={require("../assets/notifications.png")}
        style={{
          width: 35,
          height: 35,
          tintColor: focused ? "white" : "#7282ab",
        }}
      />

      {unreadCount > 0 && (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -6,
            minWidth: 18,
            height: 18,
            borderRadius: 10,
            backgroundColor: "white",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 3,
          }}
        >
          <Text
            style={{
              color: "#061237",
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {unreadCount > 99 ? "99+" : String(unreadCount)}
          </Text>
        </View>
      )}
    </View>
  );
};

const BottomNavigator = () => {
  const { setUnreadCount } = useContext(NotificationContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 70,
          borderRadius: 30,
          backgroundColor: "rgba(5, 22, 80, 0.7)",
          borderWidth: 0.3,
          borderColor: "rgba(255,255,255,0.1)",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowOffset: { width: 0, height: 5 },
          shadowRadius: 8,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "white",
        tabBarInactiveTintColor: "#7282ab",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../assets/home.png")}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? "white" : "#7282ab",
              }}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../assets/messages.png")}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? "white" : "#7282ab",
              }}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Post"
        component={PostScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../assets/post.png")}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? "white" : "#7282ab",
              }}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        listeners={{
          tabPress: () => {
            setUnreadCount(0);
          },
        }}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <NotificationTabIcon focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfilePassengerView}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../assets/profile.png")}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? "white" : "#7282ab",
              }}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomNavigator;

import React from "react";
import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import styles from "../styles/PhotoCard_styles";

const PhotoCard = ({ userName, caption, photos = [] }) => {
  return (
    <TouchableOpacity activeOpacity={0.9}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profilePicture}>
            <Image
              source={require("../assets/profile-picture.jpeg")}
              resizeMode="cover"
              style={styles.profileImage}
            />
          </View>

          <View>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.subText}>Shared a photo</Text>
          </View>
        </View>

        {/* Photos */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoScroll}
          contentContainerStyle={{ paddingRight: 10 }}
          directionalLockEnabled={true}
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
        >
          {photos.map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo }}
              style={styles.photo}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {caption && <Text style={styles.caption}>{caption}</Text>}

        <View style={styles.footer}>
          <Text style={styles.footerText}>12 Oct 2025</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default PhotoCard;

// src/common/TravelCard.js
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import styles from "../styles/TravelCard_styles";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";
import { getSocket, onSocketReady } from "../socket";

const TravelCard = ({
  firstName,
  from,
  to,
  date,
  seatsAvailable,
  description,
  tripType,
  distance,
  creatorId,
  tripId,
  profilePhoto,
  initialStatus,
  embeddedMode,
  notifType,
  interestRequestId,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(initialStatus ?? null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const navigation = useNavigation();

  useEffect(() => {
    const loadUser = async () => {
      const storedId = await AsyncStorage.getItem("userId");
      if (storedId) setCurrentUserId(parseInt(storedId, 10));
    };
    loadUser();
  }, []);

  const isOwner = currentUserId === creatorId;

  useEffect(() => {
    if (initialStatus !== undefined) {
      setStatus(initialStatus);
    }
  }, [initialStatus]);

  useEffect(() => {
    if (initialStatus !== undefined) return;

    const loadStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const res = await fetch(
          `${BASE_URL}/interest_requests/status/${tripId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await res.json();
        if (data.status) setStatus(data.status);
        else setStatus(null);
      } catch (err) {
        console.log("Status fetch error:", err);
      }
    };

    loadStatus();
  }, [tripId]);

  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      const handler = (notif) => {
        try {
          if (
            notif?.type === "interest_accepted" &&
            notif?.trip_id === tripId
          ) {
            setStatus("accepted");
          }

          if (
            notif?.type === "interest_request_deleted" &&
            notif?.trip_id === tripId
          ) {
            setStatus(null);
          }
        } catch {}
      };

      socket.on("new_notification", handler);
      return () => socket.off("new_notification", handler);
    });
  }, [tripId]);

  const handleInterest = async () => {
    if (isRequesting) return;
    if (status === "pending" || status === "accepted") return;

    setIsRequesting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${BASE_URL}/interest_requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tripId: tripId, ownerId: creatorId }),
      });

      const data = await res.json();

      if (data && data.status) {
        setStatus(data.status);
      } else {
        setStatus("pending");
      }
    } catch (err) {
      console.log("Error:", err);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleAccept = async () => {
    const token = await AsyncStorage.getItem("token");
    try {
      await fetch(`${BASE_URL}/interest_requests/${interestRequestId}/accept`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      setStatus("accepted");
    } catch (err) {
      console.log("Accept error:", err);
    }
  };

  const handleDecline = async () => {
    const token = await AsyncStorage.getItem("token");
    try {
      await fetch(`${BASE_URL}/interest_requests/${interestRequestId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setStatus(null);
    } catch (err) {
      console.log("Decline error:", err);
    }
  };

  const originCity = from ? from.split(/[ ,]+/)[0] : "";
  const destinationCity = to ? to.split(/[ ,]+/)[0] : "";

  let formattedDate = "";
  if (date) {
    formattedDate = new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
    });
    formattedDate =
      formattedDate.charAt(0).toLowerCase() + formattedDate.slice(1);
  }

  const [avatarSource, setAvatarSource] = useState(
    require("../assets/profile-picture.jpeg")
  );

  useEffect(() => {
    const loadAvatar = async () => {
      if (profilePhoto) {
        setAvatarSource({ uri: profilePhoto });
        return;
      }

      const stored = await AsyncStorage.getItem("profilePhoto");
      if (stored) {
        setAvatarSource({ uri: stored });
        return;
      }
    };

    loadAvatar();
  }, [profilePhoto]);

  const buttonLabel =
    status === null
      ? "Interested"
      : status === "pending"
      ? "Pending"
      : "Send Message";

  const buttonDisabled = isOwner || status === "pending" || isRequesting;

  return (
    <TouchableOpacity activeOpacity={0.9}>
      <View style={styles.container}>
        <View>
          <View style={styles.rowCenter}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Profile", { userId: creatorId })
              }
              style={styles.profilePicture}
            >
              <Image
                source={avatarSource}
                resizeMode="cover"
                style={styles.profileImage}
              />
            </TouchableOpacity>

            <View style={styles.columnStart}>
              <Text style={styles.firstName}>{firstName}</Text>

              <View style={styles.seekingRideContainer}>
                <Text style={{ color: "white", fontWeight: "700" }}>
                  {tripType}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/logo.png")}
              resizeMode="contain"
              style={styles.logo}
            />
            {distance != null && (
              <Text style={styles.distanceText}>
                {distance < 1 ? "Nearby" : `${distance.toFixed(0)} km away`}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.destination}>
          <Text
            style={styles.destinationText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {originCity} → {destinationCity}
          </Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>

        <TouchableOpacity
          style={styles.description}
          onPress={() => setExpanded(!expanded)}
        >
          <Text
            style={styles.descriptionText}
            numberOfLines={expanded ? undefined : 3}
          >
            {description}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.seatsAvailable}>
            {seatsAvailable} Seats available
          </Text>

          {/* 🔥 OWNER VIEW: popup request actions (✓ / ✕ buttons) */}
          {embeddedMode &&
            notifType === "interest_request" &&
            isOwner &&
            status !== "accepted" && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 14,
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                {/* ACCEPT BUTTON */}
                <TouchableOpacity
                  onPress={handleAccept}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: "white",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#061237",
                      fontSize: 22,
                      fontWeight: "700",
                      marginTop: -2,
                    }}
                  >
                    ✓
                  </Text>
                </TouchableOpacity>

                {/* DECLINE BUTTON */}
                <TouchableOpacity
                  onPress={handleDecline}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: "white",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#061237",
                      fontSize: 22,
                      fontWeight: "700",
                      marginTop: -2,
                    }}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          {/* 🔥 NORMAL VIEW (feed card for non-owner) */}
          {!embeddedMode && !isOwner && (
            <TouchableOpacity
              style={[
                styles.button,
                buttonDisabled ? { opacity: 0.6 } : undefined,
              ]}
              onPress={() => {
                if (status === "accepted") {
                  navigation.navigate("ChatTest", { userId: creatorId });
                } else {
                  handleInterest();
                }
              }}
              disabled={buttonDisabled}
            >
              <Text style={styles.buttonText}>{buttonLabel}</Text>
            </TouchableOpacity>
          )}

          {/* 🔥 SHOW SEND MESSAGE WHEN CHAT IS POSSIBLE */}
          {embeddedMode &&
            // Requester receiving acceptance notification
            (notifType === "interest_accepted" ||
              // Owner accepted request
              (notifType === "interest_request" &&
                isOwner &&
                status === "accepted")) && (
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: "white", opacity: 1 },
                ]}
                onPress={() =>
                  navigation.navigate("ChatTest", { userId: creatorId })
                }
              >
                <Text style={styles.buttonText}>Send Message</Text>
              </TouchableOpacity>
            )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default TravelCard;

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

import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import TravelCard from "../common/TravelCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";

export default function TripViewScreen({ route }) {
  const tripId = route?.params?.tripId;

  // 🔥 FIX: Prevent NaN / undefined crash
  if (!tripId) {
    console.log(
      "❌ TripViewScreen opened WITHOUT tripId → preventing NaN fetch"
    );
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#061237",
        }}
      >
        <Text style={{ color: "white" }}>
          Trip unavailable. Missing tripId.
        </Text>
      </View>
    );
  }

  const [trip, setTrip] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await AsyncStorage.getItem("token");

        // LOAD TRIP
        const res = await fetch(`${BASE_URL}/post/${tripId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const tripData = await res.json();
        setTrip(tripData);

        // LOAD INTEREST STATUS
        const sRes = await fetch(
          `${BASE_URL}/interest_requests/status/${tripId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const sData = await sRes.json();
        setStatus(sData.status || null);
      } catch (err) {
        console.log("TripView error:", err);
      }
      setLoading(false);
    };

    load();
  }, [tripId]);

  if (loading || !trip) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#061237",
        }}
      >
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        backgroundColor: "#061237",
        flexGrow: 1,
      }}
    >
      <TravelCard {...trip} initialStatus={status} />
    </ScrollView>
  );
}

const BASE_URL = "https://comeatable-aerobically-lucile.ngrok-free.dev";

export default BASE_URL;

// src/context/NotificationContext.js
import React, { createContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket, onSocketReady, connectSocket } from "../socket";
import BASE_URL from "../config/api";

export const NotificationContext = createContext({
  unreadCount: 0,
  setUnreadCount: () => {},
});

let __global_listeners_attached = false;
let __initial_load_promise = null;

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 🔵 Fetch unread notifications from server
  const fetchInitialUnread = async () => {
    if (!__initial_load_promise) {
      __initial_load_promise = (async () => {
        try {
          const token = await AsyncStorage.getItem("token");
          if (!token) return 0;

          const res = await fetch(`${BASE_URL}/notifications`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          return Array.isArray(data) ? data.length : 0;
        } catch (e) {
          console.log("[NotificationProvider] initial fetch err", e);
          return 0;
        }
      })();
    }

    try {
      const value = await __initial_load_promise;
      if (mountedRef.current) setUnreadCount(value);
    } catch (e) {
      console.log("[NotificationProvider] initial fetch failed", e);
    }
  };

  useEffect(() => {
    connectSocket().catch(() => {});

    fetchInitialUnread();

    // 🔵 Attach socket listeners once
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      // 🚀 NEW: ALWAYS re-sync unread badge when socket connects
      socket.on("connect", () => {
        console.log(
          "[NotificationProvider] socket reconnected → refreshing unread"
        );
        fetchInitialUnread(); // <--- THE NEW FIX
      });

      if (__global_listeners_attached) return;

      const newNotificationHandler = (notif) => {
        try {
          setUnreadCount((prev) => {
            const next = prev + 1;
            console.log("[NotificationProvider] unread ->", prev, "=>", next);
            return next;
          });
        } catch (e) {
          console.log("[NotificationProvider] newNotification handler err", e);
        }
      };

      const deletionHandler = (payload) => {
        try {
          setUnreadCount((prev) => Math.max(prev - 1, 0));
          console.log("[NotificationProvider] notification_deleted", payload);
        } catch (e) {
          console.log("[NotificationProvider] deletion handler err", e);
        }
      };

      const clearedHandler = () => {
        try {
          setUnreadCount(0);
          console.log("[NotificationProvider] notifications_cleared");
        } catch (e) {
          console.log("[NotificationProvider] cleared handler err", e);
        }
      };

      socket.on("new_notification", newNotificationHandler);
      socket.on("notification_deleted", deletionHandler);
      socket.on("notifications_cleared", clearedHandler);

      try {
        socket.__notif_handlers = {
          newNotificationHandler,
          deletionHandler,
          clearedHandler,
        };
      } catch {}

      __global_listeners_attached = true;
      console.log("[NotificationProvider] listeners attached");
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};


import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import styles from "../styles/RegisterScreen_styles";
import Title from "../common/Title";
import SuccessMessageBox from "../common/SuccessMessageBox";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";

const RegisterScreen = ({ navigation }) => {
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const handleRegister = async () => {
    try {
      // 🔥 important: reset previous session automatically
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userId");

      const response = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name,
          last_name,
          email,
          password,
          confirmedPassword,
        }),
      });

      const data = await response.json();
      const messageText = Array.isArray(data.message)
        ? data.message[0]
        : data.message;

      if (response.ok && data.token) {
        // save token + userId
        await AsyncStorage.setItem("token", data.token);
        if (data.user?.id) {
          await AsyncStorage.setItem("userId", data.user.id.toString());
        }

        setMessageType("success");
        setMessage(messageText);
        setVisible(true);
        setTimeout(() => setVisible(false), 1500);

        setTimeout(() => {
          navigation.navigate("CompleteProfileScreen");
        }, 1000);
      } else {
        setMessageType("error");
        setMessage(messageText);
        setVisible(true);
        setTimeout(() => setVisible(false), 2000);
      }
    } catch (error) {
      console.error("❌ Registration error:", error);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        style={styles.container}
      >
        <View style={styles.container}>
          <Title style={styles.title} />

          <TextInput
            placeholder="First Name"
            placeholderTextColor="white"
            style={styles.TextInput}
            onChangeText={setFirstName}
          />
          <TextInput
            placeholder="Last Name"
            placeholderTextColor="white"
            style={styles.TextInput}
            onChangeText={setLastName}
          />
          <TextInput
            placeholder="Email"
            placeholderTextColor="white"
            style={styles.TextInput}
            onChangeText={setEmail}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="white"
            secureTextEntry
            style={styles.TextInput}
            onChangeText={setPassword}
          />
          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor="white"
            secureTextEntry
            style={styles.TextInput}
            onChangeText={setConfirmedPassword}
          />

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
          >
            <Text style={styles.registerButtonText}>Continue</Text>
          </TouchableOpacity>

          {visible && <SuccessMessageBox text={message} type={messageType} />}

          <View style={styles.loginRedirect}>
            <Text style={styles.haveAnAccountText}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.goBackToSignInText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

export default RegisterScreen;


import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles from "../styles/CompleteProfileScreen_styles";
import BASE_URL from "../config/api";

const CLOUD_NAME = "del5ajmby";
const UPLOAD_PRESET = "profile_preset";

const CompleteProfileScreen = ({ navigation }) => {
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState("");

  const pickImage = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === "cover" ? [4, 2] : [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      if (type === "cover") setCoverPhoto(result.assets[0].uri);
      else setProfilePhoto(result.assets[0].uri);
    }
  };

  const uploadToCloudinary = async (uri) => {
    const data = new FormData();
    data.append("file", {
      uri,
      type: "image/jpeg",
      name: "upload.jpg",
    });
    data.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: data }
    );

    const result = await res.json();
    return result.secure_url;
  };

  const handleContinue = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    try {
      let uploadedProfileUrl = null;
      let uploadedCoverUrl = null;

      if (profilePhoto) {
        uploadedProfileUrl = await uploadToCloudinary(profilePhoto);
        await AsyncStorage.setItem("profilePhoto", uploadedProfileUrl);
      }

      if (coverPhoto) {
        uploadedCoverUrl = await uploadToCloudinary(coverPhoto);
        await AsyncStorage.setItem("coverPhoto", uploadedCoverUrl);
      }

      await fetch(`${BASE_URL}/profile/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bio,
          city,
          interests,
          profile_photo: uploadedProfileUrl,
          cover_photo: uploadedCoverUrl,
        }),
      });

      navigation.navigate("BottomNavigator");
    } catch (err) {
      console.error("❌ Profile setup error:", err);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.coverContainer}
        onPress={() => pickImage("cover")}
      >
        {coverPhoto ? (
          <Image source={{ uri: coverPhoto }} style={styles.coverPhoto} />
        ) : (
          <Text style={styles.addText}>+ Add Cover</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.profileContainer}
        onPress={() => pickImage("profile")}
      >
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
        ) : (
          <Text style={styles.addText}>+</Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Bio"
        placeholderTextColor="#B0B0B0"
        value={bio}
        onChangeText={setBio}
      />

      <TextInput
        style={styles.input}
        placeholder="City"
        placeholderTextColor="#B0B0B0"
        value={city}
        onChangeText={setCity}
      />

      <TextInput
        style={styles.input}
        placeholder="Interests"
        placeholderTextColor="#B0B0B0"
        value={interests}
        onChangeText={setInterests}
      />

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CompleteProfileScreen;


import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Image,
  FlatList,
} from "react-native";
import React, { useState } from "react";
import styles from "../styles/PostScreen_styles";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SuccessMessageBox from "../common/SuccessMessageBox";
import { GOOGLE_API_KEY } from "@env";
import BASE_URL from "../config/api";
import * as ImagePicker from "expo-image-picker"; // ✅ ADDED

let fromTimeout;
let toTimeout;

const PostScreen = () => {
  const navigation = useNavigation();

  const [selectedMain, setSelectedMain] = useState("trip");
  const [tripType, setTripType] = useState("Offering");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [date, setDate] = useState("");
  const [seatsAvailable, setSeatsAvailable] = useState("");
  const [description, setDescription] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [location, setLocation] = useState("");
  // -----------------------------------------------------
  // NEW: Selected photo state
  // -----------------------------------------------------
  const [photo, setPhoto] = useState(null);

  // -----------------------------------------------------
  // NEW: Image picker function
  // -----------------------------------------------------

  const CLOUD_NAME = "del5ajmby";
  const UPLOAD_PRESET = "profile_preset";

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Image picker error:", error);
    }
  };

  const uploadToCloudinary = async (uri) => {
    const data = new FormData();
    data.append("file", {
      uri,
      type: "image/jpeg",
      name: "upload.jpg",
    });
    data.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: data }
    );

    const result = await res.json();
    return result.secure_url;
  };

  const handlePhotoPost = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;
    let uploadedPhotoUrl = null;
    if (photo) {
      uploadedPhotoUrl = await uploadToCloudinary(photo);
    }

    await fetch(`${BASE_URL}/post/photo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        photo_url: uploadedPhotoUrl,
        description,
        location,
      }),
    });
  };

  let timeouts = { from: null, to: null };

  const fetchSuggestions = async (query, type) => {
    if (!query || query.length < 2) {
      if (type === "from") setFromSuggestions([]);
      else setToSuggestions([]);
      return;
    }

    clearTimeout(timeouts[type]);
    timeouts[type] = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            query
          )}&key=${GOOGLE_API_KEY}&language=en&types=(cities)`
        );
        const data = await res.json();

        if (!data.predictions || data.predictions.length === 0) {
          if (type === "from") setFromSuggestions([]);
          else setToSuggestions([]);
          return;
        }

        const simplified = data.predictions.map((item) => ({
          id: item.place_id,
          name: item.description,
        }));

        if (type === "from") setFromSuggestions(simplified);
        else setToSuggestions(simplified);
      } catch (e) {
        console.error(`${type} fetch error:`, e);
      }
    }, 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Create Post</Text>
        <Image source={require("../assets/logo.png")} style={styles.logo} />
      </View>

      <View style={styles.mainTabContainer}>
        <TouchableOpacity
          style={[
            styles.mainTab,
            selectedMain === "trip" && styles.activeMainTab,
          ]}
          onPress={() => setSelectedMain("trip")}
        >
          <Text
            style={[
              styles.mainTabText,
              selectedMain === "trip" && styles.activeMainText,
            ]}
          >
            Trip
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainTab,
            selectedMain === "photo" && styles.activeMainTab,
          ]}
          onPress={() => setSelectedMain("photo")}
        >
          <Text
            style={[
              styles.mainTabText,
              selectedMain === "photo" && styles.activeMainText,
            ]}
          >
            Photo
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {selectedMain === "trip" && (
            <View style={styles.tripInfoWrapper}>
              <View style={styles.tripInfo}>
                {/* trip UI EXACT as before… */}
                <View style={styles.subTabInsideBox}>
                  <TouchableOpacity
                    style={[
                      styles.subTabSmall,
                      tripType === "Offering" && styles.activeSubTab,
                    ]}
                    onPress={() => setTripType("Offering")}
                  >
                    <Text
                      style={[
                        styles.subText,
                        tripType === "Offering" && styles.activeSubText,
                      ]}
                    >
                      Offering
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.subTabSmall,
                      tripType === "Searching" && styles.activeSubTab,
                    ]}
                    onPress={() => setTripType("Searching")}
                  >
                    <Text
                      style={[
                        styles.subText,
                        tripType === "Searching" && styles.activeSubText,
                      ]}
                    >
                      Searching
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ALL your trip input fields kept untouched */}
                {/* ... */}
                <View style={{ position: "relative", marginBottom: 10 }}>
                  <View style={styles.inputContainer}>
                    <Image
                      source={require("../assets/mapIcon.png")}
                      style={styles.icon}
                    />
                    <TextInput
                      placeholder="From"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.textInput}
                      value={from}
                      onChangeText={(text) => {
                        setFrom(text);
                        fetchSuggestions(text, "from");
                      }}
                      onFocus={() => setToSuggestions([])}
                    />
                  </View>

                  {fromSuggestions.length > 0 && (
                    <FlatList
                      data={fromSuggestions}
                      keyExtractor={(item) => item.id}
                      style={styles.dropdown}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => {
                            setFrom(item.name);
                            setFromSuggestions([]);
                          }}
                        >
                          <Text style={styles.dropdownText}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>

                {/* second input */}
                <View style={{ position: "relative", marginBottom: 10 }}>
                  <View style={styles.inputContainer}>
                    <Image
                      source={require("../assets/mapIcon.png")}
                      style={styles.icon}
                    />
                    <TextInput
                      placeholder="To"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.textInput}
                      value={to}
                      onChangeText={(text) => {
                        setTo(text);
                        fetchSuggestions(text, "to");
                      }}
                      onFocus={() => setFromSuggestions([])}
                    />
                  </View>

                  {toSuggestions.length > 0 && (
                    <FlatList
                      data={toSuggestions}
                      keyExtractor={(item) => item.id}
                      style={styles.dropdown}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => {
                            setTo(item.name);
                            setToSuggestions([]);
                          }}
                        >
                          <Text style={styles.dropdownText}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>

                {/* date/seats */}
                <View style={styles.dateAndSeatsContainer}>
                  <View style={styles.dateAndIcon}>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                      <Image
                        source={require("../assets/dateIcon.png")}
                        style={styles.icon}
                      />
                    </TouchableOpacity>
                    <TextInput
                      placeholder="Date (YYYY-MM-DD)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.smallInput}
                      value={date}
                      editable={false}
                    />
                  </View>

                  <TextInput
                    placeholder={
                      tripType === "Offering"
                        ? "Seats available"
                        : "Seats needed"
                    }
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.smallInput}
                    onChangeText={setSeatsAvailable}
                  />
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={date ? new Date(date) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        const formatted = selectedDate
                          .toISOString()
                          .split("T")[0];
                        setDate(formatted);
                      }
                    }}
                  />
                )}

                <TextInput
                  placeholder="Description"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  style={styles.descriptionTextInput}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={300}
                  onChangeText={setDescription}
                />
              </View>
            </View>
          )}

          {selectedMain === "photo" && (
            <View style={styles.photoContainer}>
              {/* -----------------------------------------------------
                  ONLY CHANGE: Add onPress + image preview
              ----------------------------------------------------- */}
              <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                {photo ? (
                  <Image
                    source={{ uri: photo }}
                    style={{ width: "100%", height: "100%", borderRadius: 15 }}
                  />
                ) : (
                  <>
                    <Image
                      source={require("../assets/uploadIcon.png")}
                      style={styles.uploadIcon}
                    />
                    <Text style={styles.uploadText}>Upload photo</Text>
                    <Text style={styles.uploadHint}>
                      Tap to select from gallery
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TextInput
                placeholder="Location"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.textInputPhoto}
                value={location}
                onChangeText={setLocation}
              />

              <TextInput
                placeholder="Description"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.descriptionPhotoInput}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </View>
          )}
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <TouchableOpacity
        style={styles.postButton}
        onPress={async () => {
          if (selectedMain === "photo") {
            handlePhotoPost();
            setMessageType("success");
            setMessage("Photo selected. Cloudinary next.");
            setVisible(true);
            setTimeout(() => setVisible(false), 2000);
            return;
          }

          try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;
            const response = await fetch(`${BASE_URL}/post`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                from,
                to,
                date,
                seatsAvailable,
                description,
                type: tripType,
              }),
            });
            const data = await response.json();
            const messageText = Array.isArray(data.message)
              ? data.message[0]
              : data.message;
            if (response.ok) {
              setMessageType("success");
              setMessage(messageText);
              setVisible(true);
              setTimeout(() => setVisible(false), 3000);
              setTimeout(() => navigation.replace("BottomNavigator"), 3000);
            } else {
              setMessageType("error");
              setMessage(messageText);
              setVisible(true);
              setTimeout(() => setVisible(false), 2000);
            }
          } catch (error) {
            console.error("❌ Fetch error:", error);
          }
        }}
      >
        <Text style={styles.buttonText}>Post</Text>
      </TouchableOpacity>

      {visible && <SuccessMessageBox text={message} type={messageType} />}
    </View>
  );
};

export default PostScreen;

// src/screens/NotificationScreen.js
import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket, onSocketReady } from "../socket";
import BASE_URL from "../config/api";
import { NotificationContext } from "../context/NotificationContext";
import TravelCard from "../common/TravelCard";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const { setUnreadCount } = useContext(NotificationContext);

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [popupLoading, setPopupLoading] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null); // store clicked notification

  const load = async () => {
    const token = await AsyncStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  };

  const openTripPopup = async (notif) => {
    if (!notif.trip_id) return;

    setSelectedNotif(notif);
    setPopupLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/post/${notif.trip_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tripData = await res.json();
      setSelectedTrip(tripData);
    } catch (err) {
      console.log("Popup load error:", err);
    }

    setPopupLoading(false);
  };

  const closePopup = () => {
    setSelectedTrip(null);
    setSelectedNotif(null);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      socket.on("new_notification", () => load());
      socket.on("notification_deleted", () => load());
    });

    return () => {
      const socket = getSocket();
      socket?.off("new_notification");
      socket?.off("notification_deleted");
    };
  }, []);

  if (!notifications || notifications.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: "#061237" }]}>
        <Text style={{ color: "white", fontSize: 18 }}>
          No notifications yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {notifications.map((n, i) => (
          <TouchableOpacity
            key={n.id || i}
            style={styles.bubble}
            onPress={() => openTripPopup(n)}
          >
            <View style={styles.headerRow}>
              <Image
                source={{
                  uri: n.sender_photo || "https://i.stack.imgur.com/l60Hf.png",
                }}
                style={styles.avatar}
              />
              <Text style={styles.name}>{n.sender_name}</Text>
            </View>

            <Text style={styles.message}>{n.message}</Text>

            {n.type !== "interest_accepted" && (
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={[styles.button, styles.acceptButton]}
                  onPress={async () => {
                    const token = await AsyncStorage.getItem("token");
                    try {
                      await fetch(
                        `${BASE_URL}/interest_requests/${n.interest_request_id}/accept`,
                        {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                        }
                      );
                      load();
                      setUnreadCount((prev) => Math.max(prev - 1, 0));
                    } catch {}
                  }}
                >
                  <Text style={styles.buttonText}>Yes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.rejectButton]}
                  onPress={() => {
                    setNotifications((prev) =>
                      prev.filter((x) => x.id !== n.id)
                    );
                    setUnreadCount((prev) => Math.max(prev - 1, 0));
                  }}
                >
                  <Text style={styles.buttonText}>No</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {(selectedTrip || popupLoading) && (
        <TouchableWithoutFeedback onPress={closePopup}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.popupContainer}>
                {popupLoading ? (
                  <ActivityIndicator size="large" color="white" />
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                  >
                    <TravelCard
                      {...selectedTrip}
                      embeddedMode={true}
                      notifType={selectedNotif?.type}
                      interestRequestId={selectedNotif?.interest_request_id}
                    />
                  </ScrollView>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#061237" },
  scrollContent: { paddingTop: 40, paddingHorizontal: 18, paddingBottom: 120 },
  bubble: {
    backgroundColor: "#020d2d",
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 50, height: 50, borderRadius: 28, marginRight: 12 },
  name: { color: "white", fontSize: 18, fontWeight: "600" },
  message: { color: "#d7d9e8", fontSize: 16, marginBottom: 16, lineHeight: 22 },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 12,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: "white",
  },
  acceptButton: { backgroundColor: "white" },
  rejectButton: { backgroundColor: "white" },
  buttonText: { color: "#061237", fontSize: 15, fontWeight: "700" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  popupContainer: {
    width: "90%",
    maxHeight: "85%",
    backgroundColor: "transparent",
  },
});


import React, { useState, useEffect } from "react";
import {
  View,
  RefreshControl,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import TravelCard from "../common/TravelCard";
import PhotoCard from "../common/PhotoCard";
import styles from "../styles/HomeScreen_styles";
import * as Location from "expo-location";
import BASE_URL from "../config/api";
import { getSocket, onSocketReady } from "../socket";

const HomeScreen = () => {
  const [trips, setTrips] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  // --------------------------
  // FETCH TRIPS
  // --------------------------
  const fetchTrips = async (lat, lng) => {
    if (!lat || !lng) return;

    try {
      const response = await fetch(
        `${BASE_URL}/post/nearby?lat=${lat}&lng=${lng}`
      );
      const data = await response.json();
      setTrips(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("❌ Fetch error (trips):", error);
      setTrips([]);
    }

    setRefreshing(false);
  };

  // --------------------------
  // FETCH PHOTOS (FIXED)
  // --------------------------
  const fetchPhotos = async () => {
    try {
      const response = await fetch(`${BASE_URL}/post/photos`);

      console.log("STATUS:", response.status);
      console.log("HEADERS:", response.headers.get("content-type"));

      const data = await response.json();

      console.log("PHOTOS RAW DATA:", data);
      console.log(
        "PHOTOS LENGTH:",
        Array.isArray(data) ? data.length : "NOT ARRAY"
      );

      setPhotos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("❌ Fetch error (photos):", error);
      setPhotos([]);
    }
  };

  // --------------------------
  // INITIAL LOAD
  // --------------------------
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const current_location = await Location.getCurrentPositionAsync({});
      const lat = current_location.coords.latitude;
      const lng = current_location.coords.longitude;

      setUserLat(lat);
      setUserLng(lng);

      await fetchTrips(lat, lng);
      await fetchPhotos();
    })();
  }, []);

  // --------------------------
  // SOCKET REFRESH
  // --------------------------
  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      const handler = () => {
        if (userLat && userLng) fetchTrips(userLat, userLng);
        fetchPhotos();
      };

      socket.on("new_notification", handler);

      return () => socket.off("new_notification", handler);
    });
  }, [userLat, userLng]);

  // --------------------------
  // SAFETY WRAPPERS
  // --------------------------
  const safeTrips = Array.isArray(trips) ? trips : [];
  const safePhotos = Array.isArray(photos) ? photos : [];

  // --------------------------
  // BUILD FEED
  // --------------------------
  const feed = [
    ...safeTrips.map((t) => ({ type: "trip", data: t })),
    ...safePhotos.map((p) => ({ type: "photo", data: p })),
  ].sort((a, b) => {
    const aDate =
      a.type === "trip"
        ? new Date(a.data.trip_date)
        : new Date(a.data.created_at);

    const bDate =
      b.type === "trip"
        ? new Date(b.data.trip_date)
        : new Date(b.data.created_at);

    return bDate - aDate;
  });

  // --------------------------
  // SEARCH FILTER
  // --------------------------
  const filteredFeed = search.trim()
    ? feed.filter(
        (item) =>
          item.type === "trip" &&
          `${item.data.origin} ${item.data.destination}`
            .toLowerCase()
            .includes(search.toLowerCase())
      )
    : feed;

  // --------------------------
  // RENDER
  // --------------------------
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <FlashList
          data={filteredFeed}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                if (userLat && userLng) fetchTrips(userLat, userLng);
                fetchPhotos();
              }}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search trips..."
                placeholderTextColor="#9bb0d4"
                style={styles.searchBar}
              />
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === "trip") {
              const t = item.data;
              return (
                <TravelCard
                  from={t.origin}
                  to={t.destination}
                  date={t.trip_date}
                  seatsAvailable={t.available_seats}
                  description={t.description}
                  tripType={t.type}
                  firstName={t.first_name}
                  distance={t.distance}
                  creatorId={t.creator_id}
                  tripId={t.id}
                  profilePhoto={t.profile_photo}
                />
              );
            }

            if (item.type === "photo") {
              const p = item.data;
              return (
                <PhotoCard
                  userName={p.first_name}
                  caption={p.description}
                  photos={[p.photo_url]}
                  profilePhoto={p.profile_photo}
                />
              );
            }

            return null;
          }}
          estimatedItemSize={400}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

export default HomeScreen;

// App.js
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LandingScreen from "./src/screens/LandingScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import LoginScreen from "./src/screens/LoginScreen";
import CompleteProfileScreen from "./src/screens/CompleteProfileScreen";
import HomeScreen from "./src/screens/HomeScreen";
import BottomNavigator from "./src/common/BottomNavigator";
import ChatTestScreen from "./src/screens/ChatTestScreen";
import ProfilePassengerView from "./src/screens/ProfilePassengerView";

import { connectSocket } from "./src/socket";
import { NotificationProvider } from "./src/context/NotificationContext";

const Stack = createNativeStackNavigator();

export default function App() {
  // 🔥 Connect socket ONE TIME here.
  useEffect(() => {
    connectSocket();
  }, []);

  return (
    <SafeAreaProvider style={styles.container}>
      <NotificationProvider>
        <NavigationContainer>
          <StatusBar style="light" />

          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ChatTest" component={ChatTestScreen} />
            <Stack.Screen
              name="CompleteProfileScreen"
              component={CompleteProfileScreen}
            />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Profile" component={ProfilePassengerView} />

            <Stack.Screen
              name="BottomNavigator"
              options={{ headerShown: false }}
            >
              {() => (
                <SafeAreaView
                  style={{ flex: 1, backgroundColor: "#061237" }}
                  edges={[]}
                >
                  <BottomNavigator />
                </SafeAreaView>
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </NotificationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#061237",
  },
});





