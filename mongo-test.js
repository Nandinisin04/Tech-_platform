import mongoose from "mongoose";

const uri = "mongodb://manasvimittal:Techintel123@ac-jvblbob-shard-00-00.hku3aqr.mongodb.net:27017,ac-jvblbob-shard-00-01.hku3aqr.mongodb.net:27017,ac-jvblbob-shard-00-02.hku3aqr.mongodb.net:27017/techintel?ssl=true&authSource=admin&retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(() => {
    console.log("✅ Mongo Connected");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Connection Error:", err);
    process.exit(1);
  });
