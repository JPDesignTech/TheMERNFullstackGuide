const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs"); // Encryption Package
const jwt = require("jsonwebtoken"); // Hash Token Generator
const User = require("../models/user");

// GET REQUEST ../api/users/
const getAllUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError(
      "Something Went Wrong. Could not find users",
      500
    );
    return next(error);
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) }); // => { users } => { users: users }
};

// POST REQUEST ../api/users/signup
const createUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("invalid inputs passed, place check your data", 422)
    );
  }

  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, Please try again later.",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      "User exists already, please login instead.",
      422
    );
    return next(error);
  }

  // Generate a Hash password
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12); // Promise
  } catch (err) {
    const error = new HttpError("Could not create user. Password Error", 500);
    return next(error);
  }

  // Create User Object
  const createdUser = new User({
    name,
    email,
    password: hashedPassword,
    image: req.file.path,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Creating User Failed. Please Try Again", 500);
    return next(error);
  }

  // Generate a Hash Token
  let hashToken;
  try {
    hashToken = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: "12h" }
    );
  } catch (err) {
    const error = new HttpError(
      "Creating User Failed. Unable to generate hash token",
      500
    );
    return next(error);
  }

  res.status(201).json({
    userId: createdUser.id,
    email: createdUser.email,
    token: hashToken,
  });
};

// POST REQUEST ../api/users/login
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Logging up failed, Please try again later.",
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError("Invalid Username or Password.", 401);
    return next(error);
  }

  // Check the hashed password
  let isValidHash = false;
  try {
    isValidHash = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "Could not log you in. Please check your credentials and try again.",
      500
    );
    return next(error);
  }

  if (!isValidHash) {
    const error = new HttpError("Could not log you in. Invalid Password", 401);
    return next(error);
  }

  // Generate a Hash Token
  let hashToken;
  try {
    hashToken = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: "12h" }
    );
  } catch (err) {
    const error = new HttpError(
      "Failed to login. Unable to verify hash token",
      500
    );
    return next(error);
  }

  res.json({
    user: existingUser.id,
    email: existingUser.email,
    token: hashToken,
  });
};

exports.getAllUsers = getAllUsers;
exports.createUser = createUser;
exports.loginUser = loginUser;
