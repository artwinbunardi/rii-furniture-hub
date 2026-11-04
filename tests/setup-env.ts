import { loadEnv } from "../scripts/env";
loadEnv();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.UPLOAD_DIR = "./storage/test-uploads";
