const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user.model");
const logger = require("./logger");

// Serialize user để lưu vào session (nếu dùng session)
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user từ session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Tìm user đã tồn tại với Google ID
        let user = await User.findOne({
          $or: [
            { providerId: profile.id, provider: "google" },
            { email: profile.emails[0].value },
          ],
        });

        if (user) {
          // Nếu user đã tồn tại nhưng chưa có providerId, cập nhật
          if (!user.providerId || user.provider !== "google") {
            user.provider = "google";
            user.providerId = profile.id;
            if (profile.photos && profile.photos[0]) {
              user.avatarUrl = profile.photos[0].value;
            }
            await user.save();
          }
          return done(null, user);
        }

        // Tạo user mới nếu chưa tồn tại
        user = await User.create({
          fullName:
            profile.displayName ||
            profile.name?.givenName + " " + profile.name?.familyName,
          email: profile.emails[0].value,
          provider: "google",
          providerId: profile.id,
          avatarUrl:
            profile.photos && profile.photos[0]
              ? profile.photos[0].value
              : undefined,
          passwordHash: "", // Không cần password cho OAuth
          status: "active",
        });

        logger.info(`New user registered via Google OAuth: ${user.email}`, {
          userId: user._id,
          email: user.email,
          provider: "google",
          category: "user_registration",
          action: "oauth_registration",
        });

        return done(null, user);
      } catch (error) {
        logger.error("Google OAuth error:", {
          error: error.message,
          stack: error.stack,
          profileId: profile.id,
          category: "oauth_error",
        });
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
