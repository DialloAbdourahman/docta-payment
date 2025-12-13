import "reflect-metadata";
import app from "./app";
import { config } from "./config";
import mongoose from "mongoose";
import {
  Exchanges,
  LoggedInUserTokenData,
  Queues,
  RoutingKey,
} from "docta-package";
import { listenToQueue } from "./listener";

declare global {
  namespace Express {
    interface Request {
      currentUser?: LoggedInUserTokenData;
    }
  }
}

const start = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("MongoDB connected");
    console.log("Registered models:", mongoose.modelNames());

    await listenToQueue({
      exchange: Exchanges.DOCTA_EXCHANGE,
      queue: Queues.PAYMENT_QUEUE,
      routingKeys: [RoutingKey.INITIATE_REFUND],
    });

    app.listen(config.port, () => {
      console.log(`Doctor payment running on port ${config.port}`);
    });

    process.on("SIGINT", async () => {
      console.log("Gracefully shutting down...");
      await mongoose.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

start();
