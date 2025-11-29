require('dotenv').config();

export async function getCoordinates(city) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    city,
  )}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status === 'OK') {
    const location = data.results[0].geometry.location;
    console.log(location);
    return location;
  } else {
    console.error('Error:', data.status);
    return null;
  }
}
