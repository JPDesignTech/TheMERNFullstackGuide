const HttpError = require("../models/http-error");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const fs = require("fs");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const mongooseUniqueValidator = require("mongoose-unique-validator");

// GET REQUEST ../api/places/:pid
const getPlacesById = async (req, res, next) => {
  const placeId = req.params.pid; // { pid: 'p1' }
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something Went Wrong. Could not find a place",
      500
    );
    return next(error);
  }

  if (!place) {
    // Sync Error Handling use Throw
    const error = new HttpError(
      "Could not find a place for the provide id.",
      404
    );
    return next(error);
  }
  res.json({ place: place.toObject({ getters: true }) }); // => { place } => { place: place }
};

// GET REQUEST ../api/places/user/:uid
const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid; // { uid: 'u1' }
  let userWithPlaces;

  try {
    userWithPlaces = await User.findById(userId).populate("places");
  } catch (err) {
    const error = new HttpError(
      "Something Went Wrong. Could not find a user",
      500
    );
    return next(error);
  }

  if (!userWithPlaces || userWithPlaces.length === 0) {
    // Sync Error Handling use Throw
    const error = new HttpError(
      "Could not find a user for the provide id.",
      404
    );
    return next(error);
  }
  res.json({
    place: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  }); // => { place } => { place: place }
};

// POST REQUEST ../api/places/
const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("invalid inputs passed, place check your data", 422)
    );
  }

  const { title, description, address } = req.body; // Object Destructuring

  // Convert address to coordinates
  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError("Creating Place Failed. Please Try Again", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id", 404);
    return next(error);
  }

  // Transaction & Sessions
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await createdPlace.save({ session: session });
    user.places.push(createdPlace);
    await user.save({ session: session });
    await session.commitTransaction();
  } catch (err) {
    const error = new HttpError("Creating Place Failed. Please Try Again", 500);
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

// PATCH REQUEST ../api/places/:pid
const editPlace = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("invalid inputs passed, place check your data", 422)
    );
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place",
      500
    );
    return next(error);
  }
  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError("You are not allowed to edit this place", 401);
  }
  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch {
    const error = new HttpError("Could not save place.", 500);
  }
  res.status(200).json({ place: place.toObject({ getters: true }) });
};

// DELETE REQUEST ../api/places/:pid
const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find place",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find a place for this id.", 404);
    return next(error);
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError("You are not allowed to edit this place", 401);
  }

  const imagePath = place.image; // Image Path

  // Transaction & Sessions
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await place.remove({ session: session });
    place.creator.places.pull(place); // Removes Place ID
    await place.creator.save({ session: session });
    await session.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong could not delete place.",
      500
    );
    return next(error);
  }
  fs.unlink(imagePath, (err) => {
    console.log(err);
  });
  res.status(200).json({ message: "Place Deleted" });
};

exports.createPlace = createPlace;
exports.getPlacesById = getPlacesById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.deletePlace = deletePlace;
exports.editPlace = editPlace;
