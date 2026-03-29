  import mongoose from "mongoose";
  import dotenv from "dotenv";

  dotenv.config();

  const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in .env");
  }

  let cached = global.mongoose;

  if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
  }

  export async function connectDB() {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
      cached.promise = mongoose.connect(MONGODB_URI);
    }

    cached.conn = await cached.promise;
    return cached.conn;
  }