// Goole Cloud Platform Maps API

const axois = require("axios");
const HttpError = require("../models/http-error");
const API_KEY = process.env.GOOGLE_API_KEY;
async function getCoordsForAddress(address) {
  const response = await axois.get(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${API_KEY}`
  );

  const data = response.data;

  // Handles if an Address can not be found
  if (!data || data.status === "ZERO_RESULTS") {
    const error = new HttpError(
      "Cloud not find a location for the specified place!",
      422
    );
    throw error;
  }

  const coords = data.results[0].geometry.location;

  return coords;
}

module.exports = getCoordsForAddress;
