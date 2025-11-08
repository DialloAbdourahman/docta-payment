import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  accessTokenSecret: string;
  rabbitmqHost: string;
  tranzakApiUrl: string;
  tranzakApiKey: string;
  tranzakApiSecret: string;
  frontEndUrl: string;
}

export const config: Config = {
  port: Number(process.env.PORT),
  nodeEnv: String(process.env.NODE_ENV),
  mongoUri: String(process.env.MONGO_URI),
  accessTokenSecret: String(process.env.ACCESS_TOKEN_SECRET),
  rabbitmqHost: String(process.env.RABBITMQ_HOST),
  tranzakApiUrl: String(process.env.TRANZAK_API_URL),
  tranzakApiKey: String(process.env.TRANZAK_API_KEY),
  tranzakApiSecret: String(process.env.TRANZAK_API_SECRET),
  frontEndUrl: String(process.env.FRONT_END_URL),
};
